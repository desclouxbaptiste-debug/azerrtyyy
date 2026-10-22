// Shared helpers for every video scene. A scene defines window.render(t),
// window.TIMELINE = { FPS, DURATION, MUSIC: {...} } and pushes sound cues with sfx().
const W = 1080, H = 1920;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const buf = document.createElement("canvas");
buf.width = W; buf.height = H;
const bctx = buf.getContext("2d");

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeInExpo = x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const easeOutCubic = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x * x;
const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
const easeOutBack = (x, c1 = 1.70158) => { const c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeOutElastic = x => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const SFX = [];
const sfx = (t, type, extra = {}) => SFX.push({ t, type, ...extra });
window.SFX = SFX;

function txt(str, x, y, size, font, fill, o = {}) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = o.align || "center"; ctx.textBaseline = o.baseline || "middle";
  if (o.spacing) ctx.letterSpacing = o.spacing + "px";
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.rgb) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(0,255,255,0.75)"; ctx.fillText(str, x - o.rgb, y);
    ctx.fillStyle = "rgba(255,0,90,0.75)"; ctx.fillText(str, x + o.rgb, y);
    ctx.globalCompositeOperation = "source-over";
  }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 40; }
  if (o.stroke) { ctx.lineWidth = o.strokeW || 6; ctx.strokeStyle = o.stroke; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
  if (fill) { ctx.fillStyle = fill; ctx.fillText(str, x, y); }
  ctx.restore();
}

function measure(str, size, font, spacing = 0) {
  ctx.save(); ctx.font = `${size}px ${font}`; ctx.letterSpacing = spacing + "px";
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}

// largest font size (<= max) at which str fits in maxW
function fitSize(str, font, maxW, max, spacing = 0) {
  const w = measure(str, 100, font, spacing * 100 / max);
  return Math.min(max, (100 * maxW) / w);
}

function wrap(str, size, font, maxW) {
  ctx.save(); ctx.font = `${size}px ${font}`;
  const lines = [""];
  for (const w of str.split(" ")) {
    const test = (lines[lines.length - 1] + " " + w).trim();
    if (ctx.measureText(test).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = test;
  }
  ctx.restore(); return lines;
}

// reveal text letter by letter (typewriter), returns number of visible chars
function typed(str, t, t0, cps) { return clamp(Math.floor((t - t0) * cps), 0, str.length); }

function makeGrain(n = 6, seed = 1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const g = document.createElement("canvas"); g.width = 540; g.height = 960;
    const gc = g.getContext("2d"); const img = gc.createImageData(540, 960); const r = rng(seed * 31 + k);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gc.putImageData(img, 0, 0); out.push(g);
  }
  return out;
}
function grain(grains, frame, alpha = 0.07, op = "overlay") {
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = op;
  ctx.drawImage(grains[frame % grains.length], 0, 0, W, H); ctx.restore();
}
function vignette(strength = 0.6, inner = 0.3) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function snapshot() { bctx.clearRect(0, 0, W, H); bctx.drawImage(cv, 0, 0); return buf; }

function loadFonts(families) {
  window.ready = Promise.all(families.map(f => document.fonts.load(`100px ${f}`))).then(() => true);
}
