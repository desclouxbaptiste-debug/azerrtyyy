import numpy as np

from server import virality
from server.transcribe import Segment, Transcript, Word


def calm_audio(n, rng, level=-30.0):
    mean = level + rng.normal(0, 1.5, n).astype(np.float32)
    return mean, mean + 4


def make_transcript(n, hype_at=None):
    segs = []
    for t in range(0, n - 4, 5):
        if hype_at is not None and hype_at <= t < hype_at + 15:
            words = ["oh", "mon", "dieu", "c'est", "incroyable!"]
        else:
            words = ["on", "continue", "tranquillement", "les", "réglages."]
        ws = [Word(t + i * 0.8, t + i * 0.8 + 0.6, w) for i, w in enumerate(words)]
        segs.append(Segment(t, t + 4.4, " ".join(words), ws))
    return Transcript("fr", segs)


def test_finds_the_loud_moment_and_respects_bounds():
    rng = np.random.default_rng(1)
    n = 1200
    mean, peak = calm_audio(n, rng)
    mean[700:715] += 18
    peak[700:715] += 24
    a = virality.analyse(n, mean, peak, None, None, None, None, clip_seconds=90, count=3)
    assert len(a.candidates) == 3
    best = a.candidates[0]
    assert best.start <= 705 <= best.end, (best.start, best.end)
    for c in a.candidates:
        assert 76 <= c.duration <= 104, c.duration  # 90 s ± 15 %
        assert 0 <= c.start < c.end <= n
        assert 0 <= c.score <= 99
        assert c.reasons
    spans = sorted((c.start, c.end) for c in a.candidates)
    for (s1, e1), (s2, e2) in zip(spans, spans[1:]):
        assert e1 <= s2, "clips must not overlap"
    assert len(a.curve) == virality.CURVE_POINTS
    assert max(a.curve) == 1.0
    assert best.score >= max(c.score for c in a.candidates[1:])


def test_short_video_gives_one_whole_clip():
    rng = np.random.default_rng(2)
    mean, peak = calm_audio(45, rng)
    a = virality.analyse(45.3, mean, peak, None, None, None, None, clip_seconds=60, count=3)
    assert len(a.candidates) == 1
    assert a.candidates[0].start == 0 and a.candidates[0].end == 46


def test_heatmap_and_chat_drive_the_choice():
    rng = np.random.default_rng(3)
    n = 1800
    mean, peak = calm_audio(n, rng)
    heat = [{"start_time": i * 18, "end_time": (i + 1) * 18, "value": 1.0 if 60 <= i <= 63 else 0.1} for i in range(100)]
    chat = [(float(t), "msg") for t in range(0, n, 20)] + [(1100 + i * 0.2, "KEKW KEKW") for i in range(200)]
    a = virality.analyse(n, mean, peak, None, None, heat, chat, clip_seconds=60, count=2, platform="youtube")
    assert {"heatmap", "chat"} <= set(a.signals_used)
    best = a.candidates[0]
    assert best.start <= 1100 <= best.end or best.start <= 1090 <= best.end
    assert any("revus" in r or "chat" in r for r in best.reasons)


def test_transcript_words_and_sentence_snapping():
    rng = np.random.default_rng(4)
    n = 900
    mean, peak = calm_audio(n, rng)
    tr = make_transcript(n, hype_at=500)
    a = virality.analyse(n, mean, peak, None, tr, None, None, clip_seconds=60, count=2)
    best = a.candidates[0]
    assert best.start <= 505 <= best.end
    seg_starts = {s.start for s in tr.segments}
    assert round(best.start + 0.15, 2) in {round(s, 2) for s in seg_starts}, "starts on a sentence"
    assert "incroyable" in best.transcript
    assert any("Émotion" in r or "parole" in r or "intense" in r for r in best.reasons)
    assert best.title and best.title[0].isupper()


def test_silent_video_still_returns_clips():
    n = 600
    mean = np.full(n, -90.0, dtype=np.float32)
    scenes = np.zeros(n, dtype=np.float32)
    scenes[300:310] = 0.8
    a = virality.analyse(n, mean, mean, scenes, None, None, None, clip_seconds=60, count=2)
    assert len(a.candidates) == 2
    assert a.signals_used == ["visual"]
    assert any(c.start <= 305 <= c.end for c in a.candidates)


def test_more_candidates_than_fit():
    rng = np.random.default_rng(5)
    mean, peak = calm_audio(200, rng)
    a = virality.analyse(200, mean, peak, None, None, None, None, clip_seconds=90, count=12)
    assert 1 <= len(a.candidates) <= 2
