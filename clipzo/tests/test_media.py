from conftest import needs_ffmpeg
from server import media


@needs_ffmpeg
def test_audio_decode_is_bounded_by_the_probed_duration(sample_video, tmp_path):
    """A file can lie about its length: decoding stops at the duration we checked against the plan."""
    dest = tmp_path / "a.raw"
    media.extract_audio(sample_video, dest, duration=10.0)
    seconds = dest.stat().st_size / 2 / media.AUDIO_RATE
    assert 10.0 <= seconds <= 11.2


@needs_ffmpeg
def test_scene_scores_parse_real_ffmpeg_output(sample_video, tmp_path):
    scores = media.scene_scores_per_second(sample_video, 150.0, tmp_path)
    assert len(scores) == 150
    assert scores[90:102].max() > 0.3  # the flashing passage
    assert scores[:80].max() < 0.3


@needs_ffmpeg
def test_latin1_metadata_does_not_hang_ffmpeg(tmp_path):
    """Non-UTF-8 bytes in ffmpeg's messages used to kill the reader thread and freeze the job."""
    import subprocess

    src = tmp_path / "latin1.mkv"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=160x90:rate=10",
                    "-t", "3", "-c:v", "libx264", "-preset", "ultrafast", str(src)], check=True)
    patched = tmp_path / "patched.mkv"
    data = src.read_bytes()
    # write a Latin-1 title by remuxing with metadata given as raw bytes
    subprocess.run([b"ffmpeg", b"-hide_banner", b"-loglevel", b"error", b"-y", b"-i", bytes(src), b"-c", b"copy",
                    b"-metadata", b"title=Vid\xe9o d'\xe9t\xe9", bytes(patched)], check=True)
    assert data  # source exists
    err = media.run_ffmpeg(["-i", str(patched), "-f", "null", "-"], timeout=60)
    assert "Input #0" in err


@needs_ffmpeg
def test_timeout_fires_even_when_ffmpeg_prints_nothing(tmp_path):
    import time

    start = time.monotonic()
    import pytest

    with pytest.raises(media.MediaError):
        media.run_ffmpeg(["-f", "lavfi", "-i", "anullsrc", "-f", "null", "-"], timeout=2)  # endless input
    assert time.monotonic() - start < 15
