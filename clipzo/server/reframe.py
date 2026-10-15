"""Find where the speaker is so the 9:16 crop keeps their face in frame, and spot a streamer's facecam."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .media import gray_frames

log = logging.getLogger("clipzo.reframe")

_cascade = None
_cascade_failed = False

SAMPLE_WIDTH = 640  # a webcam overlay's face is ~25-60 px wide at this size (the cascade needs 24)
DETECT = {"scaleFactor": 1.1, "minNeighbors": 5, "minSize": (24, 24)}
BIG_FACE_PRESENCE = 0.3  # main face (talking head): found in at least this share of the sampled frames
# Facecam: a small face that stays put near a corner or an edge of the frame for most of the clip.
FACECAM_MAX_W = 0.15  # face narrower than this share of the frame width
FACECAM_RADIUS = 0.08  # detections closer than this to each other (share of width / height) are the same face
FACECAM_MAX_MAD = 0.035  # median absolute deviation of its centre, share of the frame
FACECAM_PRESENCE = 0.38  # share of the sampled frames where it is found
FACECAM_BOX = 4.0  # a webcam overlay is about 4 face widths wide, 16:9
FACECAM_FACE_Y = 0.45  # face centre, from the top of the overlay (share of its height)


@dataclass
class FaceInfo:
    face_x: float | None = None  # horizontal centre (0..1) of the main face, None without a stable one
    facecam: tuple[float, float, float, float] | None = None  # webcam overlay box (x, y, w, h), normalised


def available() -> bool:
    return _get_cascade() is not None


def _get_cascade():
    global _cascade, _cascade_failed
    if _cascade is None and not _cascade_failed:
        try:
            import cv2

            # Read through Python, parse from memory: OpenCV's own file opening fails on Windows
            # when the path has non-ASCII characters (C:\\Users\\Élodie\\...).
            path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
            storage = cv2.FileStorage(path.read_text(encoding="utf-8"),
                                      cv2.FILE_STORAGE_READ | cv2.FILE_STORAGE_MEMORY)
            c = cv2.CascadeClassifier()
            if not c.read(storage.getFirstTopLevelNode()) or c.empty():
                raise RuntimeError(f"cascade unreadable at {path}")
            _cascade = c
        except Exception as exc:  # noqa: BLE001 - optional feature
            log.warning("Face tracking disabled: %s", exc)
            _cascade_failed = True
    return _cascade


def face_center(src: Path, start: float, duration: float) -> float | None:
    """Horizontal position (0..1) of the main face over the clip, or None when no stable face is found.

    Keeps the largest face of each sampled frame and returns the size-weighted median position,
    so a face that briefly appears doesn't drag the crop.
    """
    return analyse_faces(src, start, duration).face_x


def analyse_faces(src: Path, start: float, duration: float) -> FaceInfo:
    """Main face position and facecam box of the clip, in one pass over sampled frames. Never raises."""
    cascade = _get_cascade()
    if cascade is None:
        return FaceInfo()
    try:
        return _analyse(cascade, src, start, duration)
    except Exception as exc:  # noqa: BLE001 - optional feature: fall back to the layouts without faces
        log.warning("face analysis failed: %s", exc)
        return FaceInfo()


def _analyse(cascade, src: Path, start: float, duration: float) -> FaceInfo:
    fps = min(2.0, max(1.0, 90 / max(duration, 1.0)))  # 1-2 fps, about 90 frames for a 1 min short
    frames = 0
    big: list[tuple[float, float]] = []  # (centre x, area) of the largest big face of each frame
    small: list[tuple[int, float, float, float]] = []  # (frame, centre x, centre y, width), normalised
    aspect = 16 / 9
    for _, frame in gray_frames(src, start, duration, width=SAMPLE_WIDTH, fps=fps):
        h, w = frame.shape
        aspect = w / h
        faces = cascade.detectMultiScale(frame, **DETECT)
        big_min = max(24, h * 480 // w // 14) * w / 480  # main face: the minimum size of the 480 px analysis
        large = [f for f in faces if f[2] >= big_min]
        if large:
            x, y, fw, fh = max(large, key=lambda f: f[2] * f[3])
            big.append(((x + fw / 2) / w, float(fw * fh)))
        small += [(frames, (x + fw / 2) / w, (y + fh / 2) / h, fw / w)
                  for x, y, fw, fh in faces if fw < FACECAM_MAX_W * w]
        frames += 1
    if frames == 0:
        return FaceInfo()
    return FaceInfo(face_x=_main_face_x(big, frames), facecam=_facecam(small, frames, aspect))


def _main_face_x(big: list[tuple[float, float]], frames: int) -> float | None:
    if len(big) < max(2, int(frames * BIG_FACE_PRESENCE)):
        return None
    xs = np.asarray([x for x, _ in big])
    order = np.argsort(xs)
    cum = np.cumsum(np.asarray([a for _, a in big])[order])
    return float(xs[order][int(np.searchsorted(cum, cum[-1] / 2))])


def _near(pts: np.ndarray, cx: float, cy: float) -> np.ndarray:
    """Rows of `pts` (frame, x, y, w) closest to (cx, cy) within FACECAM_RADIUS, at most one per frame."""
    d = np.maximum(np.abs(pts[:, 1] - cx), np.abs(pts[:, 2] - cy))
    keep = pts[d < FACECAM_RADIUS]
    d = d[d < FACECAM_RADIUS]
    order = np.argsort(d, kind="stable")
    _, first = np.unique(keep[order, 0], return_index=True)
    return keep[order][first]


def _facecam(small: list[tuple[int, float, float, float]], frames: int,
             aspect: float) -> tuple[float, float, float, float] | None:
    """Box of the webcam overlay around the small face that stays at the same off-centre place."""
    if not small:
        return None
    pts = np.asarray(small, dtype=np.float64)
    seed = max(pts, key=lambda p: len(_near(pts, p[1], p[2])))  # the place found in the most frames
    group = _near(pts, seed[1], seed[2])
    cx, cy = float(np.median(group[:, 1])), float(np.median(group[:, 2]))
    group = _near(pts, cx, cy)
    cx, cy = float(np.median(group[:, 1])), float(np.median(group[:, 2]))
    if len(group) < max(2, FACECAM_PRESENCE * frames):
        return None
    mad = max(np.median(np.abs(group[:, 1] - cx)), np.median(np.abs(group[:, 2] - cy)))
    dx, dy = min(cx, 1 - cx), min(cy, 1 - cy)
    off_centre = min(dx, dy) < 0.2 or (dx < 0.3 and dy < 0.3)  # an overlay, not someone in the scene
    if mad > FACECAM_MAX_MAD or not off_centre:
        return None
    bw = min(1.0, FACECAM_BOX * float(np.median(group[:, 3])))
    bh = min(1.0, bw * aspect * 9 / 16)
    bx = min(max(cx - bw / 2, 0.0), 1 - bw)
    by = min(max(cy - FACECAM_FACE_Y * bh, 0.0), 1 - bh)
    return round(bx, 4), round(by, 4), round(bw, 4), round(bh, 4)
