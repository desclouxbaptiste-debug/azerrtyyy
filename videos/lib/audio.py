"""Soundtrack synthesiser shared by every video.

Reads the cue file written by render.mjs:
  {"duration": 30, "music": {"style": "lofi", "bpm": 88, ...}, "events": [{"t": 1.2, "type": "pop"}, ...]}
and writes a 44.1 kHz stereo WAV. Everything is generated with numpy (no samples, no licences).
Usage: python3 audio.py cues.json out.wav
"""
import json
import sys
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- helpers
def t_axis(sec):
    return np.arange(max(1, int(SR * sec))) / SR


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def saw(f, t):
    return 2 * ((f * t) % 1) - 1


def square(f, t):
    return np.sign(np.sin(2 * np.pi * f * t))


def tri(f, t):
    return 2 * np.abs(saw(f, t)) - 1


def sweep_phase(f):
    return 2 * np.pi * np.cumsum(f) / SR


def noise(sec):
    return rng.uniform(-1, 1, int(SR * sec))


def _fft_gain(n, fc, order, high):
    f = np.fft.rfftfreq(n, 1 / SR)
    g = 1 / np.sqrt(1 + (f / max(fc, 1)) ** (2 * order))
    return np.sqrt(1 - g**2) if high else g


def lp(x, fc, order=2):
    """Zero-phase Butterworth-shaped lowpass done in the frequency domain."""
    return np.fft.irfft(np.fft.rfft(x) * _fft_gain(len(x), fc, order, False), len(x))


def hp(x, fc, order=2):
    return np.fft.irfft(np.fft.rfft(x) * _fft_gain(len(x), fc, order, True), len(x))


def bp(x, lo, hi):
    return hp(lp(x, hi), lo)


def lp_sweep(x, f0, f1, res=0.0):
    """State-variable lowpass with an exponential cutoff sweep (short sounds only)."""
    f = f0 * (f1 / f0) ** np.linspace(0, 1, len(x))
    y = np.empty_like(x)
    low = band = 0.0
    q = 1 / (0.7 + res * 4)
    for i in range(len(x)):
        g = 2 * np.sin(np.pi * min(f[i], SR / 6) / SR)
        band += g * (x[i] - low - q * band)
        low += g * band
        y[i] = low
    return y


def bp_sweep(x, f0, f1, q=2.0):
    f = f0 * (f1 / f0) ** np.linspace(0, 1, len(x))
    y = np.empty_like(x)
    low = band = 0.0
    for i in range(len(x)):
        g = 2 * np.sin(np.pi * min(f[i], SR / 6) / SR)
        band += g * (x[i] - low - band / q)
        low += g * band
        y[i] = band
    return y


def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.1):
    t = np.arange(n) / SR
    dur = n / SR
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((dur - t) / r, 0, 1) if r > 0 else 1
    return e * rel


def add(buf, sig, at, gain=1.0):
    i = int(round(at * SR))
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def reverb(x, seconds=1.8, mix=0.25, seed=1, damp=4000):
    """Convolution reverb with a synthetic exponentially decaying noise tail."""
    r = np.random.default_rng(seed)
    n = int(SR * seconds)
    ir = r.uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * 6.9 / seconds)
    ir = lp(ir, damp)
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir**2))
    m = len(x) + n
    wet = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x)]
    return x * (1 - mix) + wet * mix * 3


def ks_pluck(freq, dur, decay=0.995, bright=0.6):
    """Karplus-Strong plucked string, vectorised one period at a time."""
    p = max(2, int(SR / freq))
    n = int(dur * SR) + p
    y = np.zeros(n)
    exc = rng.uniform(-1, 1, p)
    y[:p] = exc * bright + np.convolve(exc, np.ones(4) / 4, "same") * (1 - bright)
    for s in range(p, n, p):
        seg = y[s - p:s]
        prev = np.concatenate(([y[s - p - 1] if s - p - 1 >= 0 else 0.0], seg[:-1]))
        k = min(p, n - s)
        y[s:s + k] = (decay * 0.5 * (seg + prev))[:k]
    return y[p:]


# ---------------------------------------------------------------- drums
def kick(f_hi=160, f_lo=48, decay=7.5, click=0.25, dur=0.45):
    t = t_axis(dur)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 28)
    return np.sin(sweep_phase(f)) * np.exp(-t * decay) + rng.normal(0, 1, len(t)) * np.exp(-t * 300) * click


def snare(tone=190, decay=16, bright=1500, dur=0.3):
    t = t_axis(dur)
    n = hp(rng.normal(0, 1, len(t)), bright) * np.exp(-t * decay)
    return (n * 0.7 + np.sin(2 * np.pi * tone * t) * np.exp(-t * 30) * 0.5) * 0.6


def clap():
    t = t_axis(0.3)
    n = bp(rng.normal(0, 1, len(t)), 900, 5000)
    e = np.exp(-t * 18)
    for d in (0.0, 0.011, 0.022):
        e = e + np.where(t >= d, np.exp(-(t - d) * 120), 0) * 0.8
    return n * e * 0.5


def hat(open_=False, cut=7000):
    t = t_axis(0.25 if open_ else 0.06)
    return hp(rng.normal(0, 1, len(t)), cut) * np.exp(-t * (14 if open_ else 70)) * 0.35


def shaker():
    t = t_axis(0.09)
    return bp(rng.normal(0, 1, len(t)), 4000, 11000) * np.sin(np.pi * t / 0.09) ** 2 * 0.25


def gated_snare():
    """80s gated-reverb snare."""
    s = np.concatenate([snare(tone=200, decay=9, bright=900, dur=0.4), np.zeros(int(0.6 * SR))])
    wet = reverb(s, 1.4, 0.7, seed=3)[: int(0.32 * SR)]
    wet[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return wet


# ---------------------------------------------------------------- tones
def epiano(f, dur):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.1 * np.sin(6 * np.pi * f * t) * np.exp(-t * 9)
    return s * np.exp(-t * 1.6) * (1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)) * env_adsr(len(t), 0.004, 10, 1, 0.08)


def piano(f, dur):
    t = t_axis(dur)
    s = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.2 + h * 0.9)) for h, a in ((1, 1), (2, 0.45), (3, 0.2), (4, 0.1)))
    return s * env_adsr(len(t), 0.003, 10, 1, 0.2)


def bell(f, dur=1.2):
    t = t_axis(dur)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in ((1, 1, 4), (2.76, 0.4, 7), (5.4, 0.2, 11)))


def supersaw(notes, dur, detune=(0.994, 1.0, 1.006)):
    t = t_axis(dur)
    return sum(saw(midi(n) * d, t + rng.uniform(0, 1)) for n in notes for d in detune) / (len(notes) * len(detune))


def sub808(f, dur, glide_from=None):
    t = t_axis(dur)
    fr = np.full(len(t), f) if glide_from is None else f + (glide_from - f) * np.exp(-t * 18)
    s = np.sin(sweep_phase(fr))
    return np.tanh(s * 1.8) * np.exp(-t * 1.6) * env_adsr(len(t), 0.002, 10, 1, 0.05)


# ---------------------------------------------------------------- music styles
def _sidechain(n, hits, depth=0.7, speed=12, beat=0.5):
    g = np.ones(n)
    d = 1 - depth * np.exp(-t_axis(beat) * speed)
    for h in hits:
        i = int(h * SR)
        if i >= n:
            continue
        k = min(len(d), n - i)
        g[i:i + k] = np.minimum(g[i:i + k], d[:k])
    return g


def style_lofi(n, cfg):
    beat = 60 / cfg.get("bpm", 88)
    bar = 4 * beat
    chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]  # Fmaj7 Em7 Dm7 Cmaj7
    keys, bass, drums = np.zeros(n), np.zeros(n), np.zeros(n)
    k, s, h = kick(120, 45, 9, 0.05), snare(170, 22, 2500), hat(cut=6000)
    swing = beat * 0.58
    for b in range(int(n / SR / bar) + 1):
        t0 = b * bar
        ch = chords[b % 4]
        for off, dur, g in ((0, bar * 0.95, 0.5), (2 * beat + swing, beat * 1.2, 0.3)):
            for i, note in enumerate(ch):
                add(keys, epiano(midi(note), dur), t0 + off + i * 0.012, g)
        add(bass, np.sin(2 * np.pi * midi(ch[0] - 24) * t_axis(beat * 1.8)) * env_adsr(int(beat * 1.8 * SR), 0.01, 0.5, 0.6, 0.1), t0, 0.8)
        add(bass, np.sin(2 * np.pi * midi(ch[0] - 24) * t_axis(beat * 1.2)) * env_adsr(int(beat * 1.2 * SR), 0.01, 0.4, 0.5, 0.1), t0 + 2 * beat + swing, 0.6)
        if t0 >= cfg.get("drop", 0):
            add(drums, k, t0, 0.8); add(drums, k, t0 + 2 * beat + swing, 0.6)
            add(drums, s, t0 + beat, 0.45); add(drums, s, t0 + 3 * beat, 0.45)
            for e in range(4):
                add(drums, h, t0 + e * beat, 0.25); add(drums, h, t0 + e * beat + swing, 0.15)
    keys = lp(reverb(keys, 2.2, 0.3), 4500)
    crackle = np.zeros(n)
    pos = rng.integers(0, n, int(n / SR * 9))
    crackle[pos] = rng.uniform(-1, 1, len(pos))
    crackle = hp(crackle, 1500) * 0.4 + lp(rng.normal(0, 1, n), 5000) * 0.005
    mix = keys * 0.42 + bass * 0.5 + lp(drums, 7000) * 0.9 + crackle
    return mix, mix.copy()


def style_trap(n, cfg):
    beat = 60 / cfg.get("bpm", 110)
    bar = 4 * beat
    drop = cfg.get("drop", 0)
    roots = [36, 32, 39, 31]  # C Ab Eb G
    pads = [[60, 63, 67], [56, 60, 63], [55, 58, 63], [55, 59, 62]]
    melody = [72, 75, 79, 77, 75, 72, 70, 72]
    drums, sub, pad, mel = np.zeros(n), np.zeros(n), np.zeros(n), np.zeros(n)
    k, c, h = kick(150, 50, 10, 0.3, 0.3), clap(), hat(cut=8000)
    hits = []
    for b in range(int(n / SR / bar) + 1):
        t0 = b * bar
        r = roots[b % 4]
        add(pad, supersaw(pads[b % 4], bar), t0, 1)
        for i in range(4):
            add(mel, bell(midi(melody[(b * 4 + i) % 8]), 1.0), t0 + i * beat, 0.25 if i % 2 == 0 else 0.15)
        if t0 < drop:
            continue
        for off, ln, glide in ((0, 1.5, None), (2.5 * beat, 1.2, midi(r + 5))):
            add(sub, sub808(midi(r), ln * beat * 1.4, glide), t0 + off, 0.9)
            add(drums, k, t0 + off, 0.9)
            hits.append(t0 + off)
        add(drums, c, t0 + 2 * beat, 0.8)
        roll = b % 2 == 1
        for e in range(8):
            add(drums, h, t0 + e * beat / 2, 0.35)
        if roll:
            for e in range(6):
                add(drums, h, t0 + 3 * beat + e * beat / 6, 0.25 + e * 0.03)
    side = _sidechain(n, hits, 0.6, 8, beat)
    pad = lp(pad, 900) * side
    t = np.arange(n) / SR
    open_ = np.clip((t - drop + 2) / 2, 0, 1)
    mel = reverb(mel, 2.5, 0.4)
    mixL = drums * 0.9 + sub * 0.7 + pad * (0.18 + 0.08 * open_) + mel
    mixR = drums * 0.9 + sub * 0.7 + pad * (0.18 + 0.08 * open_) + np.roll(mel, int(0.015 * SR))
    return mixL, mixR


def style_synthwave(n, cfg):
    beat = 60 / cfg.get("bpm", 105)
    bar = 4 * beat
    drop = cfg.get("drop", 0)
    prog = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]  # Dm Bb F C
    drums, bass, pad, arp = np.zeros(n), np.zeros(n), np.zeros(n), np.zeros(n)
    k, s, h = kick(140, 50, 8, 0.2), gated_snare(), hat(cut=9000)
    hits = []
    for b in range(int(n / SR / (2 * bar)) + 1):
        t0 = b * 2 * bar
        root, ch = prog[b % 4]
        add(pad, supersaw(ch + [ch[0] + 12], 2 * bar) * env_adsr(int(2 * bar * SR), 0.4, 10, 1, 0.3), t0, 1)
        for e in range(16):
            tt = t0 + e * beat / 2
            note = root - 12 if e % 2 == 0 else root
            add(bass, saw(midi(note), t_axis(beat / 2)) * np.exp(-t_axis(beat / 2) * 5), tt, 1)
        for e in range(32):
            note = (ch + [ch[0] + 12])[[0, 1, 2, 3, 2, 1, 0, 1][e % 8]] + 12
            add(arp, square(midi(note), t_axis(0.18)) * np.exp(-t_axis(0.18) * 16), t0 + e * beat / 4, 1)
        if t0 + 2 * bar <= drop:
            continue
        for q in range(8):
            tq = t0 + q * beat
            if tq < drop:
                continue
            add(drums, k, tq, 0.9); hits.append(tq)
            if q % 2 == 1:
                add(drums, s, tq, 0.7)
            for e in range(4):
                add(drums, h, tq + e * beat / 4, 0.12 if e % 2 else 0.2)
    side = _sidechain(n, hits, 0.5, 10, beat)
    t = np.arange(n) / SR
    pre = t < drop
    bass = lp(bass, 700) * side
    pad = lp(pad, 2400) * side
    arp_d = lp(arp, 2600)
    arp_d = arp_d + np.roll(arp_d, int(beat * 0.75 * SR)) * 0.45
    intro_filter = lp(pad + bass, 450)
    music = np.where(pre, intro_filter * 1.3, pad * 0.35 + bass * 0.45)
    mixL = drums * 0.85 + music + arp_d * 0.08
    mixR = drums * 0.85 + music + np.roll(arp_d, int(0.02 * SR)) * 0.08
    # cassette wobble
    wob = (1 + 0.004 * np.sin(2 * np.pi * 0.6 * t))
    idx = np.clip(np.cumsum(wob) - 1, 0, n - 1).astype(int)
    return mixL[idx], mixR[idx]


def style_cinematic(n, cfg):
    t = np.arange(n) / SR
    dur = n / SR
    chords = [[38, 50, 53, 57], [34, 46, 53, 58], [31, 43, 50, 55], [33, 45, 52, 57]]  # Dm Bb Gm A
    seg = dur / len(chords)
    pad = np.zeros(n)
    for i, ch in enumerate(chords):
        d = seg + 2
        s = supersaw(ch, d, (0.997, 1.003)) * env_adsr(int(d * SR), 1.5, 10, 1, 1.5)
        add(pad, s, i * seg - 0.5 if i else 0, 1)
    pad = lp(pad, 900)
    drone = lp(saw(midi(26), t) + saw(midi(26) * 1.005, t), 220) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t))
    pn = np.zeros(n)
    scale = [62, 65, 69, 67, 65, 64, 62, 57]
    r = np.random.default_rng(11)
    tt = 1.2
    while tt < dur - 2:
        add(pn, piano(midi(scale[r.integers(0, len(scale))] + 12), 3.0), tt, 0.5)
        tt += r.choice([1.2, 1.8, 2.4])
    pn = reverb(pn, 3.5, 0.5, seed=4)
    swell = np.clip(t / 3, 0, 1)
    mix = (pad * 0.35 + drone * 0.12) * swell + pn * 0.35
    mix = reverb(mix, 3.0, 0.25, seed=5)
    return mix, np.roll(mix, int(0.01 * SR))


UKE = {"C": [67, 60, 64, 72], "G": [67, 62, 71, 74], "Am": [69, 60, 64, 69], "F": [69, 60, 65, 69]}


def style_ukulele(n, cfg):
    beat = 60 / cfg.get("bpm", 112)
    bar = 4 * beat
    drop = cfg.get("drop", 0)
    prog = ["C", "G", "Am", "F"]
    roots = {"C": 48, "G": 43, "Am": 45, "F": 41}
    uke, bass, drums, glock = np.zeros(n), np.zeros(n), np.zeros(n), np.zeros(n)
    k, c, sh = kick(130, 55, 10, 0.1), clap(), shaker()
    melody = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 84, 81, 79, 76, 74, 72]
    for b in range(int(n / SR / bar) + 1):
        t0 = b * bar
        ch = prog[b % 4]
        for off, down in ((0, 1), (1, 1), (1.5, 0), (2.5, 0), (3, 1), (3.5, 0)):
            notes = UKE[ch] if down else UKE[ch][::-1]
            for i, nt in enumerate(notes):
                add(uke, ks_pluck(midi(nt), 0.9, 0.993, 0.5), t0 + off * beat + i * 0.011, 0.5 if down else 0.32)
        for off in (0, 2):
            add(bass, tri(midi(roots[ch]), t_axis(beat * 1.5)) * env_adsr(int(beat * 1.5 * SR), 0.01, 0.4, 0.6, 0.08), t0 + off * beat, 0.6)
        for i in range(4):
            add(glock, bell(midi(melody[(b * 4 + i) % 16]), 0.8), t0 + i * beat, 0.2)
        if t0 < drop:
            continue
        add(drums, k, t0, 0.8); add(drums, k, t0 + 2 * beat, 0.8)
        add(drums, c, t0 + beat, 0.5); add(drums, c, t0 + 3 * beat, 0.5)
        for e in range(8):
            add(drums, sh, t0 + e * beat / 2, 0.6 if e % 2 else 0.35)
    uke = reverb(lp(uke, 6000), 1.2, 0.18)
    glock = reverb(glock, 2.0, 0.35)
    mixL = uke * 0.55 + bass * 0.45 + drums * 0.8 + glock * 0.6
    mixR = np.roll(uke, int(0.008 * SR)) * 0.55 + bass * 0.45 + drums * 0.8 + glock * 0.45
    return mixL, mixR


def style_suspense(n, cfg):
    """Documentary tension bed: ticking clock, soft pulse bass, minor pad, sparse piano."""
    beat = 60 / cfg.get("bpm", 96)
    t = np.arange(n) / SR
    chords = [[45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]]  # Am F G E
    bar = 4 * beat
    pad, bass, tick, pn = np.zeros(n), np.zeros(n), np.zeros(n), np.zeros(n)
    tk = np.sin(2 * np.pi * 2400 * t_axis(0.025)) * np.exp(-t_axis(0.025) * 260) + hp(rng.normal(0, 1, int(0.025 * SR)), 3000) * np.exp(-t_axis(0.025) * 400) * 0.4
    tock = np.sin(2 * np.pi * 1700 * t_axis(0.03)) * np.exp(-t_axis(0.03) * 220)
    motif = [69, 72, 76, 74, 72, 71, 69, 68]
    for b in range(int(n / SR / bar) + 1):
        t0 = b * bar
        ch = chords[b % 4]
        add(pad, supersaw(ch[1:], bar + 0.5, (0.996, 1.004)) * env_adsr(int((bar + 0.5) * SR), 0.6, 10, 1, 0.6), t0, 1)
        for e in range(8):
            add(bass, np.sin(2 * np.pi * midi(ch[0] - 12) * t_axis(beat / 2)) * np.exp(-t_axis(beat / 2) * 7), t0 + e * beat / 2, 1 if e % 2 == 0 else 0.55)
        for q in range(4):
            add(tick, tk if q % 2 == 0 else tock, t0 + q * beat, 1)
        if b % 2 == 0:
            for i in range(2):
                add(pn, piano(midi(motif[(b + i * 3) % 8]), 2.5), t0 + i * 2 * beat, 0.6)
    pad = lp(pad, 1100)
    pn = reverb(pn, 3.0, 0.45, seed=6)
    swell = np.clip(t / 2, 0, 1)
    mixL = (pad * 0.3 + bass * 0.35) * swell + tick * 0.18 + pn * 0.3
    mixR = (pad * 0.3 + bass * 0.35) * swell + np.roll(tick, int(0.004 * SR)) * 0.18 + np.roll(pn, int(0.012 * SR)) * 0.3
    return mixL, mixR


STYLES = {"suspense": style_suspense, "lofi": style_lofi, "trap": style_trap, "synthwave": style_synthwave, "cinematic": style_cinematic, "ukulele": style_ukulele}


# ---------------------------------------------------------------- sound effects
def fx(kind, dur=None):
    if kind in ("impact", "impact_small"):
        t = t_axis(1.0)
        boom = np.sin(sweep_phase(30 + 70 * np.exp(-t * 10))) * np.exp(-t * 4)
        crack = hp(rng.normal(0, 1, len(t)), 2500) * np.exp(-t * 35)
        return (boom * 0.9 + crack * 0.45) * (0.55 if kind == "impact_small" else 1.0)
    if kind == "hit":
        t = t_axis(0.35)
        return np.sin(sweep_phase(45 + 110 * np.exp(-t * 30))) * np.exp(-t * 12) * 0.8 + hp(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 60) * 0.25
    if kind == "whoosh":
        t = t_axis(dur or 0.5)
        return bp_sweep(rng.normal(0, 1, len(t)), 300, 6000, 2.5) * np.sin(np.pi * t / t[-1]) ** 2 * 0.9
    if kind == "swish":
        t = t_axis(0.35)
        return bp_sweep(rng.normal(0, 1, len(t)), 600, 2500, 1.2) * np.sin(np.pi * t / t[-1]) ** 2 * 0.35
    if kind in ("pop", "pop_hi"):
        t = t_axis(0.08)
        f0 = 1300 if kind == "pop_hi" else 850
        return np.sin(sweep_phase(f0 * (1 - 0.4 * t / 0.08))) * np.exp(-t * 55) * (0.32 if kind == "pop_hi" else 0.2)
    if kind in ("tick", "click"):
        t = t_axis(0.03)
        f = 3200 if kind == "tick" else 1800
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 250) * 0.3 + hp(rng.normal(0, 1, len(t)), 4000) * np.exp(-t * 400) * 0.15
    if kind == "rise":
        t = t_axis(dur or 0.9)
        return np.sin(sweep_phase(300 * 4 ** (t / t[-1]))) * (t / t[-1]) ** 2 * 0.12
    if kind == "riser":
        t = t_axis(dur or 2.0)
        x = t / t[-1]
        return (bp_sweep(rng.normal(0, 1, len(t)), 400, 9000, 3) * 0.6 + saw(1, t) * 0) * x**2 * 0.8
    if kind == "ding":
        return bell(1568, 1.2) * 0.16
    if kind == "chime":
        return (bell(1047, 1.6) + bell(1568, 1.6) * 0.6) * 0.1
    if kind == "braam":
        t = t_axis(3.0)
        s = sum(saw(midi(n) * d, t) for n in (26, 38, 45) for d in (0.995, 1.005))
        s = lp_sweep(s / 6, 120, 900, 0.3)
        return np.tanh(s * 3) * env_adsr(len(t), 0.05, 1.2, 0.5, 1.2) * 0.6
    if kind == "boom":
        t = t_axis(2.5)
        return np.sin(sweep_phase(25 + 45 * np.exp(-t * 4))) * np.exp(-t * 2) * 0.9 + lp(rng.normal(0, 1, len(t)), 200) * np.exp(-t * 3) * 0.6
    if kind == "typewriter":
        t = t_axis(0.06)
        return bp(rng.normal(0, 1, len(t)), 1500, 5000) * np.exp(-t * 120) * 0.35 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 90) * 0.25
    if kind == "heartbeat":
        t = t_axis(0.7)
        thump = lambda d: np.where(t >= d, np.sin(2 * np.pi * 55 * (t - d)) * np.exp(-(t - d) * 18), 0)
        return lp(thump(0) + thump(0.22) * 0.75, 200) * 1.2
    if kind == "rumble":
        t = t_axis(dur or 4.0)
        return lp(rng.normal(0, 1, len(t)), 140) * env_adsr(len(t), 1.0, 10, 1, 1.0) * 1.4
    if kind == "rewind":
        t = t_axis(dur or 0.9)
        f = 900 + 700 * np.sin(2 * np.pi * 7 * t) * np.exp(-t)
        return (saw(1, t) * 0 + np.sin(sweep_phase(f)) * 0.15 + bp(rng.normal(0, 1, len(t)), 1500, 7000) * 0.35) * env_adsr(len(t), 0.02, 10, 1, 0.1)
    if kind == "static":
        t = t_axis(dur or 0.3)
        return hp(rng.normal(0, 1, len(t)), 1000) * 0.4 * env_adsr(len(t), 0.002, 10, 1, 0.05)
    if kind == "stab":
        t = t_axis(0.6)
        s = supersaw([62, 65, 69, 74], 0.6)
        return lp_sweep(s, 4000, 600) * np.exp(-t * 4) * 0.8
    if kind == "scribble":
        t = t_axis(dur or 0.6)
        am = np.abs(np.sin(2 * np.pi * (7 + 3 * np.sin(2 * np.pi * 1.3 * t)) * t)) ** 0.6
        return bp(rng.normal(0, 1, len(t)), 1800, 6000) * am * env_adsr(len(t), 0.02, 10, 1, 0.05) * 0.22
    if kind == "paper":
        t = t_axis(0.4)
        return bp_sweep(rng.normal(0, 1, len(t)), 2500, 800, 0.8) * np.sin(np.pi * t / t[-1]) ** 1.5 * 0.35
    if kind == "cough":
        t = t_axis(0.9)
        burst = lambda d, a: np.where(t >= d, np.exp(-(t - d) * 16) * (1 - np.exp(-(t - d) * 300)), 0) * a
        env = burst(0.0, 1.0) + burst(0.38, 0.8)
        return bp(rng.normal(0, 1, len(t)), 250, 2200) * env * 0.5 + np.sin(2 * np.pi * 140 * t) * env * 0.15
    if kind == "scratch":
        t = t_axis(0.35)
        return bp_sweep(rng.normal(0, 1, len(t)), 3000, 400, 3) * np.exp(-t * 6) * 0.8
    if kind == "kaching":
        t = t_axis(1.0)
        return (bell(2093, 1.0) + np.where(t > 0.08, np.roll(bell(2637, 1.0), int(0.08 * SR)), 0)) * 0.12 + hp(rng.normal(0, 1, len(t)), 5000) * np.exp(-t * 30) * 0.2
    raise ValueError(kind)


def main(cue_path, out_path):
    cues = json.load(open(cue_path))
    n = int(SR * cues["duration"])
    music = cues.get("music") or {}
    L, R = STYLES[music.get("style", "lofi")](n, music)
    L, R = L[:n], R[:n]
    mg = music.get("gain", 1.0)
    L, R = L * mg, R * mg
    fl, fr = np.zeros(n), np.zeros(n)
    cache = {}
    for e in cues["events"]:
        key = (e["type"], e.get("dur"))
        s = cache.get(key)
        if s is None:
            s = cache[key] = fx(e["type"], e.get("dur"))
        g = e.get("gain", 1.0) * 0.9
        pan = e.get("pan", 0.0)
        add(fl, s, e["t"], g * (1 - max(0, pan)))
        add(fr, s, e["t"], g * (1 + min(0, pan)))
    if music.get("sfx_reverb"):
        fl = reverb(fl, 2.0, music["sfx_reverb"], seed=8)
        fr = reverb(fr, 2.0, music["sfx_reverb"], seed=9)
    voice = cues.get("voice")
    if voice:
        v = load_voice(voice["path"], n)
        # duck music + effects while the narrator speaks
        env = lp(np.abs(v), 6, 1)
        env = np.clip(env / (np.max(env) * 0.25 + 1e-9), 0, 1)
        duck = 1 - voice.get("duck", 0.55) * env
        L, R, fl, fr = L * duck, R * duck, fl * (0.5 + 0.5 * duck), fr * (0.5 + 0.5 * duck)
        L, R = L + fl, R + fr
        peak = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
        bed = voice.get("bed", 0.3) / peak
        vg = voice.get("gain", 1.0) / max(np.max(np.abs(v)), 1e-9)
        mix = np.stack([L * bed + v * vg, R * bed + v * vg], axis=1)
        mix = np.tanh(mix / np.max(np.abs(mix)) * 1.1) / np.tanh(1.1) * 0.95
        write(out_path, mix)
        return
    L, R = L + fl, R + fr
    edge = int(0.04 * SR)
    for ch in (L, R):
        ch[:edge] *= np.linspace(0, 1, edge)
        ch[-edge:] *= np.linspace(1, 0, edge)
    mix = np.stack([L, R], axis=1)
    write(out_path, np.tanh(mix / np.max(np.abs(mix)) * 1.5) * 0.93)


def load_voice(path, n):
    """Mono narration WAV resampled to SR, cleaned with a gentle high-pass, padded/cut to n samples."""
    with wave.open(path) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype={2: np.int16, 4: np.int32}[sw]).astype(float)
    x = raw.reshape(-1, ch).mean(1)
    x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    x = hp(x, 90)
    out = np.zeros(n)
    out[: min(n, len(x))] = x[:n]
    return out


def write(out_path, mix):
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
