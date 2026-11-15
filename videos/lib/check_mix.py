"""Is the voice always above the bed? Rebuilds the mix of <folder>/out/sfx.json with audio.py's "stems" option (the bed and the
voice alone, at the levels they have in the mix) and compares them 50 ms at a time; also says how far the heartbeats
("coeur" cues) stand out of the bed between 150 and 500 Hz, the range a phone speaker plays.
Usage: python lib/check_mix.py <folder> [heartbeat gain to try]"""
import json, subprocess, sys, os, tempfile, numpy as np, soundfile as sf
d = sys.argv[1]; S = tempfile.mkdtemp(); LIB = os.path.dirname(os.path.abspath(__file__))
c = json.load(open(f"{d}/out/sfx.json")); c["stems"] = True
if len(sys.argv) > 2:
    for e in c["events"]:
        if e["type"] == "coeur": e["gain"] = float(sys.argv[2])
json.dump(c, open(f"{S}/stems.json", "w"))
subprocess.run([sys.executable, f"{LIB}/audio.py", f"{S}/stems.json", f"{S}/stems.wav"], check=True)
f, sr = sf.read(f"{S}/stems_fond.wav"); v, _ = sf.read(f"{S}/stems_voix.wav"); f = f.mean(1); v = v.mean(1)
w = int(sr * 0.05); rms = lambda x: np.sqrt(np.convolve(x ** 2, np.ones(w) / w, "valid")[::w]) + 1e-9
rf, rv = 20 * np.log10(rms(f)), 20 * np.log10(rms(v)); act = rv > -32
print("voix active : médiane %.1f dB ; fond sous la voix : médiane %.1f dB, max %.1f dB" % (np.median(rv[act]), np.median(rf[act]), rf[act].max()))
m = rv[act] - rf[act]; print("écart voix - fond pendant la voix : médiane %.1f dB, minimum %.1f dB" % (np.median(m), m.min()))
fort = rv > np.median(rv[act]) - 8; mf = rv[fort] - rf[fort]
print("fenêtres de voix où le fond dépasse la voix : %.2f %% (toutes), %.2f %% (voix à moins de 8 dB de sa médiane ; écart mini %.1f dB)" % (100 * np.mean(m < 0), 100 * np.mean(mf < 0), mf.min()))
w2 = int(sr * 0.4); r2 = lambda x: 20 * np.log10(np.sqrt(np.convolve(x ** 2, np.ones(w2) / w2, "valid")[::w]) + 1e-9)
print("niveau du fond sur 0,4 s : max %.1f dB ; voix sur 0,4 s : médiane %.1f dB" % (r2(f).max(), np.median(r2(v)[r2(v) > -40])))
print("fond hors voix : médiane %.1f dB, max %.1f dB" % (np.median(rf[~act][rf[~act] > -100]), rf[~act].max()))
beats = [e["t"] for e in c["events"] if e["type"] == "coeur"]
from numpy.fft import rfft, rfftfreq
def bande(x, lo, hi):
    X = rfft(x); fr = rfftfreq(len(x), 1 / sr); X[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(X, len(x))
fb = bande(f, 150, 500); rb = 20 * np.log10(rms(fb))
sur = np.array([rb[int((b + 0.03) / 0.05)] for b in beats if int((b + 0.03) / 0.05) < len(rb)])
print("%d battements ; niveau 150-500 Hz sur les battements : médiane %.1f dB (fond entier 150-500 Hz : médiane %.1f dB)" % (len(beats), np.median(sur), np.median(rb[rb > -100])))
