"""Voice catalogue: every French voice this toolkit can produce reads the same line, then a few styles of the house
voice (Supertonic sid 9, as used in the videos). Writes one WAV per entry and catalog.json (number, name, description).
Usage: tts/bin/python voice_catalog.py <out_dir> <models_dir>
"""
import json
import os
import subprocess
import sys
import tempfile
from difflib import SequenceMatcher

import numpy as np
import soundfile as sf
import sherpa_onnx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import align  # noqa: E402

out, models = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
LINE = "Tu enverrais quatre cent cinquante volts à un inconnu. Juste parce qu'on te le demande ?"

_st = None


def supertonic(sid, speed=1.07):
    global _st
    if _st is None:
        d = f"{models}/sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
        _st = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
            supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
                duration_predictor=f"{d}/duration_predictor.int8.onnx", text_encoder=f"{d}/text_encoder.int8.onnx",
                vector_estimator=f"{d}/vector_estimator.int8.onnx", vocoder=f"{d}/vocoder.int8.onnx", tts_json=f"{d}/tts.json",
                unicode_indexer=f"{d}/unicode_indexer.bin", voice_style=f"{d}/voice.bin"), num_threads=4)))
    g = sherpa_onnx.GenerationConfig()
    g.sid, g.num_steps, g.speed = sid, 12, speed
    g.extra["lang"] = "fr"
    return np.array(_st.generate(LINE, g).samples, dtype=np.float32), _st.sample_rate


def piper(voice, sid=0):
    d = f"{models}/vits-piper-{voice}"
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/{voice}.onnx", tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data"), num_threads=4)))
    a = tts.generate(LINE, sid=sid, speed=1.0)
    return np.array(a.samples, dtype=np.float32), a.sample_rate


def kokoro():
    from kokoro_onnx import Kokoro
    k = Kokoro(f"{models}/kokoro.onnx", f"{models}/voices.bin")
    a, sr = k.create(LINE, voice="ff_siwis", speed=1.0, lang="fr-fr")
    return np.array(a, dtype=np.float32), sr


def best_supertonic(sid, speed=1.07, tries=4):
    """Supertonic varies from run to run: keep the take Parakeet understands best."""
    best, best_s = None, -1
    for _ in range(tries):
        a, sr = supertonic(sid, speed)
        heard, _ = align.transcribe(models, a, sr)
        s = SequenceMatcher(None, align.norm_words(LINE), align.norm_words(heard), autojunk=False).ratio()
        if s > best_s:
            best, best_s = (a, sr), s
        if s > 0.95:
            break
    return best


def ff(audio, sr, chain):
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/in.wav", audio, sr)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{d}/in.wav", "-af", chain, f"{d}/out.wav"], check=True)
        y, sr2 = sf.read(f"{d}/out.wav", dtype="float32")
    return y, sr2


HOUSE = "asetrate={r},aresample={sr},atempo={t:.5f},lowshelf=g=3:f=180,equalizer=f=3200:t=q:w=1.2:g=1.2,acompressor=threshold=0.12:ratio=2.5:attack=6:release=100:makeup=1.15"


def house(audio, sr, semis=-1.0, extra=""):
    r = 2 ** (semis / 12)
    return ff(audio, sr, HOUSE.format(r=round(sr * r), sr=sr, t=1 / r) + (("," + extra) if extra else ""))


def whisperize(x, sr, keep=0.22, seed=3):
    n, hop = 1024, 256
    win = np.hanning(n)
    pad = np.concatenate([np.zeros(n), x, np.zeros(n)])
    o, norm = np.zeros(len(pad)), np.zeros(len(pad))
    rng = np.random.default_rng(seed)
    f = np.fft.rfftfreq(n, 1 / sr)
    tilt = np.clip((f - 120) / 500, 0.15, 1) * (1 + 0.6 * np.exp(-((f - 4200) / 1800) ** 2))
    lift = int(1.2e-3 * sr)
    for i in range(0, len(pad) - n, hop):
        mag = np.abs(np.fft.rfft(pad[i:i + n] * win)) + 1e-7
        cep = np.fft.irfft(np.log(mag))
        cep[lift:-lift] = 0
        e = np.exp(np.fft.rfft(cep).real) * tilt
        e *= np.sqrt(np.sum(mag ** 2) / (np.sum(e ** 2) + 1e-12))
        o[i:i + n] += np.fft.irfft(e * np.exp(1j * rng.uniform(0, 2 * np.pi, len(e))), n) * win
        norm[i:i + n] += win ** 2
    w = (o / np.maximum(norm, 1e-6))[n:n + len(x)]
    return w * (1 - keep) + x * keep


entries = []


def median_f0(a, sr):
    """Median pitch (Hz) of the voiced frames, by autocorrelation."""
    n, hop, f0 = int(0.04 * sr), int(0.01 * sr), []
    lo, hi = int(sr / 350), int(sr / 70)
    thr = 0.1 * np.max(np.abs(a))
    for i in range(0, len(a) - n, hop):
        fr = a[i:i + n] - np.mean(a[i:i + n])
        if np.max(np.abs(fr)) < thr:
            continue
        ac = np.correlate(fr, fr, "full")[n - 1:]
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.45 * ac[0]:
            f0.append(sr / k)
    return float(np.median(f0)) if f0 else 0.0


def add(name, desc, audio_sr):
    a, sr = audio_sr
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.9
    k = len(entries) + 1
    sf.write(f"{out}/{k:02d}.wav", a, sr, subtype="PCM_16")
    f0 = median_f0(a, sr)
    if not desc:
        desc = "voix grave" if f0 < 120 else "voix médium" if f0 < 175 else "voix aiguë" if f0 < 240 else "voix très aiguë"
    entries.append({"n": k, "name": name, "desc": desc, "f0": round(f0)})
    print(k, name, round(f0), flush=True)


for sid, name, desc in [(k, f"Supertonic · {'Femme' if k < 5 else 'Homme'} {k % 5 + 1}", "") for k in range(10)]:
    add(name, desc, best_supertonic(sid))
add("Kokoro · Siwis (femme)", "", kokoro())
add("Piper · Tom (homme)", "", piper("fr_FR-tom-medium"))
add("Piper · Jessica (femme)", "", piper("fr_FR-upmc-medium", 0))
add("Piper · Pierre (homme)", "", piper("fr_FR-upmc-medium", 1))
add("Piper · Miro (homme)", "", piper("fr_FR-miro-high"))
add("Piper · Gilles (homme)", "", piper("fr_FR-gilles-low"))

# styles of the house voice (the one in the videos)
base = best_supertonic(9, 1.071)
add("Voix des vidéos", "Homme 5 + traitement narrateur (grave, chaud)", house(*base))
add("Voix des vidéos · chuchotée", "pour les questions intimes", house(whisperize(base[0], base[1]) * 0.85, base[1]))
add("Voix des vidéos · plus grave", "deux tons et demi plus bas", house(*base, semis=-2.5))
add("Voix des vidéos · plus claire", "un ton et demi plus haut", house(*base, semis=0.5))
add("Voix des vidéos · lente et posée", "documentaire, suspense", house(*best_supertonic(9, 0.9)))
add("Voix des vidéos · énergique", "rythme rapide, plus de présence", house(*best_supertonic(9, 1.28), extra="equalizer=f=3500:t=q:w=1.0:g=3"))
add("Voix des vidéos · radio", "effet poste de radio / téléphone", house(*base, extra="highpass=f=350,lowpass=f=3400,acrusher=bits=10:mix=0.25"))
add("Voix des vidéos · grande salle", "écho de cathédrale", house(*base, extra="aecho=0.8:0.7:60|140|260:0.35|0.25|0.18"))
json.dump({"line": LINE, "entries": entries}, open(f"{out}/catalog.json", "w"), ensure_ascii=False, indent=1)
