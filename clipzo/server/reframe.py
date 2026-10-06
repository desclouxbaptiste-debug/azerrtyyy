"""Find where the speaker is so the 9:16 crop keeps their face in frame."""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from .media import gray_frames

log = logging.getLogger("clipzo.reframe")

_cascade = None
_cascade_failed = False


def available() -> bool:
    return _get_cascade() is not None


def _get_cascade():
    global _cascade, _cascade_failed
    if _cascade is None and not _cascade_failed:
        try:
            import cv2

            path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            c = cv2.CascadeClassifier(path)
            if c.empty():
                raise RuntimeError(f"cascade not found at {path}")
            _cascade = c
        except Exception as exc:  # noqa: BLE001 - optional feature
            log.warning("Face tracking disabled: %s", exc)
            _cascade_failed = True
    return _cascade


def face_center(src: Path, start: float, duration: float) -> float | None:
    """Horizontal position (0..1) of the main face over the clip, or None when no stable face is found.

    Samples one frame per second, keeps the largest face of each frame and returns the
    size-weighted median position, so a face that briefly appears doesn't drag the crop.
    """
    cascade = _get_cascade()
    if cascade is None:
        return None
    xs: list[float] = []
    weights: list[float] = []
    frames = 0
    for _, frame in gray_frames(src, start, duration, width=480, fps=1.0):
        frames += 1
        h, w = frame.shape
        faces = cascade.detectMultiScale(frame, scaleFactor=1.15, minNeighbors=6, minSize=(max(24, h // 14),) * 2)
        if len(faces) == 0:
            continue
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        xs.append((x + fw / 2) / w)
        weights.append(float(fw * fh))
    if frames == 0 or len(xs) < max(2, int(frames * 0.3)):
        return None
    order = np.argsort(xs)
    xs_sorted = np.asarray(xs)[order]
    cum = np.cumsum(np.asarray(weights)[order])
    return float(xs_sorted[int(np.searchsorted(cum, cum[-1] / 2))])
