"""ffmpeg / ffprobe helpers: probing, audio extraction, loudness and scene-change timelines."""

from __future__ import annotations

import json
import logging
import math
import re
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

log = logging.getLogger("clipzo.media")

AUDIO_RATE = 16000  # mono 16 kHz: what Whisper expects, plenty for loudness analysis

ProgressFn = Callable[[float], None]


class MediaError(RuntimeError):
    """A video could not be read or processed. The message is shown to the user."""


@dataclass
class ProbeInfo:
    duration: float
    width: int
    height: int
    fps: float
    has_audio: bool

    @property
    def is_vertical(self) -> bool:
        return self.height >= self.width * 1.5


def probe(path: Path) -> ProbeInfo:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            capture_output=True, text=True, timeout=120, check=True,
        ).stdout
        data = json.loads(out)
    except (subprocess.SubprocessError, json.JSONDecodeError) as exc:
        raise MediaError("Ce fichier n'est pas une vidéo lisible.") from exc

    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video" and not _is_cover_art(s)), None)
    if video is None:
        raise MediaError("Aucune piste vidéo trouvée dans ce fichier.")

    duration = _to_float(data.get("format", {}).get("duration")) or _to_float(video.get("duration"))
    if not duration or duration <= 0:
        raise MediaError("Impossible de lire la durée de la vidéo.")

    width, height = int(video.get("width") or 0), int(video.get("height") or 0)
    if width <= 0 or height <= 0:
        raise MediaError("Dimensions de la vidéo illisibles.")
    if abs(_rotation(video)) in (90, 270):  # phone videos: ffmpeg auto-rotates when decoding
        width, height = height, width

    fps = _parse_rate(video.get("avg_frame_rate")) or _parse_rate(video.get("r_frame_rate")) or 30.0
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    return ProbeInfo(duration=duration, width=width, height=height, fps=min(fps, 60.0), has_audio=has_audio)


def run_ffmpeg(args: list[str], duration: float | None = None, progress: ProgressFn | None = None,
               cwd: Path | None = None, timeout: float | None = None) -> str:
    """Run ffmpeg, report progress (0..1) from `-progress`, return stderr. Raises MediaError on failure."""
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-progress", "pipe:1", "-nostats", *args]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=cwd)
    stderr_chunks: list[str] = []

    def drain() -> None:
        assert proc.stderr is not None
        for line in proc.stderr:
            stderr_chunks.append(line)

    t = threading.Thread(target=drain, daemon=True)
    t.start()
    assert proc.stdout is not None
    deadline = time.monotonic() + timeout if timeout else None
    try:
        for line in proc.stdout:
            if deadline and time.monotonic() > deadline:
                raise MediaError("Le traitement vidéo a pris trop de temps.")
            if progress and duration and line.startswith("out_time_us="):
                value = _to_float(line.split("=", 1)[1])
                if value is not None and value >= 0:
                    progress(min(1.0, value / 1e6 / duration))
        proc.wait(timeout=max(1.0, deadline - time.monotonic()) if deadline else None)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        raise MediaError("Le traitement vidéo a pris trop de temps.")
    except BaseException:
        proc.kill()  # cancelled, timed out or crashed: don't leave ffmpeg running
        proc.wait()
        raise
    t.join(timeout=5)
    stderr = "".join(stderr_chunks)
    if proc.returncode != 0:
        tail = "\n".join(stderr.strip().splitlines()[-8:])
        log.warning("ffmpeg failed (%s): %s", proc.returncode, tail[-1500:])
        raise MediaError("Le traitement de la vidéo a échoué : le fichier est peut-être abîmé ou dans un format non pris en charge.")
    return stderr


def extract_audio(src: Path, dest: Path, duration: float, progress: ProgressFn | None = None) -> Path:
    """Decode the soundtrack to raw signed 16-bit mono PCM (no header, easy to memory-map)."""
    # `-t`: never decode more than the probed duration (a file can lie about its length in its header).
    run_ffmpeg(
        ["-i", str(src), "-t", f"{duration + 1:.3f}", "-vn", "-ac", "1", "-ar", str(AUDIO_RATE),
         "-f", "s16le", "-acodec", "pcm_s16le", str(dest)],
        duration=duration, progress=progress, timeout=max(600.0, duration * 2),
    )
    return dest


def load_pcm(path: Path) -> np.ndarray:
    """Memory-mapped int16 samples of a file written by extract_audio."""
    if path.stat().st_size < 2:
        return np.zeros(0, dtype=np.int16)
    return np.memmap(path, dtype=np.int16, mode="r")


def loudness_per_second(pcm: np.ndarray, n_seconds: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (mean dBFS, max short-term dBFS) for every second of audio.

    Short-term = 100 ms windows, so a shout or a laugh inside a calm second still shows up.
    """
    mean_db = np.full(n_seconds, -90.0, dtype=np.float32)
    peak_db = np.full(n_seconds, -90.0, dtype=np.float32)
    hop = AUDIO_RATE // 10
    chunk_seconds = 600  # process 10 minutes at a time to keep memory flat on long VODs
    for start_s in range(0, n_seconds, chunk_seconds):
        end_s = min(n_seconds, start_s + chunk_seconds)
        block = pcm[start_s * AUDIO_RATE: end_s * AUDIO_RATE]
        secs = len(block) // AUDIO_RATE
        if secs == 0:
            continue
        frames = block[: secs * AUDIO_RATE].astype(np.float32).reshape(secs * 10, hop) / 32768.0
        rms = np.sqrt(np.mean(frames * frames, axis=1) + 1e-12)
        db = 20.0 * np.log10(rms + 1e-9).reshape(secs, 10)
        energy = np.mean(np.power(10.0, db / 10.0), axis=1)
        mean_db[start_s:start_s + secs] = 10.0 * np.log10(energy + 1e-12)
        peak_db[start_s:start_s + secs] = db.max(axis=1)
    return mean_db, peak_db


_SCENE_RE = re.compile(r"pts_time:([0-9.]+)\s*\n?\s*lavfi\.scene_score=([0-9.]+)")


def scene_scores_per_second(src: Path, duration: float, work_dir: Path,
                            progress: ProgressFn | None = None) -> np.ndarray:
    """Max visual change score (0..1) for each second: hard cuts, fast motion, flashes."""
    n = max(1, int(math.ceil(duration)))
    fps = 2 if duration <= 2 * 3600 else 1  # long VODs: sample less to keep analysis fast
    out_name = "scenes.txt"
    vf = (
        f"fps={fps},scale=256:-2,"
        "select='gte(scene\\,0)',"
        f"metadata=print:key=lavfi.scene_score:file={out_name}"
    )
    run_ffmpeg(["-i", str(src), "-t", f"{duration + 1:.3f}", "-an", "-sn", "-dn", "-vf", vf, "-f", "null", "-"],
               duration=duration, progress=progress, cwd=work_dir, timeout=max(900.0, duration * 3))
    scores = np.zeros(n, dtype=np.float32)
    text = (work_dir / out_name).read_text(errors="ignore") if (work_dir / out_name).exists() else ""
    for t_str, s_str in _SCENE_RE.findall(text):
        t, s = float(t_str), float(s_str)
        i = min(n - 1, int(t))
        if s > scores[i]:
            scores[i] = s
    (work_dir / out_name).unlink(missing_ok=True)
    return scores


def gray_frames(src: Path, start: float, duration: float, width: int = 480, fps: float = 1.0):
    """Yield (time_offset, HxW uint8 grayscale frame) sampled from [start, start+duration]."""
    probe_info = probe(src)
    height = int(round(probe_info.height * width / probe_info.width / 2) * 2)
    cmd = [
        "ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error",
        "-ss", f"{start:.3f}", "-t", f"{duration:.3f}", "-i", str(src),
        "-vf", f"fps={fps},scale={width}:{height}", "-pix_fmt", "gray", "-f", "rawvideo", "pipe:1",
    ]
    frame_size = width * height
    with subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as proc:
        assert proc.stdout is not None
        i = 0
        while True:
            buf = proc.stdout.read(frame_size)
            if len(buf) < frame_size:
                break
            yield i / fps, np.frombuffer(buf, dtype=np.uint8).reshape(height, width)
            i += 1


def _is_cover_art(stream: dict) -> bool:
    return bool(stream.get("disposition", {}).get("attached_pic"))


def _rotation(stream: dict) -> int:
    rot = stream.get("tags", {}).get("rotate")
    if rot is not None:
        try:
            return int(float(rot)) % 360
        except ValueError:
            return 0
    for side in stream.get("side_data_list", []) or []:
        if "rotation" in side:
            try:
                return int(float(side["rotation"])) % 360
            except (TypeError, ValueError):
                return 0
    return 0


def _parse_rate(value: str | None) -> float | None:
    if not value or value in ("0/0", "0"):
        return None
    try:
        if "/" in value:
            num, den = value.split("/", 1)
            return float(num) / float(den) if float(den) else None
        return float(value)
    except ValueError:
        return None


def _to_float(value) -> float | None:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None
