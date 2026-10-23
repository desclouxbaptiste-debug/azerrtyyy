// Immersive first-person cut for narrated videos (classic script, load after core, icons, illus, props, narration,
// story and dark). No cuts and no on-screen chrome: the story happens in one continuous set that a camera glides
// through on keyframes timed to the voice, pools of light carve it out of the dark, hand-drawn notes explain the
// protocol inside the picture, and a first-person hand ("you") acts on the set. Grain, dust, flicker and the reveal
// flashes are dark.js's.
// A scene calls startImmersive({ world(t), overlay(t), camera() -> keys, ambient, dips, music, sfx, keyRegex }).
const IMM = { cam: null, c: { x: 0, y: 0, z: 1, r: 0 }, lights: [], lightBuf: null, dips: [] };
const ANCHOR_Y = 0.45; // where the camera centre sits on screen (above the subtitles)

// ---------------------------------------------------------------- camera
// keys: {t, x, y, z, d = 1.2, r = 0, ease}: from time t the camera glides to (x, y) at zoom z in d seconds
function buildCamera(keys) {
  keys = keys.filter(k => k && isFinite(k.t)).sort((a, b) => a.t - b.t);
  const from = [{ ...keys[0] }];
  const at = (i, t) => {
    const k = keys[i], f = from[i], p = (k.ease || easeInOut)(clamp((t - k.t) / (k.d ?? 1.2)));
    return { x: lerp(f.x, k.x, p), y: lerp(f.y, k.y, p), z: f.z * Math.pow(k.z / f.z, p), r: lerp(f.r || 0, k.r || 0, p) };
  };
  for (let i = 1; i < keys.length; i++) from[i] = at(i - 1, keys[i].t);
  return t => { let i = 0; for (let j = 0; j < keys.length; j++) if (keys[j].t <= t) i = j; return at(i, t); };
}
function withCamera(c, fn) {
  ctx.save(); ctx.translate(W / 2, H * ANCHOR_Y); ctx.rotate(c.r); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); fn(); ctx.restore();
}
// world point -> screen point for the current camera (rotation is tiny and ignored)
const toScreen = (x, y) => ({ x: W / 2 + (x - IMM.c.x) * IMM.c.z, y: H * ANCHOR_Y + (y - IMM.c.y) * IMM.c.z });
// parallax layer inside withCamera: f < 1 drifts slower (background), f > 1 faster (foreground)
function depth(f, fn, blur = 0) {
  ctx.save(); ctx.translate(IMM.c.x * (1 - f), IMM.c.y * (1 - f));
  if (blur) ctx.filter = `blur(${blur}px)`;
  fn(); ctx.restore();
}

// ---------------------------------------------------------------- light
// called while drawing the world (world coordinates); the lighting pass turns these into pools of light in the dark
function light(x, y, r, i = 1, color = "255,214,150") { IMM.lights.push({ x, y, r, i, color }); }
function applyLighting(ambient) {
  if (!IMM.lightBuf) { IMM.lightBuf = document.createElement("canvas"); IMM.lightBuf.width = W; IMM.lightBuf.height = H; }
  const g = IMM.lightBuf.getContext("2d");
  g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, W, H);
  g.fillStyle = `rgba(0,0,0,${ambient})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "destination-out";
  for (const L of IMM.lights) {
    const s = toScreen(L.x, L.y), r = L.r * IMM.c.z;
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    gr.addColorStop(0, `rgba(0,0,0,${clamp(L.i)})`); gr.addColorStop(0.55, `rgba(0,0,0,${clamp(L.i) * 0.6})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
  }
  ctx.drawImage(IMM.lightBuf, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (const L of IMM.lights) {
    const s = toScreen(L.x, L.y), r = L.r * IMM.c.z * 0.7;
    const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    gr.addColorStop(0, `rgba(${L.color},${(0.16 * L.i).toFixed(3)})`); gr.addColorStop(1, `rgba(${L.color},0)`);
    ctx.fillStyle = gr; ctx.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
  }
  ctx.restore();
}
// a hanging lamp with its cone of light (world coordinates)
function hangingLamp(x, y, len, on = 1, t = 0) {
  ctx.strokeStyle = "#1A1C22"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = "#2A2D35"; ctx.beginPath(); ctx.moveTo(x - 70, y + 40); ctx.lineTo(x + 70, y + 40); ctx.lineTo(x + 30, y); ctx.lineTo(x - 30, y); ctx.closePath(); ctx.fill();
  if (on > 0) {
    ctx.save(); ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(x, y + 40, x, y + 900);
    g.addColorStop(0, `rgba(255,220,160,${0.22 * on})`); g.addColorStop(1, "rgba(255,220,160,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 62, y + 40); ctx.lineTo(x + 62, y + 40); ctx.lineTo(x + 420, y + 900); ctx.lineTo(x - 420, y + 900); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,236,190,${on})`; ctx.fillRect(x - 58, y + 36, 116, 6);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- hand-drawn notes (world coordinates)
const CHALK = "#F3EBDD";
function chalkStyle(color, width) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,240,210,.35)"; ctx.shadowBlur = 10;
}
function chalk(text, x, y, p, { size = 58, color = CHALK, rot = -0.03, align = "center", font = "Caveat" } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `${size}px ${font}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  const w = ctx.measureText(text).width, x0 = align === "center" ? -w / 2 : align === "right" ? -w : 0;
  ctx.beginPath(); ctx.rect(x0 - 10, -size, (w + 20) * clamp(p), size * 2); ctx.clip();
  chalkStyle(color, 1); ctx.fillText(text, x0, 0);
  ctx.restore();
}
function sketchPath(pts, p, { color = CHALK, width = 6, head = false } = {}) {
  if (p <= 0 || pts.length < 2) return;
  let total = 0; const L = [0];
  for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(total); }
  const upto = total * clamp(p);
  ctx.save(); chalkStyle(color, width); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  let end = pts[0], prev = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= upto) { ctx.lineTo(pts[i][0], pts[i][1]); prev = pts[i - 1]; end = pts[i]; continue; }
    const k = (upto - L[i - 1]) / (L[i] - L[i - 1]);
    end = [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; prev = pts[i - 1]; ctx.lineTo(end[0], end[1]); break;
  }
  ctx.stroke();
  if (head && p > 0.85) {
    const a = Math.atan2(end[1] - prev[1], end[0] - prev[0]), hl = width * 4.5;
    ctx.beginPath(); ctx.moveTo(end[0] - Math.cos(a - 0.5) * hl, end[1] - Math.sin(a - 0.5) * hl); ctx.lineTo(end[0], end[1]);
    ctx.lineTo(end[0] - Math.cos(a + 0.5) * hl, end[1] - Math.sin(a + 0.5) * hl); ctx.stroke();
  }
  ctx.restore();
}
// curved arrow from (x1, y1) to (x2, y2), drawn progressively
function chalkArrow(x1, y1, x2, y2, p, { bend = 0.25, width = 6, color = CHALK } = {}) {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend, pts = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([(1 - u) ** 2 * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) ** 2 * y1 + 2 * (1 - u) * u * my + u * u * y2]); }
  sketchPath(pts, p, { color, width, head: true });
}
function chalkCircle(x, y, rx, ry, p, { width = 6, color = CHALK } = {}) {
  const pts = [];
  for (let i = 0; i <= 40; i++) { const a = -1.9 + i / 40 * 6.6, w = 1 + 0.06 * Math.sin(i * 1.7); pts.push([x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w]); }
  sketchPath(pts, p, { color, width });
}
function chalkUnderline(x1, x2, y, p, o = {}) { sketchPath([[x1, y], [(x1 + x2) / 2, y + 6], [x2, y - 4]], p, o); }

// ---------------------------------------------------------------- first-person hand (screen coordinates)
// (x, y) is the fingertip; the arm comes in from the bottom right
function povHand(x, y, s = 1, { press = 0, rot = -0.42, sleeve = "#2C323F", skin = "#E3AE8A", point = true } = {}) {
  ctx.save(); ctx.translate(x, y + press * 14 * s); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
  ctx.fillStyle = sleeve; ctx.beginPath(); ctx.roundRect(-82, 250, 164, 1100, 60); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#E9E4DA"; ctx.beginPath(); ctx.roundRect(-86, 236, 172, 46, 14); ctx.fill();
  ctx.fillStyle = shade(skin, -14); ctx.beginPath(); ctx.roundRect(-70, 196, 140, 60, 26); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(-74, 96, 148, 140, 46); ctx.fill();
  // curled fingers
  for (let k = 0; k < 3; k++) { ctx.fillStyle = shade(skin, -6 - k * 4); ctx.beginPath(); ctx.roundRect(-22 + k * 30, 70 + k * 8, 34, 70, 16); ctx.fill(); }
  // thumb
  ctx.save(); ctx.translate(-66, 150); ctx.rotate(-0.7); ctx.fillStyle = shade(skin, -4); ctx.beginPath(); ctx.roundRect(-18, -80, 36, 96, 18); ctx.fill(); ctx.restore();
  // index finger
  if (point) {
    ctx.fillStyle = skin; ctx.beginPath(); ctx.roundRect(-52, 0, 40, 150, 20); ctx.fill();
    ctx.fillStyle = shade(skin, 12); ctx.beginPath(); ctx.roundRect(-46, 6, 26, 26, 10); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- frame
function renderImmersive(t, opts) {
  const frame = Math.round(t * FPS);
  const base = IMM.cam(t), { z, sh } = punchAt(t);
  // a slow handheld drift keeps the picture alive
  const c = { x: base.x + Math.sin(t * 0.63) * 7 + Math.sin(t * 1.37) * 3 + Math.sin(t * 87) * sh, y: base.y + Math.cos(t * 0.81) * 6 + Math.cos(t * 71) * sh,
    z: base.z * (1 + z) * (1 + 0.006 * Math.sin(t * 0.4)), r: base.r + 0.004 * Math.sin(t * 0.37) };
  IMM.c = c; IMM.lights = [];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  withCamera(c, () => opts.world(t, c));
  if (opts.overlay) opts.overlay(t, c);

  const fl = darkFlicker(t, frame);
  const b = snapshot();
  ctx.save(); ctx.filter = `brightness(${(0.9 * fl).toFixed(3)}) contrast(1.15) saturate(0.7) sepia(0.1)`; ctx.drawImage(b, 0, 0); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(205,215,230)"; ctx.fillRect(0, 0, W, H); ctx.restore();
  applyLighting(typeof opts.ambient === "function" ? opts.ambient(t) : opts.ambient ?? 0.72);

  ctx.save(); ctx.globalCompositeOperation = "screen";
  for (const d of DARK.dust) {
    const x = ((d.x + Math.sin(t * 0.3 + d.ph) * 40 * d.z + t * d.sp * 0.5 - c.x * 0.05 * d.z) % (W + 40) + W + 40) % (W + 40) - 20;
    const y = ((d.y - t * d.sp * d.z) % (H + 40) + H + 40) % (H + 40) - 20;
    const r = 1.5 + d.z * 3.2, a = d.a * (0.6 + 0.4 * Math.sin(t * 1.7 + d.ph)) * fl;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, `rgba(255,240,215,${a.toFixed(3)})`); g.addColorStop(1, "rgba(255,240,215,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  }
  ctx.restore();
  vignette(0.8, 0.28);

  // dips to black (time jumps), reveal flashes
  for (const [t0, d] of IMM.dips) { const k = t < t0 ? prog(t, t0 - d / 2, t0) : 1 - prog(t, t0, t0 + d / 2); if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${easeInOut(k).toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }
  for (const tr of DARK.flashes) if (t >= tr - 0.02 && t < tr + 0.6) { ctx.fillStyle = `rgba(255,250,240,${(0.45 * Math.exp(-(t - tr) * 8)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }

  drawCaptions(CARDS, t, { y: 1540, size: 64, maxW: 940, style: "plain", accent: COL.gold, keyColor: w => (opts.keyRegex && opts.keyRegex.test(w) ? COL.gold : null) });

  const r = rng(frame * 7 + 3);
  ctx.save(); ctx.globalAlpha = 0.11; ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(DARK.grains[frame % DARK.grains.length], -r() * 160, -r() * 280, W + 320, H + 560); ctx.restore();
  const e = prog(t, DURATION - 0.8, DURATION), s0 = 1 - prog(t, 0, 0.6);
  if (e > 0 || s0 > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(e, s0)})`; ctx.fillRect(0, 0, W, H); }
}

function startImmersive(opts) {
  window.ready = (async () => {
    await Promise.all(["MontX", "MontS", "Caveat", "Playfair"].map(f => document.fonts.load(`100px ${f}`)));
    T = await (await fetch("timings.json")).json();
    SEG = segmentIndex(T);
    ORDER = T.segments.map(s => s.id);
    CARDS = buildCaptions(T);
    DURATION = Math.ceil((T.duration + 1.4) * 10) / 10;
    DARK.dust = darkDust(60, 4); DARK.grains = makeGrain(8, 41);
    for (const tr of T.reveals || []) { DARK.flashes.push(tr); PUNCH.push({ t: tr, z: 0.05, sh: 4 }); sfx(tr - 0.03, "impact_deep", { gain: 0.85 }); }
    IMM.cam = buildCamera(opts.camera());
    IMM.dips = opts.dips ? opts.dips() : [];
    if (opts.sfx) opts.sfx();
    window.TIMELINE = { FPS, DURATION, LOUDNESS: -14, MUSIC: typeof opts.music === "function" ? opts.music() : opts.music, VOICE: { path: "voice.wav", bed: opts.bed ?? 0.26, duck: opts.duck ?? 0.6 } };
    return true;
  })();
  window.render = t => renderImmersive(t, opts);
}
