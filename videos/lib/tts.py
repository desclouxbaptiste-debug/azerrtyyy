"""French voice-over + word timings for subtitles.

Input  <folder>/script.json : {"engine": "kokoro"|"piper"|"supertonic", "speed": 1.1, "target": 57, "segments": [{"id": "hook", "text": "..."}, ...]}
       "{Milgram|Milgrame}" in a text = shown as Milgram in subtitles, pronounced "Milgrame" by the voice.
       "post": {"semitones": -1.5, "warmth": 3, "presence": 3} reshapes the whole voice with ffmpeg (duration unchanged).
       "emphasis": {"!": 1.5, "?": 0.8} raises the pitch of exclamations / questions (semitones) for a livelier read.
Output <folder>/voice.wav (mono) and <folder>/timings.json
Usage: tts/bin/python tts.py <folder> <models_dir>
Engines (pip install kokoro-onnx sherpa-onnx soundfile):
  kokoro: kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx releases, Apache-2.0),
          French voice ff_siwis (female, SIWIS dataset CC-BY 4.0).
  piper:  sherpa-onnx "vits-piper-<voice>" folders (github.com/k2-fsa/sherpa-onnx releases, tag tts-models),
          e.g. fr_FR-tom-medium (male, AGPL-3.0), fr_FR-upmc-medium sid 1 "pierre" (male, CC BY-SA 4.0).
  supertonic: sherpa-onnx-supertonic-3-tts-int8-2026-05-11 (same release tag; Supertone, model OpenRAIL-M),
          31 languages, 10 voices: sid 5-9 are male. Most natural and expressive of the three.
          Write numbers as {63 %|soixante-trois pour cent}: it reads digits badly.
"chunk": "segment" synthesises each segment in one go (much better prosody with Supertonic, which drifts on very
short sentences); word timings then come from forced alignment with Parakeet (lib/align.py) when its model is in
<models_dir>, otherwise from snapping punctuation to the pauses in the audio.
Moods (chunk "segment" + Parakeet only): a sentence starting with <w> is whispered, <s> is read slower, <r> is a
reveal (silence before it, slower read, listed in timings.json "reveals" for the flash + impact), <p> only adds the
silence, <l> a long one. The segment is still synthesised in one go; the sentences are cut apart afterwards and reshaped.
"emph": ["trois", ...] on a segment lifts those words (prefix match on the subtitle word) a few dB in the final mix.
"""
import hashlib
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
elif ENGINE == "supertonic":
    import sherpa_onnx
    d = f"{models}/{cfg.get('model', 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11')}"
    _st = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=f"{d}/duration_predictor.int8.onnx", text_encoder=f"{d}/text_encoder.int8.onnx",
            vector_estimator=f"{d}/vector_estimator.int8.onnx", vocoder=f"{d}/vocoder.int8.onnx", tts_json=f"{d}/tts.json",
            unicode_indexer=f"{d}/unicode_indexer.bin", voice_style=f"{d}/voice.bin"), num_threads=4)))
    SR = _st.sample_rate

    def synth(text, speed):
        g = sherpa_onnx.GenerationConfig()
        g.sid, g.num_steps, g.speed = cfg.get("sid", 5), cfg.get("steps", 8), speed
        g.extra["lang"] = cfg.get("lang", "fr")
        return np.array(_st.generate(text, g).samples, dtype=np.float32)
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


# per-sentence mood tags are stripped from the text up front; seg["moods"] keeps them in sentence order
MOOD = cfg.get("moods", {})
TEMPO = {"w": MOOD.get("whisper_tempo", 0.94), "s": MOOD.get("slow_tempo", 0.86), "r": MOOD.get("reveal_tempo", 0.9)}
PAUSE = {"r": MOOD.get("reveal_pause", 0.65), "p": MOOD.get("pause", 0.45), "l": MOOD.get("long_pause", 1.1), "w": MOOD.get("whisper_pause", 0.15)}
for _seg in cfg["segments"]:
    _moods, _clean = [], []
    for _s in sentences(_seg["text"]):
        _m = re.match(r"^<([wsrpl]+)>\s*", _s)
        _moods.append(_m.group(1) if _m else "")
        _clean.append(_s[_m.end():] if _m else _s)
    _seg["text"], _seg["moods"] = " ".join(_clean), _moods
HAS_MOODS = any(m for s in cfg["segments"] for m in s["moods"])


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
        elif out and re.fullmatch(r"%[,.;:!?…]*", part):  # "63 %" stays one subtitle word
            out[-1] = (out[-1][0] + "\u202f" + part, out[-1][1] + " " + part)
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


def pitch_shift(audio, semis):
    """Pitch shift keeping the duration (resample + tempo correction), via ffmpeg."""
    if not semis:
        return audio
    r = 2 ** (semis / 12)
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/in.wav", audio, SR)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{d}/in.wav", "-af",
                        f"asetrate={SR * r:.0f},aresample={SR},atempo={1 / r:.5f}", f"{d}/out.wav"], check=True)
        out, _ = sf.read(f"{d}/out.wav", dtype="float32")
    return out


def emphasis(sentence):
    e = cfg.get("emphasis") or {}
    end = sentence.rstrip()[-1:]
    return e.get(end, 0)


def gap_after(sentence):
    return GAP_SUSPENSE if sentence.rstrip().endswith(("...", "…")) else GAP_SENT


def synth_all(speed):
    clips = []
    for seg in cfg["segments"]:
        for s in sentences(seg["text"]):
            audio = synth(spoken(s).replace("…", "...").replace("...", "."), speed)
            clips.append((seg["id"], s, pitch_shift(trim(audio), emphasis(s))))
    total = LEAD + sum(len(c[2]) / SR + gap_after(c[1]) for c in clips) + GAP_SEG * len(cfg["segments"])
    return clips, total


def pauses(audio, min_len=0.09):
    """[(start, end)] of silent stretches (seconds) inside a clip."""
    hop = int(0.01 * SR)
    rms = np.array([np.sqrt(np.mean(audio[i:i + hop] ** 2)) for i in range(0, len(audio) - hop, hop)])
    thr = max(0.012, np.percentile(rms, 95) * 0.06)
    quiet = rms < thr
    out, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if (i - start) * 0.01 >= min_len:
                out.append((start * 0.01, i * 0.01))
            start = None
    return out


def align_segment(seg_text, audio):
    """Word timings for a whole segment clip: punctuation is snapped to the nearest pause, words in between share
    the time in proportion to their length. Returns [(sentence_text, [(word, s, e)])] relative to the clip start."""
    sents = sentences(seg_text)
    toks = [(si, w) for si, st in enumerate(sents) for w in tokens(st)]
    ww = word_weights([w for _, w in toks])
    dur = len(audio) / SR
    gaps = [g for g in pauses(audio) if 0.05 < g[0] and g[1] < dur - 0.05]
    total_w = sum(a + p for a, p in ww)
    # anchors: (token index after which a pause should fall, time of the pause)
    anchors, cum, used = [], 0.0, set()
    for i, ((si, (shown_w, spoken_w)), (a, p)) in enumerate(zip(toks, ww)):
        cum += a + p
        if i == len(toks) - 1 or not re.search(r"[,.;:!?…]$", spoken_w):
            continue
        expect = cum / total_w * dur
        best = min((g for k, g in enumerate(gaps) if k not in used and (not anchors or g[0] > anchors[-1][2])),
                   key=lambda g: abs((g[0] + g[1]) / 2 - expect), default=None)
        if best and abs((best[0] + best[1]) / 2 - expect) < 0.9:
            used.add(gaps.index(best))
            anchors.append((i, best[0], best[1]))
    # distribute words between anchors
    times = [None] * len(toks)
    bounds = [(-1, 0.0, 0.0)] + anchors + [(len(toks) - 1, dur, dur)]
    for (i0, _, t0), (i1, e1, _) in zip(bounds, bounds[1:]):
        idx = list(range(i0 + 1, i1 + 1))
        wsum = sum(ww[k][0] for k in idx) or 1
        cur = t0
        for k in idx:
            d = (e1 - t0) * ww[k][0] / wsum
            times[k] = (cur, cur + d)
            cur += d
    out = []
    for si, st in enumerate(sents):
        words = [(toks[k][1][0], times[k][0], times[k][1]) for k in range(len(toks)) if toks[k][0] == si]
        out.append((st, words))
    return out


def whisperize(x, keep=0.22, seed=3):
    """Whispered version of a voiced clip: per STFT frame the spectral envelope (liftered cepstrum) is kept and
    re-excited with noise, lows are thinned and the 3-6 kHz breath band lifted; `keep` mixes some voice back in."""
    n, hop = 1024, 256
    win = np.hanning(n)
    pad = np.concatenate([np.zeros(n), x, np.zeros(n)])
    out, norm = np.zeros(len(pad)), np.zeros(len(pad))
    rng = np.random.default_rng(seed)
    f = np.fft.rfftfreq(n, 1 / SR)
    tilt = np.clip((f - 120) / 500, 0.15, 1) * (1 + 0.6 * np.exp(-((f - 4200) / 1800) ** 2))
    lift = int(1.2e-3 * SR)
    for i in range(0, len(pad) - n, hop):
        mag = np.abs(np.fft.rfft(pad[i:i + n] * win)) + 1e-7
        cep = np.fft.irfft(np.log(mag))
        cep[lift:-lift] = 0
        e = np.exp(np.fft.rfft(cep).real) * tilt
        e *= np.sqrt(np.sum(mag ** 2) / (np.sum(e ** 2) + 1e-12))
        out[i:i + n] += np.fft.irfft(e * np.exp(1j * rng.uniform(0, 2 * np.pi, len(e))), n) * win
        norm[i:i + n] += win ** 2
    w = (out / np.maximum(norm, 1e-6))[n:n + len(x)]
    return w * (1 - keep) + x * keep


def stretch(x, tempo):
    """Slower / faster read at the same pitch (rubberband)."""
    if abs(tempo - 1) < 1e-3:
        return x
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/in.wav", x, SR)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{d}/in.wav", "-af", f"rubberband=tempo={tempo:.4f}", f"{d}/out.wav"], check=True)
        y, _ = sf.read(f"{d}/out.wav", dtype="float32")
    return y


def quietest(audio, a, b):
    """Time (s) of the quietest 10 ms in [a, b] (a sentence boundary)."""
    hop = int(0.01 * SR)
    i0, i1 = int(a * SR), int(b * SR)
    if i1 - i0 < 2 * hop:
        return (a + b) / 2
    rms = [np.sqrt(np.mean(audio[i:i + hop] ** 2)) for i in range(i0, i1 - hop, hop)]
    return (i0 + int(np.argmin(rms)) * hop + hop // 2) / SR


def apply_moods(audio, per_sent, moods):
    """Cut a segment clip into its sentences and reshape each one by mood.
    per_sent: [(sentence, [(word, s, e)])] relative to the clip. Returns (audio, per_sent, reveal offsets)."""
    dur = len(audio) / SR
    cuts = [0.0]
    for (_, wa), (_, wb) in zip(per_sent, per_sent[1:]):
        last, nxt = wa[-1][1], wb[0][1]
        cuts.append(quietest(audio, min(last + 0.15, nxt - 0.02), nxt - 0.01) if nxt - last > 0.2 else max(0.0, nxt - 0.02))
    cuts.append(dur)
    pieces, out_sents, reveals, t = [], [], [], 0.0
    for k, ((st, words), mood) in enumerate(zip(per_sent, moods)):
        a, b = cuts[k], cuts[k + 1]
        piece = audio[int(a * SR):int(b * SR)]
        pause = max([PAUSE.get(c, 0) for c in mood] or [0]) if k or mood else 0
        if pause:
            pieces.append(np.zeros(int(pause * SR)))
            t += pause
        tempo = min([TEMPO.get(c, 1.0) for c in mood] or [1.0])
        if "w" in mood:
            piece = whisperize(piece) * MOOD.get("whisper_gain", 0.85)
        piece = stretch(piece, tempo)
        if "r" in mood:
            reveals.append(round(t + max(0.0, words[0][1] - a) / tempo, 3))
        out_sents.append((st, [(w, t + (s - a) / tempo, t + (e - a) / tempo) for w, s, e in words]))
        pieces.append(piece)
        t += len(piece) / SR
    return np.concatenate(pieces), out_sents, reveals


def synth_segments(speed):
    """One clip per segment. With "best_of": N (and the Parakeet model available), each segment is generated N times
    and the take whose transcription is closest to the script is kept (Supertonic varies from run to run)."""
    n = cfg.get("best_of", 1)
    have_asr = os.path.isdir(f"{models}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8")
    if n > 1 and have_asr:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import align as asr_align
        from difflib import SequenceMatcher
    clips = []
    for seg in cfg["segments"]:
        text = spoken(seg["text"]).replace("…", "...").replace("...", ".")
        # takes are cached per (voice, speed, text): editing one segment only re-synthesises that one
        key = hashlib.sha1(f"{ENGINE}|{cfg.get('sid')}|{cfg.get('steps')}|{speed:.3f}|{n}|{text}".encode()).hexdigest()[:12]
        cached = f"{folder}/.takes/{seg['id']}_{key}.wav"
        if os.path.exists(cached):
            best, _ = sf.read(cached, dtype="float32")
            clips.append((seg["id"], seg["text"], best))
            continue
        best, best_score = None, -1
        for k in range(n if have_asr else 1):
            audio = trim(synth(text, speed))
            if n == 1 or not have_asr:
                best = audio
                break
            heard, _ = asr_align.transcribe(models, audio, SR)
            score = SequenceMatcher(None, asr_align.norm_words(text), asr_align.norm_words(heard), autojunk=False).ratio()
            if score > best_score:
                best, best_score = audio, score
            if score > 0.97:
                break
        if n > 1 and have_asr:
            print(f"  [{seg['id']}] best take {best_score:.2f}")
        os.makedirs(f"{folder}/.takes", exist_ok=True)
        sf.write(cached, best, SR, subtype="FLOAT")
        clips.append((seg["id"], seg["text"], best))
    total = LEAD + sum(len(c[2]) / SR for c in clips) + GAP_SEG * len(clips)
    return clips, total


def build_segments(clips, verbose):
    """Align each segment clip, apply the sentence moods and lay everything on one timeline.
    Returns (audio pieces, segments, reveals, total, seconds of silence that do not scale with speed)."""
    use_asr = os.path.isdir(f"{models}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8")
    if use_asr:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import align as asr_align
    moods_of = {s["id"]: s["moods"] for s in cfg["segments"]}
    out, t, segs, reveals, fixed = [np.zeros(int(LEAD * SR))], LEAD, [], [], LEAD
    for seg_id, text, audio in clips:
        seg = {"id": seg_id, "start": round(t, 3), "sentences": []}
        if use_asr:
            sents = sentences(text)
            toks = [(si, w) for si, st in enumerate(sents) for w in tokens(st)]
            words, heard = asr_align.align(models, audio, SR, [w for _, w in toks])
            per_sent = [(st, [w for (si, _), w in zip(toks, words) if si == k]) for k, st in enumerate(sents)]
            if verbose:
                print(f"  [{seg_id}] heard: {heard}")
            if any(moods_of[seg_id]):
                audio, per_sent, rv = apply_moods(audio, per_sent, moods_of[seg_id])
                reveals += [round(t + r, 3) for r in rv]
                fixed += sum(max([PAUSE.get(c, 0) for c in m] or [0]) for k, m in enumerate(moods_of[seg_id]) if k or m)
        else:
            per_sent = align_segment(text, audio)
        for st, words in per_sent:
            wl = [{"w": w, "s": round(t + a, 3), "e": round(t + b, 3)} for w, a, b in words]
            seg["sentences"].append({"text": shown(st), "spoken": spoken(st), "start": wl[0]["s"], "end": wl[-1]["e"], "words": wl})
        out.append(audio)
        out.append(np.zeros(int(GAP_SEG * SR)))
        t += len(audio) / SR + GAP_SEG
        fixed += GAP_SEG
        seg["end"] = round(t, 3)
        segs.append(seg)
    return out, segs, reveals, t, fixed


speed = cfg.get("speed", 1.1)
reveals = []
if cfg.get("chunk") == "segment":
    clips, total = synth_segments(speed)
    if cfg.get("target"):
        if HAS_MOODS:  # pauses and slowed sentences only exist after alignment: measure the real length first
            _, _, _, total, fixed = build_segments(clips, False)
            speed = round(float(np.clip(speed * (total - fixed) / max(1.0, cfg["target"] - fixed), 0.85, 1.35)), 3)
        else:
            speed = round(float(np.clip(speed * total / cfg["target"], 0.85, 1.35)), 3)
        clips, total = synth_segments(speed)
    out, segs, reveals, total, _ = build_segments(clips, True)
    print(f"speed {speed:.3f} -> {total:.2f}s")
    clips = None
else:
    clips, total = synth_all(speed)
if clips is not None and cfg.get("target"):
    speed = float(np.clip(speed * total / cfg["target"], 0.85, 1.35))
    clips, total = synth_all(speed)
if clips is not None:  # sentence-by-sentence synthesis
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
    chain = (f"asetrate={SR * r:.0f},aresample={SR},atempo={1 / r:.5f},lowshelf=g={post.get('warmth', 0)}:f=180,"
             f"equalizer=f=3200:t=q:w=1.2:g={post.get('presence', 0)},"
             f"acompressor=threshold={post.get('threshold', 0.12)}:ratio={post.get('ratio', 2.5)}:attack=6:release=100:makeup={post.get('makeup', 1)}")
    tmp = tempfile.mktemp(suffix=".wav")
    os.replace(f"{folder}/voice.wav", tmp)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-af", chain, f"{folder}/voice.wav"], check=True)
    os.remove(tmp)
emph = {s["id"]: [e.lower() for e in s.get("emph", [])] for s in cfg["segments"]}
if any(emph.values()):
    # lift the stressed words after the compressor so the lift survives (+4 dB, 25 ms ramps)
    v, vsr = sf.read(f"{folder}/voice.wav", dtype="float32")
    g = np.ones(len(v))
    for seg in segs:
        for st in seg["sentences"]:
            for w in st["words"]:
                x = re.sub(r"[,.;:!?…«»\"]", "", w["w"].lower())
                if any(x.startswith(e) or re.sub(r"^\w{1,3}['’]", "", x).startswith(e) for e in emph[seg["id"]]):
                    g[int(w["s"] * vsr):int(w["e"] * vsr)] = MOOD.get("emph_gain", 1.6)
    k = int(0.025 * vsr)
    g = np.convolve(g, np.ones(k) / k, mode="same")
    v = v * g
    sf.write(f"{folder}/voice.wav", v / np.max(np.abs(v)) * 0.9, vsr, subtype="PCM_16")
json.dump({"duration": round(len(voice) / SR, 3), "speed": speed, "reveals": reveals, "segments": segs}, open(f"{folder}/timings.json", "w"), ensure_ascii=False, indent=1)
print(f"voice.wav {len(voice) / SR:.2f}s, {sum(len(s['sentences']) for s in segs)} sentences")
