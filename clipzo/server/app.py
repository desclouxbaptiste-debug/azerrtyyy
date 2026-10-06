"""HTTP API + static site. Run with `python -m server` from the clipzo/ folder."""

from __future__ import annotations

import json
import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.datastructures import UploadFile

from . import config, jobs, reframe, sources, transcribe

logging.basicConfig(level=os.environ.get("CLIPZO_LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("clipzo")

store = jobs.JobStore()


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.start()
    log.info("Clipzo ready — data in %s, %d worker(s), Claude: %s, Whisper: %s",
             config.DATA_DIR, config.WORKERS, "on" if config.llm_configured() else "off",
             config.WHISPER_MODEL if transcribe.available() else "off")
    yield
    store.stop()


app = FastAPI(title="Clipzo", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
if config.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"])


class Options(BaseModel):
    reframe: bool = True
    subs: bool = False
    nowm: bool = False
    hooks: bool = False
    animsubs: bool = False


class JobIn(BaseModel):
    url: str = Field(min_length=4, max_length=2048)
    duration: int = Field(ge=config.MIN_CLIP_SECONDS, le=config.MAX_CLIP_SECONDS)
    count: int = Field(ge=1, le=12)
    plan: Literal["free", "creator", "pro"] = "free"
    options: Options = Options()


def _client_id(request: Request) -> str:
    if os.environ.get("CLIPZO_TRUST_PROXY") == "1":
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_plan(plan_key: str, count: int) -> config.Plan:
    plan = config.PLANS[config.FORCE_PLAN or plan_key]
    if count > plan.max_clips:
        raise HTTPException(400, f"Ton forfait {plan.label} permet jusqu'à {plan.max_clips} shorts par vidéo.")
    return plan


def _create(request: Request, req: jobs.JobRequest) -> jobs.Job:
    try:
        return store.create(_client_id(request), req)
    except jobs.QueueFull as exc:
        raise HTTPException(429, str(exc)) from exc


# ------------------------------------------------------------------------------ API

@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "version": "1.0",
        "features": {
            "download": True,
            "transcription": transcribe.available(),
            "llm": config.llm_configured(),
            "face_tracking": reframe.available(),
        },
        "limits": {"max_upload_mb": config.MAX_UPLOAD_MB},
        "plans": {k: p.public() for k, p in config.PLANS.items()},
    }


@app.post("/api/jobs", status_code=202)
def create_job(body: JobIn, request: Request) -> dict:
    try:
        sources.detect_platform(body.url)
    except sources.SourceError as exc:
        raise HTTPException(400, str(exc)) from exc
    plan = _check_plan(body.plan, body.count)
    job = _create(request, jobs.JobRequest(
        url=body.url.strip(), filename=None, duration=body.duration, count=body.count,
        plan=plan.key, options=body.options.model_dump(),
    ))
    store.enqueue(job)
    return {"id": job.id, "status": job.status}


@app.post("/api/jobs/upload", status_code=202)
async def create_upload_job(request: Request) -> dict:
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > limit + 1024 * 1024:
        raise HTTPException(413, f"Fichier trop lourd (maximum {config.MAX_UPLOAD_MB} Mo).")
    try:
        form = await request.form(max_files=1, max_fields=10)
    except Exception as exc:  # noqa: BLE001 - malformed multipart bodies
        raise HTTPException(400, "Envoi du fichier invalide.") from exc
    upload = form.get("file")
    if not isinstance(upload, UploadFile):
        raise HTTPException(400, "Aucun fichier vidéo reçu.")
    try:
        options = Options(**json.loads(str(form.get("options") or "{}")))
        body = JobIn(
            url="upload://local", duration=int(str(form.get("duration") or 90)),
            count=int(str(form.get("count") or 3)), plan=str(form.get("plan") or "free"), options=options,
        )
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, "Paramètres invalides : durée entre 60 et 180 s, 1 à 12 shorts.") from exc
    plan = _check_plan(body.plan, body.count)
    filename = os.path.basename(upload.filename or "video.mp4")[:200]
    job = _create(request, jobs.JobRequest(
        url=None, filename=filename, duration=body.duration, count=body.count,
        plan=plan.key, options=body.options.model_dump(),
    ))
    try:
        source = await run_in_threadpool(sources.save_upload, upload.file, filename, jobs.job_dir(job.id), plan)
    except sources.SourceError as exc:
        store.discard(job)
        raise HTTPException(400, str(exc)) from exc
    finally:
        await upload.close()
    job.upload_path = str(source.path)
    job.source = {"title": source.title, "platform": "upload", "platform_name": "Fichier",
                  "duration": round(source.probe.duration, 2), "thumbnail": None,
                  "width": source.probe.width, "height": source.probe.height}
    job.save(force=True)
    store.enqueue(job)
    return {"id": job.id, "status": job.status}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    if not re.fullmatch(jobs.JOB_ID_RE, job_id):
        raise HTTPException(404, "Analyse introuvable.")
    job = store.get(job_id)
    if job is None:
        raise HTTPException(404, "Analyse introuvable ou expirée : relance-la.")
    return job.public(store.queue_position(job_id))


@app.get("/api/jobs/{job_id}/clips/{name}")
def get_clip_file(job_id: str, name: str):
    if not re.fullmatch(jobs.JOB_ID_RE, job_id) or not re.fullmatch(r"\d{1,2}\.(mp4|jpg)", name):
        raise HTTPException(404, "Fichier introuvable.")
    if store.get(job_id) is None:
        raise HTTPException(404, "Fichier introuvable.")
    path = jobs.job_dir(job_id) / "clips" / name
    if not path.is_file():
        raise HTTPException(404, "Fichier introuvable.")
    media_type = "video/mp4" if name.endswith(".mp4") else "image/jpeg"
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "private, max-age=3600"})


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


# --------------------------------------------------------------------------- website
# Only the public files are served: never the server code or the data folder.

def _site_file(name: str, media_type: str) -> FileResponse:
    return FileResponse(config.ROOT / name, media_type=media_type, headers={"Cache-Control": "no-cache"})


@app.get("/", include_in_schema=False)
def index():
    return _site_file("index.html", "text/html; charset=utf-8")


@app.get("/styles.css", include_in_schema=False)
def styles():
    return _site_file("styles.css", "text/css; charset=utf-8")


@app.get("/main.js", include_in_schema=False)
def script():
    return _site_file("main.js", "text/javascript; charset=utf-8")


app.mount("/assets", StaticFiles(directory=config.ROOT / "assets"), name="assets")
app.mount("/fonts", StaticFiles(directory=config.ROOT / "fonts"), name="fonts")
