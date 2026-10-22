"""Forced alignment of a known script onto synthesised speech, using Parakeet TDT v3 (sherpa-onnx, multilingual,
token timestamps): sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 from the k2-fsa/sherpa-onnx "asr-models" release.

The clip is transcribed, recognised words get the time of their first token, and the script's words are matched
to them in order (difflib); words the recogniser missed are interpolated between their matched neighbours.
"""
import re
import unicodedata
from difflib import SequenceMatcher

import numpy as np

_REC = {}


def recognizer(models):
    if models not in _REC:
        import sherpa_onnx
        d = f"{models}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"
        _REC[models] = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.int8.onnx", joiner=f"{d}/joiner.int8.onnx",
            tokens=f"{d}/tokens.txt", model_type="nemo_transducer", num_threads=4)
    return _REC[models]


def norm_words(text):
    """lower-case, accent-free word list; digits and % spelled out so they match what is spoken."""
    from num2words import num2words
    text = text.replace("%", " pour cent ")
    text = re.sub(r"\d+", lambda m: " " + num2words(int(m.group()), lang="fr") + " ", text)
    text = unicodedata.normalize("NFD", text.lower().replace("-", " ").replace("'", " ").replace("’", " "))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]", " ", text).split()


def transcribe(models, audio, sr):
    """(text, [(word, start_s)]) for a clip."""
    s = recognizer(models).create_stream()
    s.accept_waveform(sr, np.ascontiguousarray(audio, dtype=np.float32))
    recognizer(models).decode_stream(s)
    r = s.result
    words = []
    for tok, ts in zip(r.tokens, r.timestamps):
        if tok.startswith(" ") or not words:
            words.append([tok.strip(), ts])
        else:
            words[-1][0] += tok
    out = []
    for w, ts in words:
        for i, n in enumerate(norm_words(w)):
            out.append((n, ts + 0.02 * i))
    return r.text, out


def align(models, audio, sr, display_spoken):
    """display_spoken: [(shown_word, spoken_text)] in reading order.
    Returns [(shown_word, start, end)] in seconds relative to the clip, plus the recognised text."""
    text, rec = transcribe(models, audio, sr)
    dur = len(audio) / sr
    subs = []  # (token index, normalised sub-word)
    for i, (_, spoken) in enumerate(display_spoken):
        for n in norm_words(spoken) or ["_"]:
            subs.append((i, n))
    sm = SequenceMatcher(None, [n for _, n in subs], [w for w, _ in rec], autojunk=False)
    start = [None] * len(display_spoken)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            i = subs[a + k][0]
            if start[i] is None:
                start[i] = rec[b + k][1]
    # interpolate the words the recogniser did not return, proportionally to their length
    known = [(i, t) for i, t in enumerate(start) if t is not None]
    if not known:
        known = [(0, 0.0)]
    weight = [max(1, len(re.sub(r"\W", "", s))) for _, s in display_spoken]
    anchors = [(-1, max(0.0, known[0][1] - 0.25))] + known + [(len(start), dur)]
    for (i0, t0), (i1, t1) in zip(anchors, anchors[1:]):
        gap = list(range(i0 + 1, i1))
        if not gap:
            continue
        span_w = sum(weight[k] for k in gap) + (weight[i0] if i0 >= 0 else 0)
        cur = t0 + ((t1 - t0) * weight[i0] / span_w if i0 >= 0 else 0)
        for k in gap:
            start[k] = cur
            cur += (t1 - t0) * weight[k] / span_w
    out = []
    for i, (shown, _) in enumerate(display_spoken):
        end = start[i + 1] if i + 1 < len(start) else min(dur, start[i] + 0.5)
        out.append((shown, round(start[i], 3), round(max(end, start[i] + 0.05), 3)))
    return out, text
