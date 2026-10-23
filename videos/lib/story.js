// Shared engine for narrated story videos (classic script, after core.js, icons.js, illus.js, narration.js).
// A video defines COL (palette), CHAPTERS {segmentId: label} and SHOT {segmentId: (seg, t) => draw},
// then calls startStory({...}). Timings come from timings.json (lib/tts.py), so visuals follow the voice.
const FPS = 30;
let T, SEG, CARDS, ORDER, DURATION;
const PUNCH = []; // keyword hits: the picture bumps in and shakes a little
const story = { grains: makeGrain(4, 23) };

// ---------------------------------------------------------------- helpers for shots
const pop = (t, t0, d = 0.35, k = 2) => easeOutBack(prog(t, t0, t0 + d), k);
const fade = (t, t0, d = 0.3) => easeOutCubic(prog(t, t0, t0 + d));
function camera(z, cx, cy, fn) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
function wt(id, word, fb = 0) { return wordTime(SEG[id], word, fb); }

function label(str, x, y, size, color, bg, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); const q = easeOutBack(clamp(p), 2); ctx.scale(q, q);
  ctx.font = `${size}px MontX`; ctx.letterSpacing = (o.spacing ?? 2) + "px";
  const w = ctx.measureText(str).width + size * 1.2, h = size * 1.7;
  ctx.fillStyle = bg; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 24; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, o.r ?? h / 2); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(str, 0, size * 0.05);
  ctx.restore();
}
function stamp(str, x, y, size, color, p, rot = -0.1) {
  if (p <= 0) return;
  const q = 1 + 1.4 * (1 - easeOutCubic(clamp(p * 1.4)));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(q, q); ctx.globalAlpha = clamp(p * 3);
  ctx.font = `${size}px MontX`; ctx.letterSpacing = "4px";
  const w = ctx.measureText(str).width + size, h = size * 1.5;
  ctx.strokeStyle = color; ctx.lineWidth = size * 0.1; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(str, 0, size * 0.06);
  ctx.restore();
}
function headline(str, y, size, color, t, t0, o = {}) {
  const p = easeOutExpo(prog(t, t0, t0 + 0.5)); if (p <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 0.8, W, size * 1.6); ctx.clip();
  txt(str, o.x ?? W / 2, y + (1 - p) * size * 1.3, size, "MontX", color, { spacing: o.spacing ?? 2, glow: o.glow, blur: 40, align: o.align || "center" });
  ctx.restore();
}
function spotlightBg(t, color = "#141A2E", base = "#0A0D18") {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 760, 0, W / 2, 760, 1050); g.addColorStop(0, color); g.addColorStop(1, base);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,.035)";
  for (let y = 0; y < H; y += 64) for (let x = (y / 64 % 2) * 32; x < W; x += 64) { ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.3) * 6, y, 2, 0, 6.29); ctx.fill(); }
}
// big number card: value counts up, caption under it
function bigStat(value, suffix, caption, x, y, size, color, t, t0, o = {}) {
  const p = prog(t, t0, t0 + (o.dur || 0.9)); if (p <= 0) return;
  const v = p > 0.97 ? value : value * easeOutExpo(p);
  const s = easeOutBack(clamp(p * 2.5), 2);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  txt(`${Math.round(v)}${suffix}`, 0, 0, size, "MontX", color, { glow: o.glow ?? color + "66", blur: 40 });
  if (caption) txt(caption, 0, size * 0.75, size * 0.28, "MontX", "rgba(255,255,255,.85)", { spacing: 2 });
  ctx.restore();
}
// two-option ending (comment bait)
function ctaButtons(t, s, a, b, ca, cb, y0 = 560) {
  const lt = t - s.start;
  [{ l: a, c: ca, y: y0 }, { l: b, c: cb, y: y0 + 230 }].forEach((o, i) => {
    const p = pop(t, s.start + 0.1 + i * 0.2); if (p <= 0) return;
    const hl = Math.floor(lt * 2.2) % 2 === i;
    ctx.save(); ctx.translate(W / 2, o.y); ctx.scale(p * (hl ? 1.05 : 1), p * (hl ? 1.05 : 1));
    ctx.fillStyle = hl ? o.c : "rgba(255,255,255,.08)"; ctx.strokeStyle = o.c; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(-420, -90, 840, 180, 90); ctx.fill(); ctx.stroke();
    txt(o.l, 0, 5, o.l.length > 14 ? 62 : 74, "MontX", hl ? "#151824" : o.c);
    ctx.restore();
  });
}
function sourceLine(str, y = 1225) { txt(str, W / 2, y, 25, "MontS", "rgba(255,255,255,.6)"); }

// ---------------------------------------------------------------- frame
function chrome(t, id) {
  ctx.save();
  ctx.font = "30px MontX"; ctx.letterSpacing = "3px";
  const lab = CHAPTERS[id] || "";
  const w = ctx.measureText(lab).width + 60;
  ctx.fillStyle = "rgba(10,12,22,.65)"; ctx.beginPath(); ctx.roundRect(60, 186, w, 56, 28); ctx.fill();
  ctx.fillStyle = COL.accent || "#FF4D4D"; ctx.beginPath(); ctx.arc(88, 214, 8, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(lab, 106, 216);
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.fillRect(60, 264, 960, 6);
  ctx.fillStyle = COL.gold; ctx.fillRect(60, 264, 960 * clamp(t / DURATION), 6);
}
function punchAt(t) {
  let z = 0, sh = 0;
  for (const p of PUNCH) if (t >= p.t && t < p.t + 0.5) { const k = Math.exp(-(t - p.t) * 9); z = Math.max(z, p.z * k); sh = Math.max(sh, p.sh * k); }
  return { z, sh };
}
function drawShot(i, t) { const s = SEG[ORDER[i]]; SHOT[s.id](s, Math.min(t, s.next)); }

function renderStory(t, opts) {
  const frame = Math.round(t * FPS);
  let i = ORDER.findIndex(id => t < SEG[id].next);
  if (i < 0) i = ORDER.length - 1;
  const s = SEG[ORDER[i]];
  const { z, sh } = punchAt(t);
  ctx.save();
  ctx.translate(W / 2 + Math.sin(t * 87) * sh, H / 2 + Math.cos(t * 71) * sh); ctx.scale(1 + z, 1 + z); ctx.translate(-W / 2, -H / 2);
  const tr = prog(t, s.start - 0.14, s.start + 0.14);
  if (i > 0 && tr < 1) {
    // whip pan with motion streaks
    const k = easeInOutExpo(tr), dir = i % 2 ? 1 : -1;
    ctx.save(); ctx.translate(-k * W * dir, 0); drawShot(i - 1, t); ctx.restore();
    ctx.save(); ctx.translate((1 - k) * W * dir, 0); drawShot(i, t); ctx.restore();
    const blur = Math.sin(k * Math.PI);
    ctx.save(); ctx.globalAlpha = 0.45 * blur; ctx.fillStyle = "#fff";
    const r = rng(i * 7);
    for (let n = 0; n < 24; n++) { const yy = r() * H, len = 300 + r() * 700; ctx.fillRect((r() * W) - len / 2, yy, len, 3 + r() * 6); }
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${0.3 * blur})`; ctx.fillRect(0, 0, W, H);
  } else drawShot(i, t);
  ctx.restore();
  vignette(0.42, 0.4);
  chrome(t, s.id);
  drawCaptions(CARDS, t, { y: 1420, size: 74, maxW: 900, style: "box", accent: COL.gold, keyColor: w => (opts.keyRegex && opts.keyRegex.test(w) ? COL.gold : null) });
  grain(story.grains, frame, 0.035);
  const e = prog(t, DURATION - 0.4, DURATION);
  if (e > 0) { ctx.fillStyle = `rgba(0,0,0,${e})`; ctx.fillRect(0, 0, W, H); }
}

// opts: { fonts, music: {style,...}, bed, duck, hits: [[segId, word, zoom]], sfx: () => void, keyRegex, maxDuration }
function startStory(opts) {
  if (window.DARK_OPTS) opts = { ...opts, ...window.DARK_OPTS };
  window.ready = (async () => {
    await Promise.all((opts.fonts || ["MontX", "MontS", "Caveat", "Playfair"]).map(f => document.fonts.load(`100px ${f}`)));
    T = await (await fetch("timings.json")).json();
    SEG = segmentIndex(T);
    ORDER = T.segments.map(s => s.id);
    CARDS = buildCaptions(T);
    DURATION = Math.min(opts.maxDuration || 600, Math.ceil((T.duration + 1.2) * 10) / 10);
    SEG[ORDER[ORDER.length - 1]].next = DURATION;
    if (opts.dark) darkSetup(opts);
    else T.segments.forEach((s, i) => { if (i) sfx(s.start - 0.16, "whoosh", { gain: 0.5, dur: 0.32 }); });
    for (const [id, w, zz] of opts.hits || []) {
      const tw = wt(id, w, 1);
      PUNCH.push({ t: tw, z: zz, sh: zz * (opts.dark ? 40 : 110) });
      if (!opts.dark) sfx(tw, "hit", { gain: 0.3 + zz * 3 });
    }
    if (opts.sfx) opts.sfx();
    window.TIMELINE = { FPS, DURATION, MUSIC: typeof opts.music === "function" ? opts.music() : opts.music, LOUDNESS: opts.loudness, VOICE: { path: "voice.wav", bed: opts.bed ?? 0.22, duck: opts.duck ?? 0.55 } };
    return true;
  })();
  window.render = t => (opts.dark ? renderDark : renderStory)(t, opts);
}
