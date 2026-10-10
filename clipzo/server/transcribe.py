"""Speech-to-text with faster-whisper (runs locally, word-level timestamps)."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Callable

import numpy as np

from . import config
from .media import AUDIO_RATE

ProgressFn = Callable[[float], None]

CHUNK_SECONDS = 30 * 60  # long VODs are transcribed in 30-minute pieces to keep memory flat


class TranscriptionUnavailable(RuntimeError):
    """Whisper is not installed or its model could not be loaded."""


@dataclass
class Word:
    start: float
    end: float
    text: str


@dataclass
class Segment:
    start: float
    end: float
    text: str
    words: list[Word] = field(default_factory=list)


@dataclass
class Transcript:
    language: str
    segments: list[Segment]

    @property
    def words(self) -> list[Word]:
        return [w for s in self.segments for w in s.words]

    def text_between(self, start: float, end: float) -> str:
        return " ".join(s.text for s in self.segments if s.end > start and s.start < end).strip()

    @classmethod
    def from_dict(cls, data: dict) -> "Transcript":
        """Inverse of to_dict (the transcript is saved with the job for re-editing the shorts)."""
        segments = []
        for s in data.get("segments") or []:
            words = [Word(start=float(w[0]), end=float(w[1]), text=str(w[2])) for w in s.get("words") or []
                     if isinstance(w, (list, tuple)) and len(w) == 3]
            segments.append(Segment(start=float(s["start"]), end=float(s["end"]), text=str(s.get("text", "")),
                                    words=words))
        return cls(language=str(data.get("language") or "fr"), segments=segments)

    def to_dict(self) -> dict:
        return {
            "language": self.language,
            "segments": [
                {"start": s.start, "end": s.end, "text": s.text,
                 "words": [[w.start, w.end, w.text] for w in s.words]}
                for s in self.segments
            ],
        }


_model = None
_model_lock = threading.Lock()
_model_error: str | None = None
_model_error_at = 0.0
RETRY_AFTER = 600  # a failed model download (network blip) is retried after 10 minutes


def available() -> bool:
    if config.WHISPER_MODEL.lower() in ("off", "none", "0", ""):
        return False
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        return False
    return _model_error is None or time.monotonic() - _model_error_at > RETRY_AFTER


def _get_model():
    global _model, _model_error, _model_error_at
    if not available():
        raise TranscriptionUnavailable(_model_error or "faster-whisper n'est pas installé.")
    with _model_lock:
        if _model is None:
            from faster_whisper import WhisperModel

            try:
                _model = WhisperModel(
                    config.WHISPER_MODEL,
                    device=config.WHISPER_DEVICE,
                    compute_type=config.WHISPER_COMPUTE_TYPE,
                )
                _model_error = None
            except Exception as exc:  # noqa: BLE001 - download/runtime errors vary by backend
                _model_error = f"modèle Whisper « {config.WHISPER_MODEL} » indisponible ({exc.__class__.__name__})"
                _model_error_at = time.monotonic()
                raise TranscriptionUnavailable(_model_error) from exc
        return _model


def transcribe(pcm: np.ndarray, duration: float, progress: ProgressFn | None = None) -> Transcript:
    """Transcribe int16 mono 16 kHz samples. Timestamps are in seconds from the start of the video."""
    model = _get_model()
    pcm = pcm[: int((duration + 1) * AUDIO_RATE)]
    total = len(pcm)
    segments: list[Segment] = []
    language = config.WHISPER_LANGUAGE
    detected: str | None = None
    chunk = CHUNK_SECONDS * AUDIO_RATE
    for offset in range(0, max(total, 1), chunk):
        piece = np.asarray(pcm[offset: offset + chunk], dtype=np.float32) / 32768.0
        if piece.size < AUDIO_RATE // 2:
            break
        t0 = offset / AUDIO_RATE
        seg_iter, info = model.transcribe(
            piece,
            language=language,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            beam_size=1,
            condition_on_previous_text=False,
        )
        detected = detected or info.language
        # Lock the language for the next chunks only when the guess is reliable (not music or silence).
        if language is None and getattr(info, "language_probability", 0) >= 0.5:
            language = info.language
        for seg in seg_iter:
            words = [
                Word(start=t0 + w.start, end=t0 + w.end, text=w.word.strip())
                for w in (seg.words or []) if w.word.strip()
            ]
            text = seg.text.strip()
            if text:
                segments.append(Segment(start=t0 + seg.start, end=t0 + seg.end, text=text, words=words))
            if progress and duration:
                progress(min(1.0, (t0 + seg.end) / duration))
    if progress:
        progress(1.0)
    return Transcript(language=language or detected or "fr", segments=segments)
