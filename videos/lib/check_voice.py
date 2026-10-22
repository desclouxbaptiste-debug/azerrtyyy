"""Transcribes every narrated sentence with Whisper (sherpa-onnx) and flags words the TTS mangled.
Usage: tts/bin/python check_voice.py <folder> <whisper_model_dir>
Model: sherpa-onnx-whisper-small (github.com/k2-fsa/sherpa-onnx releases, asr-models).
"""
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher

import numpy as np
import sherpa_onnx
from num2words import num2words
import soundfile as sf

folder, m = sys.argv[1], sys.argv[2]
rec = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=f"{m}/small-encoder.int8.onnx", decoder=f"{m}/small-decoder.int8.onnx", tokens=f"{m}/small-tokens.txt",
    language="fr", task="transcribe", num_threads=4)
audio, sr = sf.read(f"{folder}/voice.wav", dtype="float32")
tim = json.load(open(f"{folder}/timings.json"))


def norm(s):
    s = s.replace("%", " pour cent ")
    s = re.sub(r"\d+", lambda m: " " + num2words(int(m.group()), lang="fr") + " ", s)
    s = unicodedata.normalize("NFD", s.lower().replace("-", " "))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]", " ", s).split()


scores = []
for seg in tim["segments"]:
    for st in seg["sentences"]:
        a = audio[int(st["start"] * sr): int(st["end"] * sr)]
        s = rec.create_stream()
        s.accept_waveform(sr, np.ascontiguousarray(a))
        rec.decode_stream(s)
        ratio = SequenceMatcher(None, norm(st.get("spoken", st["text"])), norm(s.result.text)).ratio()
        scores.append(ratio)
        flag = "OK " if ratio > 0.85 else "!! "
        print(f"{flag}{ratio:.2f} | {st['text']}\n       heard: {s.result.text.strip()}")
print(f"mean similarity {np.mean(scores):.3f}")
