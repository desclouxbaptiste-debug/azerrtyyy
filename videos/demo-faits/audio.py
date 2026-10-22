"""Synthesises the soundtrack: a 125 BPM beat (Am-F-C-G) plus sound effects
placed at the times scene.html exports in sfx.json.
Usage: python3 audio.py sfx.json out.wav
"""
import json
import sys
import wave

import numpy as np

SR = 44100
DUR = 30.0
BEAT = 0.48
HOOK_END = 6 * BEAT
N = int(SR * DUR)
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def onepole_lp(x, cutoff):
    """One-pole lowpass; cutoff may be a scalar or a per-sample array."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def bandpass_sweep(x, f0, f1, q=1.5):
    """State-variable bandpass with an exponential centre-frequency sweep."""
    f = f0 * (f1 / f0) ** np.linspace(0, 1, len(x))
    y = np.empty_like(x)
    low = band = 0.0
    for i in range(len(x)):
        g = 2 * np.sin(np.pi * min(f[i], SR / 6) / SR)
        high = x[i] - low - band / q
        band += g * high
        low += g * band
        y[i] = band
    return y


def add(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def saw(freq, t):
    return 2 * ((freq * t) % 1) - 1


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------- instruments ----------
def kick():
    t = t_axis(0.42)
    f = 48 + 120 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) + rng.normal(0, 1, len(t)) * np.exp(-t * 300) * 0.25


def clap():
    t = t_axis(0.3)
    n = rng.normal(0, 1, len(t))
    n = n - onepole_lp(n, 1200)
    env = np.exp(-t * 18)
    for d in (0.0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 120), 0) * 0.8
    return n * env * 0.5


def hat(open_=False):
    t = t_axis(0.25 if open_ else 0.06)
    n = rng.normal(0, 1, len(t))
    n = n - onepole_lp(n, 7000)
    return n * np.exp(-t * (14 if open_ else 70)) * 0.35


PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # Am F C G
ARP = [0, 1, 2, 1, 2, 0, 1, 2]


def music():
    L = np.zeros(N)
    R = np.zeros(N)
    beats = int(DUR / BEAT) + 1
    k, c, h, ho = kick(), clap(), hat(), hat(True)
    side = np.ones(N)
    for b in range(beats):
        tb = b * BEAT
        add(L, k, tb, 0.95); add(R, k, tb, 0.95)
        i = int(tb * SR)
        dip = 1 - 0.75 * np.exp(-t_axis(BEAT) * 14)
        side[i:i + len(dip)] = np.minimum(side[i:i + len(dip)], dip[: max(0, min(len(dip), N - i))])
        if tb >= HOOK_END:
            if b % 2 == 1:
                add(L, c, tb, 0.55); add(R, c, tb, 0.6)
            add(L, h, tb + BEAT / 2, 0.5); add(R, h, tb + BEAT / 2, 0.6)
            if b % 4 == 3:
                add(R, ho, tb + BEAT * 0.75, 0.3)

    t = np.arange(N) / SR
    bass = np.zeros(N)
    pad = np.zeros(N)
    arp = np.zeros(N)
    chord_len = 8 * BEAT
    for ci in range(int(DUR / chord_len) + 1):
        root, notes = PROG[ci % 4]
        t0 = ci * chord_len
        seg = t_axis(chord_len)
        # rolling eighth-note bass
        for e in range(16):
            et = t_axis(BEAT / 2)
            env = np.exp(-et * 6)
            add(bass, (saw(midi(root - 24), et) * 0.6 + np.sin(2 * np.pi * midi(root - 24) * et)) * env, t0 + e * BEAT / 2)
        # detuned pad
        p = sum(saw(midi(n) * d, seg) for n in notes for d in (0.997, 1.003)) / 6
        add(pad, p * np.minimum(1, seg * 4) * np.minimum(1, (chord_len - seg) * 8), t0)
        # sixteenth-ish pluck arpeggio, an octave up
        for e in range(16):
            n = notes[ARP[e % 8]] + 12 + (12 if e % 8 == 6 else 0)
            et = t_axis(0.2)
            add(arp, (np.sin(2 * np.pi * midi(n) * et) + 0.3 * saw(midi(n), et)) * np.exp(-et * 22), t0 + e * BEAT / 2)

    bass = onepole_lp(bass, 380)
    pad = onepole_lp(pad, 1800)
    # hook = filtered intro, full drop on the first fact
    open_ = np.where(t < HOOK_END, 500 + 1500 * (t / HOOK_END) ** 2, 9000)
    pad = onepole_lp(pad, open_)
    arp_f = onepole_lp(arp, open_)
    L += (bass * 0.55 + pad * 0.16) * side + arp_f * 0.12
    R += (bass * 0.55 + pad * 0.16) * side + np.roll(arp_f, int(0.012 * SR)) * 0.12
    return L, R


# ---------- sound effects ----------
def sfx(kind):
    if kind in ("impact", "impact_small"):
        t = t_axis(1.0)
        f = 30 + 70 * np.exp(-t * 10)
        boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
        crack = rng.normal(0, 1, len(t)) * np.exp(-t * 35)
        crack = crack - onepole_lp(crack, 2500)
        s = boom * 0.9 + crack * 0.45
        return s * (0.55 if kind == "impact_small" else 1.0)
    if kind == "whoosh":
        t = t_axis(0.5)
        n = rng.normal(0, 1, len(t))
        env = np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 2
        return bandpass_sweep(n, 300, 6000, 2.5) * env * 0.9
    if kind in ("pop", "pop_hi"):
        t = t_axis(0.08)
        f0 = 1300 if kind == "pop_hi" else 850
        f = f0 * (1 - 0.4 * t / 0.08)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55) * (0.32 if kind == "pop_hi" else 0.2)
    if kind == "rise":
        t = t_axis(0.9)
        f = 300 * 4 ** (t / 0.9)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / 0.9) ** 2 * 0.12
    if kind == "ding":
        t = t_axis(1.2)
        s = sum(a * np.sin(2 * np.pi * 1568 * m * t) * np.exp(-t * d) for m, a, d in ((1, 1, 4), (2.76, 0.4, 7), (5.4, 0.2, 11)))
        return s * 0.16
    raise ValueError(kind)


def main(sfx_path, out_path):
    L, R = music()
    cache = {}
    for e in json.load(open(sfx_path)):
        s = cache.setdefault(e["type"], sfx(e["type"]))
        add(L, s, max(0.0, e["t"]), 0.9)
        add(R, s, max(0.0, e["t"]), 0.9)
    # end on a short fade so the loop back to "STOP" doesn't click
    tail = int(0.05 * SR)
    fade = np.linspace(1, 0, tail)
    L[-tail:] *= fade
    R[-tail:] *= fade
    mix = np.stack([L, R], axis=1)
    mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) * 0.93  # gentle soft-clip "mastering"
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
