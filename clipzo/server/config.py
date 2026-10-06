"""Runtime settings (environment variables) and subscription plans."""

from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # the clipzo/ folder (static site lives here)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


DATA_DIR = Path(os.environ.get("CLIPZO_DATA_DIR", ROOT / "data")).resolve()
JOBS_DIR = DATA_DIR / "jobs"

HOST = os.environ.get("CLIPZO_HOST", "127.0.0.1")
PORT = _env_int("CLIPZO_PORT", 8000)

# How many videos are processed at the same time. Whisper and ffmpeg are CPU heavy:
# keep 1 on a small machine, raise it on a big one or with a GPU.
WORKERS = max(1, _env_int("CLIPZO_WORKERS", 1))
MAX_QUEUED_JOBS = _env_int("CLIPZO_MAX_QUEUED_JOBS", 20)
MAX_ACTIVE_JOBS_PER_CLIENT = _env_int("CLIPZO_MAX_JOBS_PER_CLIENT", 2)
JOB_TTL_HOURS = _env_float("CLIPZO_JOB_TTL_HOURS", 24)

MAX_UPLOAD_MB = _env_int("CLIPZO_MAX_UPLOAD_MB", 4096)
MAX_DOWNLOAD_MB = _env_int("CLIPZO_MAX_DOWNLOAD_MB", 8192)

# Speech-to-text (faster-whisper). "small" is a good speed/quality balance on CPU;
# "medium" or "large-v3" are better on a GPU. CLIPZO_WHISPER_MODEL=off disables it.
WHISPER_MODEL = os.environ.get("CLIPZO_WHISPER_MODEL", "small")
WHISPER_DEVICE = os.environ.get("CLIPZO_WHISPER_DEVICE", "auto")
WHISPER_COMPUTE_TYPE = os.environ.get("CLIPZO_WHISPER_COMPUTE", "int8")
WHISPER_LANGUAGE = os.environ.get("CLIPZO_WHISPER_LANGUAGE") or None  # None = auto-detect

# Claude re-ranks the best candidate moments and writes titles / hooks / hashtags.
# Needs ANTHROPIC_API_KEY (or another Anthropic credential). CLIPZO_LLM=off disables it.
LLM_MODE = os.environ.get("CLIPZO_LLM", "auto").lower()  # auto | on | off
CLAUDE_MODEL = os.environ.get("CLIPZO_CLAUDE_MODEL", "claude-opus-5-5")
CLAUDE_EFFORT = os.environ.get("CLIPZO_CLAUDE_EFFORT", "medium")

# Comma-separated origins allowed to call the API from another domain (empty = same origin only).
CORS_ORIGINS = [o.strip() for o in os.environ.get("CLIPZO_CORS_ORIGINS", "").split(",") if o.strip()]

# Accounts and payments are not built yet: the plan is chosen by the browser.
# Set CLIPZO_FORCE_PLAN=free|creator|pro to ignore what the browser sends.
FORCE_PLAN = os.environ.get("CLIPZO_FORCE_PLAN") or None

MIN_CLIP_SECONDS = 60
MAX_CLIP_SECONDS = 180


def clip_bounds(seconds: int) -> tuple[int, int]:
    """Allowed short length around the requested one (±15 %, always within 60-180 s)."""
    lo = max(MIN_CLIP_SECONDS, math.floor(seconds * 0.85))
    hi = min(MAX_CLIP_SECONDS, math.ceil(seconds * 1.15))
    return lo, max(lo, hi)


@dataclass(frozen=True)
class Plan:
    key: str
    label: str
    max_clips: int
    max_source_minutes: int
    out_width: int  # 9:16 output, height = width * 16 / 9
    allow_4k: bool
    watermark_required: bool
    subtitles: bool
    animated_subtitles: bool
    ai_titles: bool
    face_tracking: bool

    @property
    def out_height(self) -> int:
        return self.out_width * 16 // 9

    def public(self) -> dict:
        return asdict(self)


PLANS: dict[str, Plan] = {
    "free": Plan(
        key="free", label="Gratuit", max_clips=5, max_source_minutes=60, out_width=720,
        allow_4k=False, watermark_required=True, subtitles=False, animated_subtitles=False,
        ai_titles=False, face_tracking=False,
    ),
    "creator": Plan(
        key="creator", label="Créateur", max_clips=8, max_source_minutes=180, out_width=1080,
        allow_4k=False, watermark_required=False, subtitles=True, animated_subtitles=False,
        ai_titles=False, face_tracking=True,
    ),
    "pro": Plan(
        key="pro", label="Pro", max_clips=12, max_source_minutes=600, out_width=1080,
        allow_4k=True, watermark_required=False, subtitles=True, animated_subtitles=True,
        ai_titles=True, face_tracking=True,
    ),
}


def llm_configured() -> bool:
    if LLM_MODE == "off":
        return False
    if LLM_MODE == "on":
        return True
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
