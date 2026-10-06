"""The "viral moment" algorithm.

Every second of the video gets an interest score built from independent signals:

  audience  - YouTube "most replayed" heatmap, live chat activity (when the platform has them)
  audio     - loudness relative to the surrounding 2 minutes, sudden loudness spikes (shouts, laughs)
  speech    - hype words / laughter / exclamations in the transcript, speaking rate
  image     - visual change (cuts, fast motion)

The curve is smoothed, then every possible window of the requested length is scored on:
average interest, strongest peak (the payoff), first 5 seconds (the hook), dead air, and
where the peak sits (a payoff cut off at the very end makes a bad short). The best
non-overlapping windows become candidates; their edges are snapped to sentence boundaries
or pauses so a short never starts or ends mid-word.
"""

from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass, field

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

from . import config
from .transcribe import Transcript

WEIGHTS = {
    "heatmap": 0.26,
    "chat": 0.18,
    "energy": 0.14,
    "spike": 0.12,
    "text": 0.20,
    "speech": 0.05,
    "visual": 0.05,
}

CURVE_POINTS = 240
HOOK_SECONDS = 5
CHAT_REACTION_DELAY = 6  # chat reacts a few seconds after what happened on screen

_LAUGH = {"haha", "hahaha", "hahahaha", "mdr", "ptdr", "lol", "lmao", "xd", "rires", "rire", "laughs", "laughter", "laughing", "jpp"}
# Only words that carry emotion. Everyday words ("quoi", "trop", "jamais", "what", "best"...) are left out:
# they appear in every calm tutorial and would make every passage look exciting.
_HYPE = {
    # French
    "incroyable", "dingue", "ouf", "putain", "bordel", "wow", "waouh", "masterclass", "clutch",
    "impossible", "choqué", "choque", "hallucinant", "scandale", "zinzin", "abusé", "abuse", "inimaginable",
    # English
    "insane", "crazy", "wtf", "omg", "unbelievable", "insanely", "shocked",
}
_HYPE_PHRASES = ["oh mon dieu", "oh my god", "c'est fou", "non mais", "jamais vu", "pas possible", "c'est pas vrai",
                 "let's go", "lets go", "oh là là", "oh la la", "tu te rends compte", "no way", "oh no"]
_CHAT_HYPE = re.compile(
    r"(?i)\b(lul|kekw|omegalul|pog|pogchamp|pogu|poggers|monkas|lmao|lol|mdr|ptdr|xd|gg|clip|w+|ez|insane|wtf|omg)\b"
    r"|[😂🤣💀🔥😱😭👀]"
)
_WORD_RE = re.compile(r"[\wÀ-ÿ']+", re.UNICODE)


@dataclass
class Candidate:
    start: float
    end: float
    raw: float
    score: int
    peak_time: float
    reasons: list[str] = field(default_factory=list)
    title: str = ""
    hook: str = ""
    hashtags: list[str] = field(default_factory=list)
    transcript: str = ""
    features: dict[str, float] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class Analysis:
    curve: list[float]
    candidates: list[Candidate]
    signals_used: list[str]


# ---------------------------------------------------------------- helpers

def _smooth(x: np.ndarray, sigma: float) -> np.ndarray:
    if sigma <= 0 or len(x) < 3:
        return x.astype(np.float32)
    radius = int(math.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    k /= k.sum()
    padded = np.pad(x.astype(np.float32), radius, mode="edge")
    return np.convolve(padded, k, mode="valid").astype(np.float32)


def _rolling_median(x: np.ndarray, window: int) -> np.ndarray:
    if len(x) == 0:
        return x
    window = max(1, min(window, len(x)) | 1)
    half = window // 2
    padded = np.pad(x, half, mode="edge")
    out = np.empty_like(x)
    step = 4096  # bounded memory on long videos
    for i in range(0, len(x), step):
        view = sliding_window_view(padded[i: i + step + window - 1], window)
        out[i: i + len(view)] = np.median(view, axis=1)
    return out


def _robust_z(x: np.ndarray, mask: np.ndarray | None = None, min_scale: float = 1e-6) -> np.ndarray:
    """(x - median) / MAD. `min_scale` is the smallest change that means something for this signal,
    so a flat signal with tiny jitter stays near 0 instead of spanning the whole range."""
    ref = x[mask] if mask is not None and mask.any() else x
    if ref.size == 0:
        return np.zeros_like(x)
    med = float(np.median(ref))
    mad = float(np.median(np.abs(ref - med))) * 1.4826
    if mad < 1e-6:
        mad = float(ref.std())
    return (x - med) / max(mad, min_scale, 1e-6)


def _squash(z: np.ndarray) -> np.ndarray:
    """z-score -> 0..1. Typical seconds land near 0.2, clear outliers near 1."""
    z = np.clip(z, -20.0, 20.0)
    return (1.0 / (1.0 + np.exp(-1.3 * (z - 1.0)))).astype(np.float32)


def _fit(x: np.ndarray, n: int) -> np.ndarray:
    out = np.zeros(n, dtype=np.float32)
    m = min(n, len(x))
    out[:m] = x[:m]
    if m < n and m > 0:
        out[m:] = x[m - 1]
    return out


def _norm(text: str) -> str:
    return unicodedata.normalize("NFC", text.lower())


# ---------------------------------------------------------------- per-second features

def audio_features(loud_mean: np.ndarray, loud_peak: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(energy, spike, silent) per second."""
    n = len(loud_mean)
    median = float(np.median(loud_mean)) if n else -90.0
    silent = (loud_mean < -60.0) | (loud_mean < min(-40.0, median - 20.0))
    voiced = ~silent

    rel = loud_mean - _rolling_median(loud_mean, 121)
    energy = _squash(_robust_z(rel, voiced, min_scale=2.0))  # < 2 dB swings are just noise
    energy[silent] *= 0.2

    prev = np.convolve(np.pad(loud_peak, (3, 0), mode="edge"), np.ones(3) / 3, mode="valid")[:n]
    onset = np.clip(loud_peak - prev, 0, None)
    spike = _smooth(_squash(_robust_z(onset, voiced, min_scale=1.5)), 1.5)
    spike[silent] *= 0.3
    return energy, spike, silent


def text_features(transcript: Transcript, n: int) -> tuple[np.ndarray, np.ndarray, dict[int, list[str]]]:
    """(hype, speech_rate) per second, and hype words found per second (for explanations)."""
    hype = np.zeros(n, dtype=np.float32)
    rate = np.zeros(n, dtype=np.float32)
    found: dict[int, list[str]] = {}
    for seg in transcript.segments:
        seg_text = _norm(seg.text)
        words = seg.words or []
        for w in words:
            i = min(n - 1, max(0, int(w.start)))
            rate[i] += 1
            token = _norm(w.text).strip(".,!?…;:\"'«»()[]")
            if token in _LAUGH or token.startswith("haha"):
                hype[i] += 1.5
                found.setdefault(i, []).append("rires")
            elif token in _HYPE:
                hype[i] += 1.0
                found.setdefault(i, []).append(token)
        i0 = min(n - 1, max(0, int(seg.start)))
        for phrase in _HYPE_PHRASES:
            if phrase in seg_text:
                hype[i0] += 1.0
                found.setdefault(i0, []).append(phrase)
        bang = seg.text.count("!")
        if bang:
            hype[min(n - 1, max(0, int(seg.end) - 1))] += 0.5 * min(bang, 3)
        if "?" in seg.text:
            hype[i0] += 0.3
        if not words:  # no word timing: spread the segment's words evenly
            count = len(_WORD_RE.findall(seg.text))
            span = max(1, int(seg.end) - int(seg.start))
            for k in range(span):
                rate[min(n - 1, int(seg.start) + k)] += count / span
    hype = 1.0 - np.exp(-_smooth(hype, 2.0) / 0.6)
    speech = _smooth(rate, 2.5)
    speaking = speech > 0.3
    speech = _squash(_robust_z(speech, speaking, min_scale=0.5)) * speaking  # words per second
    return hype.astype(np.float32), speech.astype(np.float32), found


def heatmap_feature(heatmap: list[dict], n: int) -> np.ndarray | None:
    out = np.zeros(n, dtype=np.float32)
    seen = False
    for h in heatmap or []:
        try:
            a, b, v = float(h["start_time"]), float(h["end_time"]), float(h["value"])
        except (KeyError, TypeError, ValueError):
            continue
        i0, i1 = max(0, int(a)), min(n, int(math.ceil(b)))
        if i1 > i0:
            out[i0:i1] = np.maximum(out[i0:i1], v)
            seen = True
    if not seen:
        return None
    top = float(out.max())
    return _smooth(out / top if top > 0 else out, 3.0)


def chat_feature(chat: list[tuple[float, str]], n: int) -> tuple[np.ndarray, np.ndarray] | None:
    """(chat excitement 0..1, raw messages per second) — shifted back to when the moment happened."""
    if len(chat) < 30:
        return None
    rate = np.zeros(n, dtype=np.float32)
    for t, text in chat:
        i = min(n - 1, max(0, int(t) - CHAT_REACTION_DELAY))
        rate[i] += 1.0 + 0.5 * min(3, len(_CHAT_HYPE.findall(text or "")))
    smoothed = _smooth(rate, 4.0)
    return _squash(_robust_z(smoothed, min_scale=0.2)), smoothed


def visual_feature(scenes: np.ndarray) -> np.ndarray:
    peak3 = sliding_window_view(np.pad(scenes, 1, mode="edge"), 3).max(axis=1)
    return _smooth(_squash(_robust_z(peak3, min_scale=0.02)), 1.5)  # encoder noise is ~0.001


# ---------------------------------------------------------------- main entry

def analyse(
    duration: float,
    loud_mean: np.ndarray,
    loud_peak: np.ndarray,
    scenes: np.ndarray | None,
    transcript: Transcript | None,
    heatmap: list[dict] | None,
    chat: list[tuple[float, str]] | None,
    clip_seconds: int,
    count: int,
    platform: str = "upload",
) -> Analysis:
    n = max(1, int(math.ceil(duration)))
    loud_mean = _fit(loud_mean, n) if len(loud_mean) else np.full(n, -90.0, dtype=np.float32)
    loud_peak = _fit(loud_peak, n) if len(loud_peak) else loud_mean.copy()

    feats: dict[str, np.ndarray] = {}
    energy, spike, silent = audio_features(loud_mean, loud_peak)
    if float(loud_mean.max()) > -60.0:  # there is a real soundtrack
        feats["energy"], feats["spike"] = energy, spike
    else:
        silent = np.zeros(n, dtype=bool)
    hype_words: dict[int, list[str]] = {}
    if transcript and transcript.segments:
        feats["text"], feats["speech"], hype_words = text_features(transcript, n)
    if scenes is not None and len(scenes):
        feats["visual"] = visual_feature(_fit(scenes, n))
    heat = heatmap_feature(heatmap or [], n)
    if heat is not None:
        feats["heatmap"] = heat
    chat_rate = None
    chat_res = chat_feature(chat or [], n)
    if chat_res is not None:
        feats["chat"], chat_rate = chat_res

    if feats:
        total_w = sum(WEIGHTS[k] for k in feats)
        interest = sum(WEIGHTS[k] * v for k, v in feats.items()) / total_w
    else:
        interest = np.full(n, 0.3, dtype=np.float32)
    interest = _smooth(np.asarray(interest, dtype=np.float32), 2.0)

    curve = _downsample_max(interest, CURVE_POINTS)
    candidates, all_raw = _select_windows(interest, silent, n, clip_seconds, count, duration)
    for cand in candidates:
        _refine_bounds(cand, transcript, loud_mean, scenes, duration, clip_seconds)
    _remove_overlaps(candidates, duration, clip_seconds)
    _score_and_explain(candidates, all_raw, interest, feats, chat_rate, hype_words, silent)
    for cand in candidates:
        _describe(cand, transcript, platform)
    candidates.sort(key=lambda c: c.raw, reverse=True)
    return Analysis(curve=curve, candidates=candidates, signals_used=sorted(feats))


def _downsample_max(x: np.ndarray, points: int) -> list[float]:
    if len(x) == 0:
        return []
    edges = np.linspace(0, len(x), num=min(points, len(x)) + 1).astype(int)
    vals = np.array([x[a:max(b, a + 1)].max() for a, b in zip(edges[:-1], edges[1:])], dtype=np.float32)
    top = float(vals.max())
    if top > 0:
        vals = vals / top
    return [round(float(v), 4) for v in vals]


def _window_scores(interest: np.ndarray, silent: np.ndarray, L: int) -> tuple[np.ndarray, np.ndarray]:
    """Score of every window [s, s+L) and the position of its peak."""
    n = len(interest)
    cs = np.concatenate([[0.0], np.cumsum(interest, dtype=np.float64)])
    cs_sil = np.concatenate([[0.0], np.cumsum(silent.astype(np.float64))])
    starts = np.arange(0, n - L + 1)
    mean = (cs[starts + L] - cs[starts]) / L
    h = min(HOOK_SECONDS, L)
    hook = (cs[starts + h] - cs[starts]) / h
    dead = (cs_sil[starts + L] - cs_sil[starts]) / L
    peak = np.empty(len(starts), dtype=np.float32)
    pos = np.empty(len(starts), dtype=np.float32)
    step = max(1, 2_000_000 // max(L, 1))
    for i in range(0, len(starts), step):
        view = sliding_window_view(interest[i: i + step + L - 1], L)
        peak[i: i + len(view)] = view.max(axis=1)
        pos[i: i + len(view)] = view.argmax(axis=1) / max(1, L - 1)
    raw = 0.45 * mean + 0.30 * peak + 0.15 * hook - 0.30 * dead
    raw = raw - 0.06 * ((pos < 0.08) | (pos > 0.88))  # payoff at the very edge risks being cut
    return raw.astype(np.float32), pos


def _select_windows(interest: np.ndarray, silent: np.ndarray, n: int, L: int,
                    count: int, duration: float) -> tuple[list[Candidate], np.ndarray | None]:
    if duration <= L or duration < config.MIN_CLIP_SECONDS or n <= L:
        # Short video: the whole thing is the only possible clip.
        peak = int(np.argmax(interest)) if n else 0
        only = Candidate(start=0.0, end=round(float(duration), 2), raw=float(interest.mean()) if n else 0.0,
                         score=0, peak_time=float(min(peak, duration)))
        return [only], None
    raw, pos = _window_scores(interest, silent, L)
    _, hi = config.clip_bounds(L)
    gap = (hi - L) + 9  # refining may move a start ~8 s earlier and stretch the end to `hi`
    order = np.argsort(-raw, kind="stable")
    chosen: list[int] = []
    for s in order:
        s = int(s)
        if all(abs(s - c) >= L + gap for c in chosen):
            chosen.append(s)
            if len(chosen) >= count:
                break
    out = []
    for s in chosen:
        peak_t = s + float(pos[s]) * (L - 1)
        out.append(Candidate(start=float(s), end=float(s + L), raw=float(raw[s]), score=0, peak_time=peak_t))
    return out, raw


def _refine_bounds(cand: Candidate, transcript: Transcript | None, loud: np.ndarray,
                   scenes: np.ndarray | None, duration: float, L: int) -> None:
    """Move the edges onto sentence boundaries (or pauses / cuts) without losing the moment itself."""
    if duration <= L or duration < config.MIN_CLIP_SECONDS:
        cand.start, cand.end = 0.0, round(float(duration), 2)
        return
    lo, hi = config.clip_bounds(L)
    start = cand.start
    latest = min(cand.start, cand.peak_time - 1.0)  # never start after the moment begins

    if transcript and transcript.segments:
        starts = [s.start for s in transcript.segments if cand.start - 8 <= s.start <= latest]
        start = max(starts) if starts else _quietest(loud, latest - 3, latest)
        target = start + L
        ends = [s.end for s in transcript.segments
                if start + lo <= s.end <= start + hi and s.end >= cand.peak_time + 1]
        end = min(ends, key=lambda t: abs(t - target)) if ends else _quietest(loud, target - 2, target + 2) + 0.5
    else:
        cut = _scene_cut(scenes, latest - 3, latest)
        start = cut if cut is not None else _quietest(loud, latest - 3, latest)
        end = _quietest(loud, start + L - 3, start + L + 3) + 0.5

    start = max(0.0, start - 0.15)  # tiny lead-in so the first word isn't clipped
    end = min(duration, end + 0.25)
    if end < cand.peak_time + 1:
        end = min(duration, cand.peak_time + 3)
    dur = end - start
    if dur < lo:
        end = min(duration, start + lo)
        start = max(0.0, end - lo)
    elif dur > hi:
        end = start + hi
    cand.start, cand.end = round(start, 2), round(end, 2)
    cand.peak_time = min(max(cand.peak_time, cand.start), cand.end)


def _quietest(loud: np.ndarray, a: float, b: float) -> float:
    n = len(loud)
    i0, i1 = max(0, int(a)), min(n, int(math.ceil(b)) + 1)
    if i1 <= i0:
        return float(max(0, min(n, a)))
    return float(i0 + int(np.argmin(loud[i0:i1])))


def _scene_cut(scenes: np.ndarray | None, a: float, b: float) -> float | None:
    if scenes is None or not len(scenes):
        return None
    i0, i1 = max(0, int(a)), min(len(scenes), int(b) + 1)
    if i1 <= i0:
        return None
    seg = scenes[i0:i1]
    j = int(np.argmax(seg))
    return float(i0 + j) if seg[j] >= 0.3 else None


def _remove_overlaps(cands: list[Candidate], duration: float, L: int) -> None:
    """Safety net: trim a clip that still overlaps the previous one, keep it only if it stays long enough."""
    if len(cands) < 2:
        return
    lo, _ = config.clip_bounds(L)
    kept: list[Candidate] = []
    for cur in sorted(cands, key=lambda c: c.start):
        if kept and cur.start < kept[-1].end:
            cur.start = kept[-1].end
            if cur.end - cur.start < lo:
                cur.end = round(min(duration, cur.start + lo), 2)
            if cur.end - cur.start < lo - 0.5:
                continue  # no room left for a full-length short here
            cur.peak_time = min(max(cur.peak_time, cur.start), cur.end)
        kept.append(cur)
    cands[:] = kept


def _score_and_explain(cands: list[Candidate], all_raw: np.ndarray | None, interest: np.ndarray,
                       feats: dict[str, np.ndarray], chat_rate: np.ndarray | None,
                       hype_words: dict[int, list[str]], silent: np.ndarray) -> None:
    video_mean = {k: float(v.mean()) + 1e-6 for k, v in feats.items()}
    for c in cands:
        a, b = int(c.start), max(int(c.start) + 1, int(math.ceil(c.end)))
        if all_raw is not None and len(all_raw):
            pct = float((all_raw < c.raw).mean())
        else:
            pct = 0.5
        absolute = float(np.clip(c.raw / 0.55, 0, 1))
        c.score = int(round(min(99.0, 35 + 45 * pct + 25 * absolute)))

        win = {k: float(v[a:b].mean()) for k, v in feats.items()}
        c.features = {k: round(v, 3) for k, v in win.items()}
        ratio = {k: win[k] / video_mean[k] for k in win}
        reasons: list[tuple[float, str]] = []
        if "heatmap" in win and (win["heatmap"] > 0.55 or ratio["heatmap"] > 1.5):
            reasons.append((ratio["heatmap"] + 1, "Passage parmi les plus revus de la vidéo sur YouTube"))
        if "chat" in win and chat_rate is not None and ratio["chat"] > 1.3:
            boost = float(chat_rate[a:b].mean() / (chat_rate.mean() + 1e-6))
            if boost > 1.3:
                reasons.append((ratio["chat"] + 0.8, f"Le chat s'emballe : {boost:.1f}× plus de messages que d'habitude"))
        words = [w for i in range(a, b) for w in hype_words.get(i, [])]
        if "rires" in words:
            reasons.append((2.0, "Rires détectés : moment drôle"))
        other = [w for w in words if w != "rires"]
        if len(other) >= 2:
            top = max(set(other), key=other.count)
            reasons.append((1.6, f"Émotion forte dans les paroles (« {top} »)"))
        if "spike" in win and ratio["spike"] > 1.25:
            reasons.append((ratio["spike"], "Réaction forte : pic sonore soudain"))
        if "energy" in win and ratio["energy"] > 1.2:
            reasons.append((ratio["energy"], "Passage plus intense que le reste de la vidéo"))
        if "speech" in win and ratio["speech"] > 1.25:
            reasons.append((ratio["speech"] * 0.9, "Débit de parole rapide, ça accroche"))
        if "visual" in win and ratio["visual"] > 1.3:
            reasons.append((ratio["visual"] * 0.8, "Montage dynamique : beaucoup de changements d'image"))
        hook = float(interest[a: min(b, a + HOOK_SECONDS)].mean()) if b > a else 0.0
        window_mean = float(interest[a:b].mean()) if b > a else 0.0
        if hook > float(np.percentile(interest, 90)) and hook > window_mean * 1.15:
            reasons.append((1.2, "Accroche forte dès les premières secondes"))
        dead = float(silent[a:b].mean()) if b > a else 0.0
        if dead < 0.03 and "energy" in feats:
            reasons.append((0.5, "Aucun temps mort"))
        reasons.sort(key=lambda r: r[0], reverse=True)
        fallback = ("Moment le plus intense repéré par l'analyse" if c.score >= 60
                    else "Peu de moments forts dans cette vidéo : meilleur passage restant")
        c.reasons = [r[1] for r in reasons[:4]] or [fallback]


def _describe(c: Candidate, transcript: Transcript | None, platform: str) -> None:
    """Default title / hook from the transcript (Claude rewrites them when available)."""
    if transcript and transcript.segments:
        segs = [s for s in transcript.segments if s.end > c.start and s.start < c.end]
        c.transcript = " ".join(s.text for s in segs).strip()
        if segs:
            c.hook = _shorten(segs[0].text, 110)
            best = max(segs, key=lambda s: _hype_score(s.text) + (0.5 if s.start <= c.peak_time <= s.end else 0))
            c.title = _shorten(best.text, 70).rstrip(" .,;:")
    if not c.title:
        m, s = divmod(int(c.peak_time), 60)
        h, m = divmod(m, 60)
        stamp = f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"
        c.title = f"Moment fort à {stamp}"
    c.title = c.title[:1].upper() + c.title[1:]
    tags = ["#shorts", "#fyp"]
    if platform in ("twitch", "kick"):
        tags += ["#stream", f"#{platform}"]
    elif platform in ("youtube", "tiktok"):
        tags.append("#viral")
    c.hashtags = tags


def _hype_score(text: str) -> float:
    t = _norm(text)
    tokens = [w.strip(".,!?…") for w in _WORD_RE.findall(t)]
    return sum(1 for w in tokens if w in _HYPE or w in _LAUGH) + t.count("!") * 0.5 + sum(1 for p in _HYPE_PHRASES if p in t)


def _shorten(text: str, limit: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:") + "…"
