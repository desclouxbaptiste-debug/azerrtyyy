// Dark "true story" look for narrated videos (classic script, load after story.js, before the scene).
// A folder holding a dark cut sets window.DARK_OPTS before loading the original scene.js: startStory() merges it into
// the scene's options. The picture is graded down and desaturated, with film grain, floating dust, a flickering light,
// a slow push-in on every shot, blurred fades through black between shots and a flash + deep impact on each reveal
// (the <r> sentences of the script, listed in timings.json "reveals").
const DARK = { flashes: [], dust: null, grains: null };

function darkSetup(opts) {
  DARK.dust = darkDust(opts.dust ?? 70, 4);
  DARK.grains = makeGrain(8, 41);
  for (const tr of T.reveals || []) {
    DARK.flashes.push(tr);
    PUNCH.push({ t: tr, z: 0.06, sh: 5 });
    sfx(tr - 0.03, "impact_deep", { gain: opts.impactGain ?? 0.9 });
  }
  T.segments.forEach((s, i) => { if (i) sfx(s.start - 0.45, "dark_whoosh", { gain: 0.35, dur: 0.7 }); });
}

function darkDust(n, seed) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 1.2, ph: r() * 6.28, sp: 5 + r() * 14, a: 0.05 + r() * 0.22 }));
}

// light level: small frame-to-frame jitter plus a short stutter now and then (deterministic)
function darkFlicker(t, frame) {
  let f = 0.95 + 0.05 * rng(frame * 13 + 7)();
  const win = Math.floor(t / 1.7), r = rng(win * 31 + 5);
  if (r() < 0.4) {
    const at = win * 1.7 + 0.2 + r() * 1.2, d = t - at;
    if (d > 0 && d < 0.2) f *= d < 0.05 || (d > 0.1 && d < 0.14) ? 0.72 : 0.9;
  }
  return f;
}

function renderDark(t, opts) {
  const frame = Math.round(t * FPS);
  let i = ORDER.findIndex(id => t < SEG[id].next);
  if (i < 0) i = ORDER.length - 1;
  const s = SEG[ORDER[i]];
  const { z, sh } = punchAt(t);
  // fade the shot down to black (and blurred) just before a cut, and up again just after it
  const half = 0.24;
  let k = 0;
  if (i > 0) k = Math.max(k, 1 - (t - s.start) / half);
  if (i < ORDER.length - 1) k = Math.max(k, 1 - (s.next - t) / half);
  k = easeInOut(clamp(k));

  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const push = 1 + 0.06 * easeInOut(prog(t, s.start, s.next));
  ctx.translate(W / 2 + Math.sin(t * 87) * sh, 820 + Math.cos(t * 71) * sh); ctx.scale(push * (1 + z), push * (1 + z)); ctx.translate(-W / 2, -820);
  drawShot(i, t);
  ctx.restore();

  // grade: darker, contrasty, desaturated, slightly cold; blur through the cuts
  const fl = darkFlicker(t, frame);
  const b = snapshot();
  ctx.save();
  ctx.filter = `brightness(${(0.8 * fl).toFixed(3)}) contrast(1.2) saturate(0.6) sepia(0.12)` + (k > 0.01 ? ` blur(${(16 * k).toFixed(1)}px)` : "");
  ctx.drawImage(b, 0, 0);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(196,210,228)"; ctx.fillRect(0, 0, W, H); ctx.restore();

  // dust caught in the light
  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (const d of DARK.dust) {
    const x = ((d.x + Math.sin(t * 0.3 + d.ph) * 40 * d.z + t * d.sp * 0.5) % (W + 40) + W + 40) % (W + 40) - 20;
    const y = ((d.y - t * d.sp * d.z) % (H + 40) + H + 40) % (H + 40) - 20;
    const r = 1.5 + d.z * 3.2, a = d.a * (0.6 + 0.4 * Math.sin(t * 1.7 + d.ph)) * fl;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, `rgba(255,240,215,${a.toFixed(3)})`); g.addColorStop(1, "rgba(255,240,215,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  }
  ctx.restore();

  vignette(0.82, 0.26);
  if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${k.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }

  // flash on reveals
  for (const tr of DARK.flashes) if (t >= tr - 0.02 && t < tr + 0.6) {
    ctx.fillStyle = `rgba(255,250,240,${(0.6 * Math.exp(-(t - tr) * 8)).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  chrome(t, s.id);
  drawCaptions(CARDS, t, { y: 1420, size: 74, maxW: 900, style: "box", accent: COL.gold, keyColor: w => (opts.keyRegex && opts.keyRegex.test(w) ? COL.gold : null) });

  // film: grain that changes every frame, and a stray scratch now and then
  const r = rng(frame * 7 + 3);
  ctx.save(); ctx.globalAlpha = 0.12; ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(DARK.grains[frame % DARK.grains.length], -r() * 160, -r() * 280, W + 320, H + 560); ctx.restore();
  const sw = Math.floor(t / 2.3), sr = rng(sw * 17 + 1);
  if (sr() < 0.5 && t - sw * 2.3 < 0.25) { ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(sr() * W, 0, 2, H); }

  const e = prog(t, DURATION - 0.6, DURATION);
  if (e > 0) { ctx.fillStyle = `rgba(0,0,0,${e})`; ctx.fillRect(0, 0, W, H); }
}

// time at which a word (same matching as wt) finishes being spoken
function wtEnd(id, needle, fb = 0) {
  const t0 = wt(id, needle, -1);
  for (const s of SEG[id].sentences) for (const w of s.words) if (w.s === t0) return w.e;
  return SEG[id].start + fb;
}
