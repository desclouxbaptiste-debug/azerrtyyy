"""French voice-over + word timings for subtitles.

Input  <folder>/script.json : {"engine": "kokoro"|"piper", "speed": 1.1, "target": 57, "segments": [{"id": "hook", "text": "..."}, ...]}
       "{Milgram|Milgrame}" in a text = shown as Milgram in subtitles, pronounced "Milgrame" by the voice.
       "post": {"semitones": -1.5, "warmth": 3} deepens/warms the voice with ffmpeg (duration unchanged).
Output <folder>/voice.wav (mono) and <folder>/timings.json
Usage: tts/bin/python tts.py <folder> <models_dir>
Engines (pip install kokoro-onnx sherpa-onnx soundfile):
  kokoro: kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx releases, Apache-2.0),
          French voice ff_siwis (female, SIWIS dataset CC-BY 4.0).
  piper:  sherpa-onnx "vits-piper-<voice>" folders (github.com/k2-fsa/sherpa-onnx releases, tag tts-models),
          e.g. fr_FR-tom-medium (male, AGPL-3.0), fr_FR-upmc-medium sid 1 "pierre" (male, CC BY-SA 4.0).
"""
import json
import re
import sys

import os
import subprocess
import tempfile

import numpy as np
import soundfile as sf

folder, models = sys.argv[1], sys.argv[2]
cfg = json.load(open(f"{folder}/script.json"))
ENGINE = cfg.get("engine", "kokoro")
LEAD = cfg.get("lead", 0.25)
GAP_SENT, GAP_SEG, GAP_SUSPENSE = cfg.get("gap_sentence", 0.16), cfg.get("gap_segment", 0.32), cfg.get("gap_suspense", 0.5)

if ENGINE == "kokoro":
    from kokoro_onnx import Kokoro
    kokoro = Kokoro(f"{models}/kokoro.onnx", f"{models}/voices.bin")
    SR = 24000

    def synth(text, speed):
        audio, _ = kokoro.create(text, voice=cfg.get("voice", "ff_siwis"), speed=speed, lang="fr-fr")
        return audio
else:
    import sherpa_onnx
    d = f"{models}/vits-piper-{cfg['voice']}"
    _tts = {}

    def synth(text, speed):
        # length_scale > 1 = slower; speed is mapped onto it so "target" keeps working
        ls = round(1.0 / speed, 3)
        if ls not in _tts:
            _tts[ls] = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/{cfg['voice']}.onnx", tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data",
                                                           length_scale=ls, noise_scale=cfg.get("noise", 0.6), noise_scale_w=cfg.get("noise_w", 0.75)),
                num_threads=4)))
        a = _tts[ls].generate(text, sid=cfg.get("sid", 0), speed=1.0)
        return np.array(a.samples, dtype=np.float32)
    SR = json.load(open(f"{d}/{cfg['voice']}.onnx.json"))["audio"]["sample_rate"]


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


def gap_after(sentence):
    return GAP_SUSPENSE if sentence.rstrip().endswith(("...", "…")) else GAP_SENT


def synth_all(speed):
    clips = []
    for seg in cfg["segments"]:
        for s in sentences(seg["text"]):
            audio = synth(spoken(s).replace("…", "...").replace("...", "."), speed)
            clips.append((seg["id"], s, trim(audio)))
    total = LEAD + sum(len(c[2]) / SR + gap_after(c[1]) for c in clips) + GAP_SEG * len(cfg["segments"])
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
    gap = gap_after(text)
    out.append(np.zeros(int(gap * SR)))
    t += dur + gap
    segs[-1]["end"] = round(t, 3)

voice = np.concatenate(out)
sf.write(f"{folder}/voice.wav", voice / np.max(np.abs(voice)) * 0.9, SR, subtype="PCM_16")
post = cfg.get("post")
if post:
    # deeper + warmer narrator: pitch down by resampling (tempo restored, so timings stay valid), low-shelf boost, gentle compression
    r = 2 ** (post.get("semitones", 0) / 12)
    chain = f"asetrate={SR * r:.0f},aresample={SR},atempo={1 / r:.5f},lowshelf=g={post.get('warmth', 0)}:f=180,acompressor=threshold=0.12:ratio=2.5:attack=8:release=120,volume=1.0"
    tmp = tempfile.mktemp(suffix=".wav")
    os.replace(f"{folder}/voice.wav", tmp)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-af", chain, f"{folder}/voice.wav"], check=True)
    os.remove(tmp)
json.dump({"duration": round(len(voice) / SR, 3), "speed": speed, "segments": segs}, open(f"{folder}/timings.json", "w"), ensure_ascii=False, indent=1)
print(f"voice.wav {len(voice) / SR:.2f}s, {sum(len(s['sentences']) for s in segs)} sentences")
