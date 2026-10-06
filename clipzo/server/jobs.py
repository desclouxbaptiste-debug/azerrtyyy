"""Job store: queue, progress tracking, persistence to disk and cleanup."""

from __future__ import annotations

import json
import logging
import os
import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from pathlib import Path

from . import config

log = logging.getLogger("clipzo.jobs")

STEPS = ["download", "audio", "transcribe", "scenes", "score", "render"]
STEP_WEIGHTS = {"download": 0.18, "audio": 0.05, "transcribe": 0.35, "scenes": 0.12, "score": 0.08, "render": 0.22}
JOB_ID_RE = r"^[0-9a-f]{32}$"


@dataclass
class JobRequest:
    url: str | None
    filename: str | None
    duration: int
    count: int
    plan: str
    options: dict[str, bool]


@dataclass
class Job:
    id: str
    client: str
    request: JobRequest
    created_at: float = field(default_factory=time.time)
    status: str = "queued"
    step: str = "queued"
    step_index: int = 0
    step_progress: float = 0.0
    message: str = "En file d'attente…"
    error: str | None = None
    source: dict | None = None
    signals: dict = field(default_factory=lambda: {
        "heatmap": False, "chat": False, "transcript": False, "llm": False, "faces": False})
    curve: list[float] | None = None
    clips: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    upload_path: str | None = None  # set when the source was uploaded
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)
    _last_save: float = 0.0

    # -- progress -------------------------------------------------------------
    @property
    def progress(self) -> float:
        if self.status == "done":
            return 1.0
        if self.step not in STEPS:
            return 0.0
        idx = STEPS.index(self.step)
        done = sum(STEP_WEIGHTS[s] for s in STEPS[:idx])
        return round(min(0.99, done + STEP_WEIGHTS[self.step] * self.step_progress), 4)

    def set_step(self, step: str, message: str) -> None:
        with self._lock:
            self.status = "running"
            self.step = step
            self.step_index = STEPS.index(step)
            self.step_progress = 0.0
            self.message = message
        self.save(force=True)

    def update(self, fraction: float | None = None, message: str | None = None) -> None:
        with self._lock:
            if fraction is not None:
                self.step_progress = max(0.0, min(1.0, fraction))
            if message is not None:
                self.message = message
        self.save()

    def warn(self, message: str) -> None:
        with self._lock:
            if message not in self.warnings:
                self.warnings.append(message)
        self.save(force=True)

    def add_clip(self, clip: dict) -> None:
        with self._lock:
            self.clips.append(clip)
        self.save(force=True)

    def finish(self) -> None:
        with self._lock:
            self.status = "done"
            self.step = "done"
            self.step_index = len(STEPS) - 1
            self.step_progress = 1.0
            self.message = f"{len(self.clips)} short{'s' if len(self.clips) > 1 else ''} prêt{'s' if len(self.clips) > 1 else ''} !"
        self.save(force=True)

    def fail(self, message: str) -> None:
        with self._lock:
            self.status = "error"
            self.error = message
            self.message = message
        self.save(force=True)

    # -- serialisation --------------------------------------------------------
    def public(self, queue_position: int | None = None) -> dict:
        with self._lock:
            message = self.message
            if self.status == "queued" and queue_position:
                message = (f"En file d'attente : {queue_position} vidéo{'s' if queue_position > 1 else ''} "
                           "avant la tienne…")
            return {
                "id": self.id,
                "status": self.status,
                "step": self.step,
                "step_index": self.step_index,
                "progress": self.progress,
                "message": message,
                "error": self.error,
                "source": dict(self.source) if self.source else None,
                "signals": dict(self.signals),
                "curve": list(self.curve) if self.curve else None,
                "clips": [dict(c) for c in self.clips],
                "warnings": list(self.warnings),
            }

    def save(self, force: bool = False) -> None:
        now = time.time()
        if not force and now - self._last_save < 2.0:
            return
        self._last_save = now
        with self._lock:
            data = {
                "id": self.id, "client": self.client, "request": asdict(self.request),
                "created_at": self.created_at, "status": self.status, "step": self.step,
                "step_index": self.step_index, "step_progress": self.step_progress,
                "message": self.message, "error": self.error, "source": self.source,
                "signals": self.signals, "curve": self.curve, "clips": self.clips, "warnings": self.warnings,
            }
        path = job_dir(self.id) / "job.json"
        tmp = path.with_suffix(".json.tmp")
        try:
            tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, path)
        except OSError as exc:
            log.warning("Could not save job %s: %s", self.id, exc)

    @classmethod
    def load(cls, path: Path) -> "Job | None":
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            job = cls(id=data["id"], client=data.get("client", ""), request=JobRequest(**data["request"]))
        except (OSError, json.JSONDecodeError, KeyError, TypeError):
            return None
        for key in ("created_at", "status", "step", "step_index", "step_progress", "message", "error",
                    "source", "signals", "curve", "clips", "warnings"):
            if key in data:
                setattr(job, key, data[key])
        return job


def job_dir(job_id: str) -> Path:
    return config.JOBS_DIR / job_id


class QueueFull(RuntimeError):
    pass


class JobStore:
    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self.order: list[str] = []  # queued job ids, oldest first
        self.lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=config.WORKERS, thread_name_prefix="clipzo-job")
        self._stop = threading.Event()
        self._cleaner: threading.Thread | None = None

    # -- lifecycle --------------------------------------------------------------
    def start(self) -> None:
        config.JOBS_DIR.mkdir(parents=True, exist_ok=True)
        self._restore()
        self._cleanup()
        self._cleaner = threading.Thread(target=self._cleanup_loop, daemon=True, name="clipzo-cleanup")
        self._cleaner.start()

    def stop(self) -> None:
        self._stop.set()
        self.executor.shutdown(wait=False, cancel_futures=True)

    def _restore(self) -> None:
        for path in config.JOBS_DIR.glob("*/job.json"):
            job = Job.load(path)
            if job is None:
                continue
            if job.status in ("queued", "running"):
                job.status = "error"
                job.error = job.message = "Le serveur a redémarré pendant le traitement. Relance l'analyse."
                job.save(force=True)
            self.jobs[job.id] = job

    def _cleanup_loop(self) -> None:
        while not self._stop.wait(15 * 60):
            self._cleanup()

    def _cleanup(self) -> None:
        cutoff = time.time() - config.JOB_TTL_HOURS * 3600
        with self.lock:
            expired = [j for j in self.jobs.values() if j.created_at < cutoff and j.status in ("done", "error")]
            for j in expired:
                self.jobs.pop(j.id, None)
        for j in expired:
            shutil.rmtree(job_dir(j.id), ignore_errors=True)
        known = set(self.jobs)
        for d in config.JOBS_DIR.glob("*"):  # orphans (e.g. failed uploads)
            try:
                if d.is_dir() and d.name not in known and d.stat().st_mtime < cutoff:
                    shutil.rmtree(d, ignore_errors=True)
            except OSError:
                pass

    # -- submission ---------------------------------------------------------------
    def create(self, client: str, request: JobRequest) -> Job:
        with self.lock:
            pending = [j for j in self.jobs.values() if j.status in ("queued", "running")]
            if len(pending) >= config.MAX_QUEUED_JOBS:
                raise QueueFull("Le serveur est très demandé : réessaie dans quelques minutes.")
            mine = [j for j in pending if j.client == client]
            if len(mine) >= config.MAX_ACTIVE_JOBS_PER_CLIENT:
                raise QueueFull("Tu as déjà des vidéos en cours d'analyse : attends qu'elles soient finies.")
            job = Job(id=uuid.uuid4().hex, client=client, request=request)
            job_dir(job.id).mkdir(parents=True, exist_ok=True)
            self.jobs[job.id] = job
        job.save(force=True)
        return job

    def enqueue(self, job: Job) -> None:
        from .pipeline import run  # late import: pipeline imports heavy modules

        with self.lock:
            self.order.append(job.id)

        def task() -> None:
            with self.lock:
                if job.id in self.order:
                    self.order.remove(job.id)
            run(job)

        self.executor.submit(task)

    def discard(self, job: Job) -> None:
        with self.lock:
            self.jobs.pop(job.id, None)
        shutil.rmtree(job_dir(job.id), ignore_errors=True)

    def get(self, job_id: str) -> Job | None:
        with self.lock:
            return self.jobs.get(job_id)

    def queue_position(self, job_id: str) -> int | None:
        with self.lock:
            if job_id not in self.order:
                return None
            ahead = self.order.index(job_id)
            running = sum(1 for j in self.jobs.values() if j.status == "running")
            return ahead + running
