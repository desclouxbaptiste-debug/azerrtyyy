"""Face detection on real faces: a streamer's webcam in a corner, a talking head, no face at all."""

import subprocess
from pathlib import Path

import pytest

from conftest import needs_ffmpeg
from server import config, media, reframe, render
from server.transcribe import Segment, Transcript, Word

FACE = Path(__file__).resolve().parent / "fixtures" / "face.jpg"

pytest.importorskip("cv2")


def _video(path: Path, filter_graph: str, seconds: int = 8) -> Path:
    """A 1280x720 game-like background (moving test pattern) with the face composited by `filter_graph`."""
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-t", str(seconds), "-i", "testsrc2=size=1280x720:rate=25",
        "-loop", "1", "-framerate", "25", "-t", str(seconds), "-i", str(FACE),
        "-f", "lavfi", "-t", str(seconds), "-i", "sine=frequency=330:sample_rate=48000",
        "-filter_complex", filter_graph + ",format=yuv420p[v]",
        "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "24", "-c:a", "aac",
        str(path),
    ], check=True)
    return path


@pytest.fixture(scope="module")
def webcam_stream(tmp_path_factory):
    # webcam overlay ~320 px wide in the top-right corner, the head moving a little inside it
    return _video(tmp_path_factory.mktemp("faces") / "stream.mp4",
                  "[1:v]crop=w=iw*0.9:h=ih*0.9:x='(iw-ow)/2*(1+sin(t*1.3))':y='(ih-oh)/2*(1+0.6*sin(t*0.7))',"
                  "scale=320:-2,drawbox=x=0:y=0:w=iw:h=ih:color=white@0.85:t=4[cam];"
                  "[0:v][cam]overlay=x=W-w-25:y=25")


@pytest.fixture(scope="module")
def talking_head(tmp_path_factory):
    return _video(tmp_path_factory.mktemp("faces") / "head.mp4",
                  "[1:v]crop=w=iw*0.6:h=ih*0.6:x=(iw-ow)/2:y=(ih-oh)*0.45,scale=1280:720[head];[0:v][head]overlay=0:0")


@needs_ffmpeg
def test_webcam_in_a_corner_is_found(webcam_stream):
    info = reframe.analyse_faces(webcam_stream, 0, 8)
    assert info.facecam is not None
    x, y, w, h = info.facecam
    # the box holds the overlay (x 935-1255, y 25-205 of 1280x720), not more than the corner
    assert 0.6 < x < 0.8 and y < 0.1 and 0.15 < w < 0.4 and x + w <= 1 and y + h <= 1


@needs_ffmpeg
def test_talking_head_is_not_a_webcam(talking_head):
    info = reframe.analyse_faces(talking_head, 0, 8)
    assert info.facecam is None
    assert info.face_x is not None and abs(info.face_x - 0.5) < 0.12
    assert reframe.face_center(talking_head, 0, 8) == info.face_x


@needs_ffmpeg
def test_no_face(tmp_path):
    src = _video(tmp_path / "game.mp4", "[0:v]null")
    assert reframe.analyse_faces(src, 0, 8) == reframe.FaceInfo()
    assert reframe.analyse_faces(tmp_path / "missing.mp4", 0, 8) == reframe.FaceInfo()  # never raises


@needs_ffmpeg
def test_streamer_short_puts_the_webcam_on_top(webcam_stream, tmp_path):
    info = media.probe(webcam_stream)
    faces = reframe.analyse_faces(webcam_stream, 0, 8)
    words = [Word(0.5 + i * 0.4, 0.8 + i * 0.4, w) for i, w in enumerate("Regarde ce clutch incroyable".split())]
    transcript = Transcript("fr", [Segment(0.5, 2.5, "Regarde ce clutch incroyable", words)])
    from server.styles import Style

    opts = render.RenderOptions(reframe=True, subtitles=True, animated_subtitles=True, watermark=False)
    result = render.render_clip(webcam_stream, info, 0, 6, tmp_path, 0, config.PLANS["pro"], opts, transcript,
                                faces.face_x, 2.0, facecam=faces.facecam, layout="auto",
                                style=Style(font="anton", shape="bandeau"))
    assert result.layout == "streamer" and (result.width, result.height) == (1080, 1920)
    assert result.has_subtitles
    frame = tmp_path / "frame.png"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", "1", "-i", str(result.video),
                    "-frames:v", "1", str(frame)], check=True)
    import cv2

    img = cv2.imread(str(frame), cv2.IMREAD_GRAYSCALE)
    top = img[: render.seam_y(1920)]
    faces_top = reframe._get_cascade().detectMultiScale(top, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    assert len(faces_top) >= 1  # the streamer's face, big, in the top panel
