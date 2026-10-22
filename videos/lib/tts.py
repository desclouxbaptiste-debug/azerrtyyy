"""French voice-over with Kokoro (ff_siwis) + word timings for subtitles.

Input  <folder>/script.json : {"speed": 1.1, "target": 57, "segments": [{"id": "hook", "text": "..."}, ...]}
       "{Milgram|Milgrame}" in a text = shown as Milgram in subtitles, pronounced "Milgrame" by the voice.
Output <folder>/voice.wav (24 kHz mono) and <folder>/timings.json
Usage: tts/bin/python tts.py <folder> <models_dir>
Needs: pip install kokoro-onnx soundfile ; models kokoro-v1.0.onnx + voices-v1.0.bin
(github.com/thewh1teagle/kokoro-onnx releases, Apache-2.0; voice trained on SIWIS, CC-BY 4.0).
"""
import json
import re
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

folder, models = sys.argv[1], sys.argv[2]
cfg = json.load(open(f"{folder}/script.json"))
kokoro = Kokoro(f"{models}/kokoro.onnx", f"{models}/voices.bin")
SR = 24000
LEAD, GAP_SENT, GAP_SEG = 0.25, 0.16, 0.32


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?…])\s+", text.strip()) if s.strip()]


MARK = re.compile(r"\{([^|}]*)\|([^}]*)\}")


def tokens(sentence):
    """[(shown, spoken)] per subtitle word; markup {shown|spoken} counts as one word."""
    out = []
    for part in re.split(r"(\{[^}]*\})|\s+", sentence):
        if not part:
            continue
        m = MARK.fullmatch(part)
        if m:
            out.append((m.group(1), m.group(2)))
        elif out and MARK.fullmatch(out[-1][0] or "") is None and re.fullmatch(r"[,.;:!?…]+", part):
            out[-1] = (out[-1][0] + part, out[-1][1] + part)
        else:
            out.append((part, part))
    return out


def spoken(sentence):
    return MARK.sub(lambda m: m.group(2), sentence)


def shown(sentence):
    return MARK.sub(lambda m: m.group(1), sentence)


def trim(x, thr=0.006):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    a, b = max(0, idx[0] - int(0.02 * SR)), min(len(x), idx[-1] + int(0.09 * SR))
    return x[a:b]


def word_weights(toks):
    w = []
    for shown_w, word in toks:
        letters = len(re.sub(r"[^\wÀ-ÿ%]", "", word)) or 1
        if re.search(r"\d", word):
            letters *= 3  # digits are read as long words
        pause = 4 if word.endswith((",", ";", ":")) else 0
        w.append((letters + 1.5, pause))
    return w


def synth_all(speed):
    clips = []
    for seg in cfg["segments"]:
        for s in sentences(seg["text"]):
            audio, _ = kokoro.create(spoken(s).replace("…", "."), voice=cfg.get("voice", "ff_siwis"), speed=speed, lang="fr-fr")
            clips.append((seg["id"], s, trim(audio)))
    total = LEAD + sum(len(c[2]) / SR for c in clips) + GAP_SENT * len(clips) + GAP_SEG * len(cfg["segments"])
    return clips, total


speed = cfg.get("speed", 1.1)
clips, total = synth_all(speed)
if cfg.get("target"):
    speed = float(np.clip(speed * total / cfg["target"], 0.85, 1.35))
    clips, total = synth_all(speed)
print(f"speed {speed:.3f} -> {total:.2f}s")

out, t = [np.zeros(int(LEAD * SR))], LEAD
segs = []
prev = None
for seg_id, text, audio in clips:
    if seg_id != prev:
        if prev is not None:
            out.append(np.zeros(int(GAP_SEG * SR)))
            t += GAP_SEG
        segs.append({"id": seg_id, "start": round(t, 3), "sentences": []})
        prev = seg_id
    dur = len(audio) / SR
    toks = tokens(text)
    ww = word_weights(toks)
    unit = dur / sum(a + p for a, p in ww)
    cur, wl = t, []
    for (word, _), (a, p) in zip(toks, ww):
        wl.append({"w": word, "s": round(cur, 3), "e": round(cur + a * unit, 3)})
        cur += (a + p) * unit
    segs[-1]["sentences"].append({"text": shown(text), "spoken": spoken(text), "start": round(t, 3), "end": round(t + dur, 3), "words": wl})
    out.append(audio)
    out.append(np.zeros(int(GAP_SENT * SR)))
    t += dur + GAP_SENT
    segs[-1]["end"] = round(t, 3)

voice = np.concatenate(out)
sf.write(f"{folder}/voice.wav", voice / np.max(np.abs(voice)) * 0.9, SR, subtype="PCM_16")
json.dump({"duration": round(len(voice) / SR, 3), "speed": speed, "segments": segs}, open(f"{folder}/timings.json", "w"), ensure_ascii=False, indent=1)
print(f"voice.wav {len(voice) / SR:.2f}s, {sum(len(s['sentences']) for s in segs)} sentences")
