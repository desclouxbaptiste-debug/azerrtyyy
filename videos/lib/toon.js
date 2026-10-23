// Simple, fluid characters for the immersive cuts: a pill-shaped body, a round head with dot eyes that blink, soft
// rubber-hose limbs drawn as curves, and a little constant life (breathing, idle sway, pose changes eased instead of
// snapped). Same call as illus.js character() and the same pose angles, so loading this file after illus.js swaps the
// drawing for every scene and prop while every pose keeps its meaning.
const TOON = { mem: new Map() };

// curve from (x0, y0) through the joint (x1, y1) to (x2, y2)
function toonLimb(x0, y0, x1, y1, x2, y2, w, color) {
  const cx = 2 * x1 - (x0 + x2) / 2, cy = 2 * y1 - (y0 + y2) / 2;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
}
const toonJoint = (x, y, a1, l1, a2, l2) => {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
  return { kx, ky, ex: kx + Math.sin(a1 + a2) * l2, ey: ky + Math.cos(a1 + a2) * l2 };
};

// eases a character's joint angles towards the pose of this frame (frames are rendered in order within a worker)
function toonEase(key, P, t, gait) {
  const m = TOON.mem.get(key);
  const keys = ["hip", "knee", "sh", "el"];
  if (gait || !m || t < m.t || t - m.t > 0.25) { TOON.mem.set(key, { t, P: JSON.parse(JSON.stringify(P)) }); return P; }
  const k = 1 - Math.exp(-(t - m.t) * 9);
  const out = { ...P };
  for (const j of keys) out[j] = P[j].map((v, i) => m.P[j][i] + (v - m.P[j][i]) * k);
  out.lean = (m.P.lean || 0) + ((P.lean || 0) - (m.P.lean || 0)) * k;
  out.pelvisY = P.pelvisY;
  TOON.mem.set(key, { t, P: out });
  return out;
}

function toonHead(L, face, t, seed) {
  const r = 46;
  const hair = (path) => { ctx.fillStyle = L.hair; ctx.beginPath(); path(); ctx.fill(); };
  if (["bun", "pigtails"].includes(L.hairStyle)) hair(() => ctx.arc(-5, -5, r + 5, Math.PI * 0.82, Math.PI * 2.1));
  if (L.hairStyle === "bun") hair(() => ctx.arc(-36, -36, 20, 0, 6.29));
  if (L.hairStyle === "pigtails") { hair(() => ctx.arc(-44, 16, 15, 0, 6.29)); hair(() => ctx.arc(-30, 36, 12, 0, 6.29)); }
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.07)"; ctx.beginPath(); ctx.arc(-10, 4, r - 4, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
  // hair: one cap from the back of the head over the top, ending in a fringe
  const capHair = (end, fringeY) => hair(() => { ctx.moveTo(-r - 3, 12); ctx.arc(0, 0, r + 3, Math.PI * 0.97, Math.PI * end); ctx.quadraticCurveTo(r * 0.1, -r * fringeY, -r * 0.6, -r * 0.12); ctx.closePath(); });
  if (["side", "bun", "pigtails"].includes(L.hairStyle)) capHair(1.78, 0.3);
  if (L.hairStyle === "short") capHair(1.7, 0.55);
  if (L.hairStyle === "bald") hair(() => ctx.ellipse(-30, 6, 12, 18, 0.2, 0, 6.29));
  if (L.hairStyle === "cap") { ctx.fillStyle = L.cap; ctx.beginPath(); ctx.arc(-2, -6, r + 3, Math.PI * 1.05, Math.PI * 2.02); ctx.closePath(); ctx.fill(); }
  if (L.hairStyle === "beanie") { ctx.fillStyle = L.beanie; ctx.beginPath(); ctx.arc(-2, -6, r + 4, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill(); }
  if (L.beard) { ctx.fillStyle = L.beard; ctx.beginPath(); ctx.arc(10, 14, 34, 0.15, Math.PI - 0.6); ctx.fill(); }
  // eyes: two dots near the front of the face, blinking now and then
  const [lx, ly] = face.look || [1, 0];
  let open = face.eyes === "closed" ? 0 : face.eyes === "half" ? 0.5 : 1;
  if (open > 0 && ((t * 0.29 + seed * 0.37) % 1) < 0.035) open = 0;
  const wide = face.eyes === "wide";
  for (const ex of [12, 31]) {
    const x = ex + lx * 2.5, y = -6 + ly * 2.5;
    if (open > 0.2) {
      if (wide) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 8.5, 0, 6.29); ctx.fill(); }
      ctx.fillStyle = "#1A1A22"; ctx.beginPath(); ctx.ellipse(x, y, wide ? 4.6 : 5, (wide ? 4.6 : 6) * open, 0, 0, 6.29); ctx.fill();
    } else { ctx.strokeStyle = "#1A1A22"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.stroke(); }
  }
  const browA = { neutral: 0, worried: -0.35, angry: 0.4, up: -0.1, focused: 0.2 }[face.brows || "neutral"];
  if (face.brows && face.brows !== "neutral") for (const ex of [12, 31]) {
    ctx.save(); ctx.translate(ex, face.brows === "up" ? -24 : -19); ctx.rotate(ex < 20 ? -browA : browA);
    ctx.strokeStyle = "#2A2020"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = "rgba(230,110,110,.22)"; ctx.beginPath(); ctx.arc(34, 12, 8, 0, 6.29); ctx.fill();
  ctx.strokeStyle = "#3A2424"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath();
  const m = face.mouth || "neutral";
  if (m === "smile") { ctx.arc(24, 12, 9, 0.35, Math.PI - 0.35); ctx.stroke(); }
  else if (m === "frown") { ctx.arc(24, 28, 8, Math.PI + 0.5, -0.5); ctx.stroke(); }
  else if (m === "o") { ctx.fillStyle = "#3A2424"; ctx.ellipse(24, 21, 5, 7, 0, 0, 6.29); ctx.fill(); }
  else if (m === "grimace") { ctx.moveTo(15, 22); ctx.quadraticCurveTo(20, 18, 24, 22); ctx.quadraticCurveTo(29, 26, 33, 21); ctx.stroke(); }
  else { ctx.moveTo(17, 21); ctx.lineTo(31, 21); ctx.stroke(); }
  if (L.sunglasses) { ctx.fillStyle = "#15171C"; ctx.beginPath(); ctx.roundRect(2, -15, 42, 17, 7); ctx.fill(); ctx.fillStyle = "rgba(170,210,255,.55)"; ctx.fillRect(8, -11, 12, 3); }
  if (L.glasses) { ctx.strokeStyle = "#222"; ctx.lineWidth = 2.5; for (const ex of [12, 31]) { ctx.beginPath(); ctx.arc(ex, -6, 9, 0, 6.29); ctx.stroke(); } }
}

function toonCharacter(x, y, scale, look, o = {}) {
  const L = LOOKS[look] || look, t = o.t || 0, seed = o.seed || 0;
  const gait = ["walk", "hurry", "run"].includes(o.pose);
  let P = Object.assign(poseFor(o.pose || "stand", o.phase || 0, o.k || 0), o.override || {});
  P = { ...P, sh: P.sh.slice(), el: P.el.slice() };
  // idle life: arms sway a little unless the scene drives them
  if (!o.override?.sh && !gait) { P.sh[0] += 0.05 * Math.sin(t * 1.3 + seed); P.sh[1] += 0.05 * Math.sin(t * 1.1 + seed + 1); }
  const key = o.id || `${typeof look === "string" ? look : L.jacket}|${Math.round(y)}|${seed}|${Math.round(x / 400)}`;
  P = toonEase(key, P, t, gait);
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -scale : scale, scale);
  if (o.shadow !== false) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 4, P.sit ? 110 : 64, 11, 0, 0, 6.29); ctx.fill(); }
  const low = i => Math.max(Math.cos(P.hip[i]) * THIGH, Math.cos(P.hip[i]) * THIGH + Math.cos(P.hip[i] + P.knee[i]) * SHIN) + 12;
  const support = P.stance !== undefined ? low(P.stance) : Math.max(low(0), low(1));
  const breathe = 1 + 0.02 * Math.sin(t * 2.1 + seed);
  const pelvisY = (P.pelvisY ?? -support) - (P.lift || 0) + (P.bob || 0);
  const lean = P.lean || 0, torso = 128 * breathe;
  const neck = { x: Math.sin(lean) * torso, y: pelvisY - Math.cos(lean) * torso };
  const sh = { x: neck.x * 0.9, y: neck.y + 16 };
  const legW = 30, armW = 22, dark = shade(L.jacket, -16);
  const leg = (i, color) => {
    const j = toonJoint(i ? -6 : 6, pelvisY, P.hip[i], THIGH, P.knee[i], SHIN);
    toonLimb(i ? -6 : 6, pelvisY, j.kx, j.ky, j.ex, j.ey, legW, color);
    ctx.save(); ctx.translate(j.ex, j.ey); ctx.rotate(clamp(P.hip[i] + P.knee[i], -0.9, 0.9)); ctx.fillStyle = i ? shade(L.shoes, -8) : L.shoes;
    ctx.beginPath(); ctx.ellipse(12, 3, 24, 11, 0, 0, 6.29); ctx.fill(); ctx.restore();
  };
  const arm = (i, color) => {
    const j = toonJoint(sh.x + (i ? -6 : 6), sh.y, P.sh[i], UPPER_ARM, P.el[i], FOREARM);
    toonLimb(sh.x + (i ? -6 : 6), sh.y, j.kx, j.ky, j.ex, j.ey, armW, color);
    ctx.fillStyle = i ? shade(L.skin, -14) : L.skin; ctx.beginPath(); ctx.arc(j.ex, j.ey, 11, 0, 6.29); ctx.fill();
    return j;
  };
  leg(1, shade(L.pants, -16));
  arm(1, dark);
  // body: one rounded pill
  ctx.save(); ctx.translate(0, pelvisY); ctx.rotate(lean); ctx.scale(1, breathe);
  ctx.fillStyle = L.jacket; ctx.beginPath(); ctx.roundRect(-40, -134, 80, 152, [36, 36, 30, 30]); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.beginPath(); ctx.roundRect(-40, -134, 30, 152, [36, 0, 0, 30]); ctx.fill();
  if (L.shirt && L.shirt !== L.jacket) { ctx.fillStyle = L.shirt; ctx.beginPath(); ctx.moveTo(14, -134); ctx.lineTo(36, -132); ctx.lineTo(26, -98); ctx.closePath(); ctx.fill(); }
  if (L.tie) { ctx.fillStyle = L.tie; ctx.beginPath(); ctx.roundRect(24, -128, 8, 44, 4); ctx.fill(); }
  if (L.chestText) { ctx.fillStyle = "#2B2B33"; ctx.font = "30px MontX"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(L.chestText, 4, -78); }
  if (L.sunglasses && L.jacket === LOOKS.guard.jacket) { ctx.fillStyle = "#6B5A3A"; ctx.fillRect(-40, -16, 80, 10); }
  ctx.restore();
  leg(0, L.pants);
  // head, with a slow nod
  const hs = L.headScale || 1;
  ctx.save(); ctx.translate(neck.x + 4, neck.y - 40 * hs - 6); ctx.rotate((P.headTilt || 0) + 0.03 * Math.sin(t * 1.1 + seed * 2)); ctx.scale(hs, hs);
  toonHead(L, o.face || {}, t, seed);
  ctx.restore();
  const a = arm(0, shade(L.jacket, 6));
  if (o.props?.paper) { ctx.save(); ctx.translate(a.ex + 8, a.ey - 10); ctx.rotate(-0.3); ctx.fillStyle = "#F7F2E6"; ctx.beginPath(); ctx.roundRect(-24, -34, 48, 62, 4); ctx.fill(); ctx.restore(); }
  if (o.props?.clipboard) { ctx.save(); ctx.translate(a.ex + 10, a.ey - 16); ctx.rotate(-0.2); ctx.fillStyle = "#8B6A48"; ctx.beginPath(); ctx.roundRect(-28, -40, 56, 78, 8); ctx.fill(); ctx.fillStyle = "#F7F2E6"; ctx.beginPath(); ctx.roundRect(-22, -32, 44, 62, 3); ctx.fill(); ctx.restore(); }
  if (o.props?.book) { ctx.save(); ctx.translate(a.ex + 6, a.ey - 4); ctx.rotate(-0.15); ctx.fillStyle = "#7A2E22"; ctx.beginPath(); ctx.roundRect(-28, -38, 54, 70, 8); ctx.fill(); ctx.restore(); }
  if (o.props?.mallet) { ctx.save(); ctx.translate(a.ex, a.ey); ctx.rotate(Math.atan2(a.ey - a.ky, a.ex - a.kx) - Math.PI / 2); ctx.fillStyle = "#8A6A44"; ctx.beginPath(); ctx.roundRect(-6, -10, 12, 110, 6); ctx.fill(); ctx.fillStyle = "#C0392B"; ctx.beginPath(); ctx.roundRect(-36, 88, 72, 44, 14); ctx.fill(); ctx.restore(); }
  if (o.props?.baton) { ctx.save(); ctx.translate(a.ex, a.ey); ctx.rotate(Math.atan2(a.ey - a.ky, a.ex - a.kx) - Math.PI / 2 + 0.5); ctx.fillStyle = "#1E1E24"; ctx.beginPath(); ctx.roundRect(-8, -20, 16, 130, 8); ctx.fill(); ctx.restore(); }
  if (o.props?.watch) { ctx.fillStyle = o.props.watchGlow ? "#FF4D4D" : "#DDD"; ctx.beginPath(); ctx.arc(a.kx + (a.ex - a.kx) * 0.8, a.ky + (a.ey - a.ky) * 0.8, 8, 0, 6.29); ctx.fill(); }
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(a.ex, a.ey, 11, 0, 6.29); ctx.fill();
  ctx.restore();
}
character = toonCharacter;
