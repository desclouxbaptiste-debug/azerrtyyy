import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

# Isolate every test run: its own data folder, no network models, no Claude unless a test mocks it.
_TMP = Path(tempfile.mkdtemp(prefix="clipzo-tests-"))
os.environ["CLIPZO_DATA_DIR"] = str(_TMP / "data")
os.environ.setdefault("CLIPZO_WHISPER_MODEL", "off")
os.environ["CLIPZO_LLM"] = "off"
os.environ["CLIPZO_MAX_JOBS_PER_CLIENT"] = "50"
os.environ["CLIPZO_MAX_JOBS_PER_IP"] = "50"
os.environ["CLIPZO_MAX_SIGNUPS_PER_IP_HOUR"] = "1000"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

HAS_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None
needs_ffmpeg = pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg not installed")


def make_sample_video(path: Path, seconds: int = 150, hype_at: int = 90, size: str = "640x360") -> Path:
    """Calm tone + low noise, then at `hype_at` a loud burst with flashing frames for 12 s."""
    a, b = hype_at, hype_at + 12
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", f"testsrc2=size={size}:rate=25:duration={seconds}",
        "-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.02:duration={seconds}:sample_rate=48000",
        "-f", "lavfi", "-i", f"sine=frequency=220:duration={seconds}:sample_rate=48000",
        "-filter_complex",
        f"[2:a]volume='if(between(t,{a},{b}),0.9,0.08)':eval=frame[tone];"
        f"[1:a]volume='if(between(t,{a},{b}),12,1)':eval=frame[noise];"
        "[tone][noise]amix=inputs=2:normalize=0[a];"
        f"[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=white@1:t=fill:enable='between(t,{a},{b})*lt(mod(t,0.6),0.3)'[v]",
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "32",
        "-c:a", "aac", "-b:a", "96k", str(path),
    ], check=True)
    return path


@pytest.fixture(scope="session")
def sample_video(tmp_path_factory) -> Path:
    if not HAS_FFMPEG:
        pytest.skip("ffmpeg not installed")
    return make_sample_video(tmp_path_factory.mktemp("media") / "sample.mp4")
