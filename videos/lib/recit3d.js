// Narrated videos staged with the Quidams (lib/quidams.js): one 3D set per voice segment, whip pans between sets,
// word-by-word subtitles, chapter chip + progress bar, flash and punch-in on every <r> reveal of the voice.
// A video registers its sets with plateau(id, build) and calls demarrer({...}). Uses the classic globals of
// core.js (ctx, W, H, prog, lerp, ease*, sfx, txt, grain, vignette…), narration.js and immersive.js (chalk…).
import * as THREE from "three";
import { creerStudio, LUMIERES } from "./studio3d.js";
import { creerQuidam } from "./quidams.js";

export const FPS = 30;
export const INK = "#2A2C33", AMBRE = "#F4A531";
export const R = { T: null, SEG: null, ORDER: null, CARDS: null, DURATION: 0, REVEALS: [] };
export const S = id => R.SEG[id].start;
export const E = id => R.SEG[id].next;
export const wt = (id, w, fb = 0) => wordTime(R.SEG[id], w, fb);

export const st = creerStudio({ ombre: 0.22 });
const SHOTS = {};
const grains = makeGrain(4, 23);
const tmp = new THREE.Vector3();

// ---------------------------------------------------------------- sets and figures
/** build(g) adds the set's objects to g and returns { update(t) -> camera, over?(t), fond?(t) }.
 *  camera: { fov, pos, cible, focus?: [x, z] (shadow centre), sombre?: 0..1 (lights down, dark background) } */
// sets are built once the fonts are loaded (props print text into canvas textures)
const A_CONSTRUIRE = [];
export function plateau(id, build) { A_CONSTRUIRE.push([id, build]); }
function construire() {
  for (const [id, build] of A_CONSTRUIRE) {
    const g = new THREE.Group();
    g.visible = false;
    st.plateau.add(g);
    SHOTS[id] = { g, ...build(g) };
  }
}
export function figure(g, role, x, z, o = {}) {
  const q = creerQuidam({ role, ...o });
  q.objet.position.set(x, 0, z);
  g.add(q.objet);
  return q;
}
export const apparaitre = (q, k) => q.objet.scale.setScalar(Math.max(0.001, k));
/** Rocks the raised right arm on top of the "mainLevee" pose. */
export function saluer(q, t, k) {
  q.articulations.epauleD.rotation.z += k * 0.24 * Math.sin(t * 9);
  q.articulations.coudeD.rotation.x += k * 0.18 * Math.sin(t * 9 + 1);
}
/** Screen point h metres above the centre of a figure's head, in the image drawn last. */
export function auDessus(q, h = 0.5) {
  q.articulations.tete.getWorldPosition(tmp);
  tmp.y += h;
  return st.projeter(tmp);
}
/** Turns a figure to face the point (x, z). */
export function tourneVers(q, x, z) {
  q.objet.rotation.y = Math.atan2(x - q.objet.position.x, z - q.objet.position.z);
}

/** Camera along keyframes: cles[0] = { pos, cible, fov }, then { t, d, pos, cible, fov? } eased in turn. */
export function chemin(t, cles) {
  let c = { fov: cles[0].fov ?? 30, pos: [...cles[0].pos], cible: [...cles[0].cible] };
  for (const k of cles.slice(1)) {
    const a = easeInOut(prog(t, k.t, k.t + (k.d ?? 0.8)));
    if (a <= 0) continue;
    c = { fov: lerp(c.fov, k.fov ?? c.fov, a), pos: c.pos.map((v, i) => lerp(v, k.pos[i], a)), cible: c.cible.map((v, i) => lerp(v, k.cible[i], a)) };
  }
  return c;
}
/** Keeps a prop held in a hand upright whatever the arm does (call after the figure's animer()). */
const qtmp = new THREE.Quaternion();
export function droit(obj) {
  obj.parent.updateWorldMatrix(true, false);
  obj.parent.getWorldQuaternion(qtmp);
  obj.quaternion.copy(qtmp.invert());
}
/** First <r> reveal of the voice inside a segment (fallback: start + fb). */
export const revele = (id, fb = 1) => R.REVEALS.find(x => x >= S(id) && x < E(id)) ?? S(id) + fb;

// ---------------------------------------------------------------- 2D layers
/** A number tag stuck on a figure's chest (people turned into numbers), sized with the perspective. */
const poitrine = new THREE.Vector3(), cote = new THREE.Vector3();
export function plaque(q, s, p) {
  if (p <= 0) return;
  poitrine.set(0.02, 0.33, 0.26); q.articulations.buste.localToWorld(poitrine);
  cote.copy(poitrine); cote.x += 0.16;
  const a = st.projeter(poitrine), b = st.projeter(cote), u = Math.hypot(b.x - a.x, b.y - a.y) / 0.16; // pixels per metre
  const k = easeOutBack(clamp(p), 2.6), w = 0.17 * u, h = 0.1 * u;
  ctx.save(); ctx.translate(a.x, a.y); ctx.scale(k, k); ctx.rotate(-0.06);
  ctx.fillStyle = "#F7F7F4"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, 0.008 * u);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.15); ctx.fill(); ctx.stroke();
  txt(s, 0, h * 0.04, h * 0.62, "MontX", INK);
  ctx.restore();
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
export function melange(a, b, k) { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`; }
export function fond(sombre = 0) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 80, W / 2, H * 0.46, H * 0.8);
  g.addColorStop(0, melange("#F4F1EB", "#20232B", sombre)); g.addColorStop(1, melange("#D3CEC3", "#060709", sombre));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** Handwriting: dark ink on the light studio, chalk white when the lights are down. */
export const encre = (s, x, y, p, o = {}) => chalk(s, x, y, p, { size: 54, color: o.sombre ? CHALK : INK, rot: -0.03, ...o });
export function bulle(s, x, y, p, { size = 56 } = {}) {
  if (p <= 0) return;
  const k = easeOutBack(clamp(p), 2.2);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.font = `${size}px Caveat`;
  const w = ctx.measureText(s).width + 70, h = size * 1.8;
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 40); ctx.moveTo(-30, -2); ctx.lineTo(-58, 46); ctx.lineTo(8, -2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-28, -9, 34, 12);
  ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, 0, -h / 2 + 2);
  ctx.restore();
}
/** Big title slammed onto the picture (scale-in), centred at y. */
export function tampon(s, y, p, { size = 120, color = "#FFFFFF", trait = INK } = {}) {
  if (p <= 0) return;
  const k = 1 + 0.9 * (1 - easeOutCubic(clamp(p * 1.6)));
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(k, k); ctx.globalAlpha = clamp(p * 3);
  txt(s, 0, 0, size, "MontX", color, { stroke: trait, strokeW: size * 0.16 });
  ctx.restore();
}

// ---------------------------------------------------------------- frame
const PUNCH = [];
function punch(t) {
  let z = 0;
  for (const p of PUNCH) if (t >= p.t && t < p.t + 0.6) z = Math.max(z, p.z * Math.exp(-(t - p.t) * 7));
  return z;
}
function chrome(t, id, chapitres) {
  const lab = chapitres[id];
  if (lab) {
    const n = Object.keys(chapitres).indexOf(id) + 1, str = `${n}/${Object.keys(chapitres).length} · ${lab}`;
    ctx.save(); ctx.font = "30px MontX"; ctx.letterSpacing = "3px";
    const w = ctx.measureText(str).width + 76;
    ctx.fillStyle = "rgba(34,36,42,.88)"; ctx.beginPath(); ctx.roundRect(60, 186, w, 58, 29); ctx.fill();
    ctx.fillStyle = AMBRE; ctx.beginPath(); ctx.arc(90, 215, 9, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(str, 112, 217);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(128,128,128,.25)"; ctx.fillRect(60, 268, 960, 6);
  ctx.fillStyle = AMBRE; ctx.fillRect(60, 268, 960 * clamp(t / R.DURATION), 6);
}
function drawShot(i, t, dx) {
  const id = R.ORDER[i], sh = SHOTS[id];
  for (const k in SHOTS) SHOTS[k].g.visible = k === id;
  ctx.save(); ctx.translate(dx, 0);
  // default studio light, dimmed by the set's "sombre" (sets with their own lights override after this)
  const cam = sh.update(t), d = cam.sombre || 0;
  if (!cam.lumieres) {
    st.ciel.intensity = lerp(LUMIERES.ciel, 0.16, d); st.key.intensity = lerp(LUMIERES.cle, 0.85, d); st.contre.intensity = lerp(LUMIERES.contre, 2.5, d);
  }
  (sh.fond || (() => fond(d)))(t);
  st.suivre(...(cam.focus || [cam.cible[0], cam.cible[2]]));
  st.tourner(ctx, 0, 0, W, H, cam);
  if (sh.over) sh.over(t, d);
  ctx.restore();
  return d;
}
function render(t, chapitres) {
  const frame = Math.round(t * FPS);
  let i = R.ORDER.findIndex(id => t < R.SEG[id].next);
  if (i < 0) i = R.ORDER.length - 1;
  const s = R.SEG[R.ORDER[i]], tr = prog(t, s.start - 0.14, s.start + 0.14);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const z = punch(t);
  ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(1 + z, 1 + z); ctx.translate(-W / 2, -H * 0.45);
  let d;
  if (i > 0 && tr < 1) {
    // whip pan with motion streaks
    const k = easeInOutExpo(tr), dir = i % 2 ? 1 : -1, blur = Math.sin(k * Math.PI);
    drawShot(i - 1, t, -k * W * dir);
    d = drawShot(i, t, (1 - k) * W * dir);
    ctx.save(); ctx.globalAlpha = 0.4 * blur; ctx.fillStyle = "#fff";
    const r = rng(i * 7);
    for (let n = 0; n < 24; n++) { const yy = r() * H, len = 300 + r() * 700; ctx.fillRect(r() * W - len / 2, yy, len, 3 + r() * 6); }
    ctx.restore();
  } else d = drawShot(i, t, 0);
  ctx.restore();
  for (const tr of R.REVEALS) if (t >= tr - 0.02 && t < tr + 0.6) { ctx.fillStyle = `rgba(255,250,240,${(0.45 * Math.exp(-(t - tr) * 8)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  vignette(lerp(0.22, 0.6, d), 0.42);
  chrome(t, s.id, chapitres);
  drawCaptions(R.CARDS, t, { y: 1590, size: 70, maxW: 900, style: "box", accent: AMBRE });
  grain(grains, frame, 0.03);
  const e = Math.max(prog(t, R.DURATION - 0.6, R.DURATION), 1 - prog(t, 0, 0.35));
  if (e > 0) { ctx.fillStyle = `rgba(0,0,0,${e})`; ctx.fillRect(0, 0, W, H); }
}

/** Loads timings.json, schedules the sounds, exposes window.render / window.TIMELINE.
 *  { chapitres: {segId: label}, musique: {style…} or () => {style…}, sons: () => void, voix: {bed, duck} } */
export function demarrer({ chapitres = {}, musique = { style: "lofi", bpm: 88 }, sons, voix = {} }) {
  window.ready = (async () => {
    await Promise.all(["MontX", "MontS", "Caveat"].map(f => document.fonts.load(`100px ${f}`)));
    construire();
    R.T = await (await fetch("timings.json")).json();
    R.SEG = segmentIndex(R.T);
    R.ORDER = R.T.segments.map(s => s.id);
    R.CARDS = buildCaptions(R.T);
    R.DURATION = Math.ceil((R.T.duration + 1.4) * 10) / 10;
    R.SEG[R.ORDER[R.ORDER.length - 1]].next = R.DURATION;
    R.REVEALS = R.T.reveals || [];
    R.ORDER.forEach((id, i) => { if (i) sfx(S(id) - 0.16, "whoosh", { gain: 0.45, dur: 0.32 }); });
    for (const tr of R.REVEALS) { PUNCH.push({ t: tr, z: 0.06 }); sfx(tr - 0.03, "impact_deep", { gain: 0.85 }); }
    if (sons) sons();
    window.TIMELINE = { FPS, DURATION: R.DURATION, LOUDNESS: -14, MUSIC: typeof musique === "function" ? musique() : musique, VOICE: { path: "voice.wav", bed: voix.bed ?? 0.24, duck: voix.duck ?? 0.55 } };
    return true;
  })();
  window.render = t => render(t, chapitres);
}
