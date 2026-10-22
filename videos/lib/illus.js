// Flat illustrated characters + environments for story-driven motion design (classic script, after core.js).
// Characters are drawn in side view facing right, origin at the feet; 1 unit = 1 px at scale 1 (≈ 380 px tall).

// ---------------------------------------------------------------- characters
const LOOKS = {
  student: { skin: "#F2C9A0", hair: "#3B2618", hairStyle: "side", jacket: "#1F2A44", jacketDark: "#18213A", shirt: "#E9EEF5", collar: true, pants: "#202536", shoes: "#111318", accent: "#FFC93C" },
  victim: { skin: "#D9B08C", hair: "#6B6259", hairStyle: "beanie", beanie: "#5B4A3A", jacket: "#6E5A43", jacketDark: "#5A4836", shirt: "#8C8172", pants: "#3E3F45", shoes: "#2A221C", beard: "#7A6E62" },
  researcher: { skin: "#EAC4A2", hair: "#9A9A9A", hairStyle: "bald", jacket: "#F4F4F0", jacketDark: "#DADAD4", shirt: "#7FA7D9", tie: "#B5523B", pants: "#3A3F52", shoes: "#1A1A1A", glasses: true },
  passerby: { skin: "#C98E62", hair: "#1E1A18", hairStyle: "short", jacket: "#7A8CA8", jacketDark: "#66778F", shirt: "#E5E1D8", pants: "#2E3240", shoes: "#151515" },
};

function limb(x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
// two-segment limb from (x,y), angles measured from straight down (rad), returns end point
function chain(x, y, a1, l1, a2, l2, w1, w2, c1, c2) {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
  const ex = kx + Math.sin(a1 + a2) * l2, ey = ky + Math.cos(a1 + a2) * l2;
  limb(x, y, kx, ky, w1, c1); limb(kx, ky, ex, ey, w2, c2 || c1);
  return { kx, ky, ex, ey };
}

// Rig convention: every angle is measured from straight down, POSITIVE = towards where the character faces.
// hip / sh = thigh / upper-arm angle; knee / el = bend of the lower segment relative to the upper one
// (knees bend backwards: negative; elbows bend forwards: positive). Index 0 = near limb, 1 = far limb.
// Feet are planted automatically (lowest foot or knee touches the ground) unless the pose fixes pelvisY.
const THIGH = 84, SHIN = 80, UPPER_ARM = 64, FOREARM = 60;
const GAIT = { walk: 0.42, hurry: 0.6, run: 0.78 };

// pixels travelled per radian of gait phase at scale 1 (stance foot moves L*A*cos φ backwards; mean over stance)
function strideK(kind) { return (THIGH + SHIN) * (GAIT[kind] || 0.42) * 2 / Math.PI; }
// gait phase from the distance a character has travelled, so the planted foot never slides
function gaitPhase(dist, kind, scale = 1) { return Math.abs(dist) / (strideK(kind) * scale); }

// knee flexion over one gait cycle for a leg whose hip follows sin(φ): the leg swings forward while φ ∈ (-π/2, π/2)
// (hip angle rising) and supports the body the rest of the time. The bend is 0 exactly at lift-off and heel strike,
// so the two legs hand over the body's weight at the same instant, and peaks early in the swing.
function swingU(phase) { return ((((phase + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / Math.PI; }
function swingBend(phase) { const u = swingU(phase); return u < 1 ? Math.sin(Math.PI * Math.pow(u, 0.7)) : 0; }

function poseFor(kind, phase = 0, k = 1) {
  const s = Math.sin(phase), c = Math.cos(phase);
  // legs follow a near-triangle wave: constant sweep speed while the foot is on the ground, so it does not skate
  const tri = (2 / Math.PI) * Math.asin(s), legS = 0.85 * tri + 0.15 * s;
  switch (kind) {
    case "walk": case "hurry": {
      const A = GAIT[kind], B = kind === "hurry" ? 1.1 : 0.85, C = kind === "hurry" ? 0.7 : 0.5;
      // the knee folds while the leg swings forward (hip angle rising), stays straight while the foot is on the ground
      return { hip: [A * legS, -A * legS], knee: [-B * swingBend(phase), -B * swingBend(phase + Math.PI)],
        sh: [-C * s, C * s], el: [0.3 + 0.35 * Math.max(0, -s), 0.3 + 0.35 * Math.max(0, s)], lean: kind === "hurry" ? 0.12 : 0.03, headTilt: kind === "hurry" ? 0.06 : 0, lift: 0,
        stance: swingU(phase) < 1 ? 1 : 0 };
    }
    case "run": {
      const A = GAIT.run;
      return { hip: [A * legS, -A * legS], knee: [-0.2 - 1.7 * swingBend(phase), -0.2 - 1.7 * swingBend(phase + Math.PI)],
        sh: [-0.85 * s, 0.85 * s], el: [1.55, 1.55], lean: 0.2, headTilt: 0.04, lift: 16 * Math.abs(s),
        stance: swingU(phase) < 1 ? 1 : 0 };
    }
    case "slumped": // sitting on the ground against a wall, knees up, torso and head slumped forward
      return { sit: true, pelvisY: -30, hip: [2.15, 2.0], knee: [-1.95, -1.75], sh: [0.75, 0.6], el: [0.55, 0.5], lean: 0.32, headTilt: 0.6 };
    case "sit": // on a chair 112 px high
      return { sit: true, pelvisY: -112, hip: [1.57, 1.5], knee: [-1.57, -1.5], sh: [0.35, 0.3], el: [0.9, 0.85], lean: 0.02, headTilt: 0 };
    case "kneel": // one knee on the ground, leaning over someone
      return { hip: [1.35, -0.25], knee: [-1.35, -1.35], sh: [1.15, 0.9], el: [0.35, 0.45], lean: 0.32, headTilt: 0.25 };
    case "watch": // checks the wristwatch on the near arm
      return { hip: [0.04, -0.04], knee: [0, 0], sh: [0.55, 0.05], el: [2.0, 0.15], lean: 0.02, headTilt: 0.3 };
    case "point":
      return { hip: [0.04, -0.04], knee: [0, 0], sh: [1.6, 0.05], el: [0.05, 0.15], lean: 0, headTilt: 0 };
    case "talk":
      return { hip: [0.04, -0.04], knee: [0, 0], sh: [0.75 + 0.25 * Math.sin(phase * 1.3), 0.05], el: [0.9, 0.2], lean: 0, headTilt: -0.04 };
    case "stepover": { // high stride over an obstacle, k = 0..1 through the step
      const lift = Math.sin(clamp(k) * Math.PI);
      return { hip: [0.15 + 1.25 * lift, -0.35 * (1 - lift) - 0.1], knee: [-1.5 * lift, -0.15], sh: [-0.5 + 0.2 * lift, 0.6], el: [0.6, 0.6], lean: 0.12, headTilt: 0.12 };
    }
    default: return { hip: [0.04, -0.04], knee: [0, 0], sh: [0.06, -0.04], el: [0.15, 0.15], lean: 0, headTilt: 0 };
  }
}

// face: { eyes: "open"|"closed"|"half"|"wide", look:[x,y], brows: "neutral"|"worried"|"angry"|"up", mouth: "neutral"|"smile"|"frown"|"o"|"grimace", blinkT }
function drawHead(L, face, t) {
  const r = 46;
  // neck
  ctx.fillStyle = L.skin; ctx.fillRect(-11, 28, 22, 26);
  // hair back
  if (L.hairStyle === "side" || L.hairStyle === "short") { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(-6, -6, r + 4, Math.PI * 0.75, Math.PI * 2.05); ctx.fill(); }
  // head
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.05, 0, 0, 6.29); ctx.fill();
  // ear
  ctx.fillStyle = shade(L.skin, -14); ctx.beginPath(); ctx.ellipse(-12, 6, 9, 13, 0, 0, 6.29); ctx.fill();
  // nose (facing right)
  ctx.fillStyle = shade(L.skin, -10); ctx.beginPath(); ctx.ellipse(r - 2, 8, 9, 7, 0, 0, 6.29); ctx.fill();
  // hair front
  ctx.fillStyle = L.hair;
  if (L.hairStyle === "side") { ctx.beginPath(); ctx.moveTo(-r, -6); ctx.quadraticCurveTo(-r + 6, -r - 18, 10, -r - 6); ctx.quadraticCurveTo(r + 4, -r, r - 2, -18); ctx.quadraticCurveTo(14, -30, -8, -22); ctx.quadraticCurveTo(-24, -10, -r, -6); ctx.fill(); }
  else if (L.hairStyle === "short") { ctx.beginPath(); ctx.moveTo(-r, -2); ctx.quadraticCurveTo(-r, -r - 12, 6, -r - 6); ctx.quadraticCurveTo(r, -r + 4, r - 4, -22); ctx.lineTo(-r + 8, -16); ctx.fill(); }
  else if (L.hairStyle === "bald") { ctx.beginPath(); ctx.ellipse(-24, 4, 18, 26, 0.2, 0, 6.29); ctx.fill(); }
  else if (L.hairStyle === "beanie") {
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(-20, 12, 22, 26, 0.3, 0, 6.29); ctx.fill();
    ctx.fillStyle = L.beanie; ctx.beginPath(); ctx.moveTo(-r - 4, -4); ctx.quadraticCurveTo(-r, -r - 24, 6, -r - 16); ctx.quadraticCurveTo(r + 2, -r - 6, r + 2, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(L.beanie, -12); ctx.fillRect(-r - 4, -14, 2 * r + 6, 14);
  }
  if (L.beard) { ctx.fillStyle = L.beard; ctx.beginPath(); ctx.moveTo(-6, 18); ctx.quadraticCurveTo(10, 56, r - 4, 26); ctx.quadraticCurveTo(r - 10, 40, 20, 46); ctx.quadraticCurveTo(0, 46, -6, 18); ctx.fill(); }
  // eye
  const ex = 22, ey = -6;
  let open = face.eyes === "closed" ? 0 : face.eyes === "half" ? 0.45 : face.eyes === "wide" ? 1.25 : 1;
  if (open > 0 && face.blink !== false) { const b = (t * 0.37 + (face.seed || 0)) % 1; if (b < 0.035) open *= 0.1; }
  if (open > 0.15) {
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ex, ey, 10, 12 * open, 0, 0, 6.29); ctx.fill();
    const [lx, ly] = face.look || [1, 0];
    ctx.fillStyle = "#1A1A22"; ctx.beginPath(); ctx.arc(ex + 3 + lx * 3, ey + ly * 3, 5.5 * Math.min(1, open + 0.2), 0, 6.29); ctx.fill();
  } else { ctx.strokeStyle = "#2A2020"; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(ex, ey - 2, 9, 0.3, Math.PI - 0.3); ctx.stroke(); }
  // brow
  const browA = { neutral: 0, worried: -0.35, angry: 0.4, up: -0.1, focused: 0.2 }[face.brows || "neutral"];
  const browY = face.brows === "up" ? -28 : -21;
  ctx.save(); ctx.translate(ex + 1, ey + browY + 6); ctx.rotate(browA); limb(-10, 0, 10, 0, 5, L.hairStyle === "beanie" ? "#4A3F36" : L.hair === "#9A9A9A" ? "#6E6E6E" : L.hair); ctx.restore();
  // mouth
  ctx.strokeStyle = "#5A2E2A"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath();
  const m = face.mouth || "neutral";
  if (m === "smile") { ctx.arc(26, 18, 10, 0.3, Math.PI - 0.9); ctx.stroke(); }
  else if (m === "frown") { ctx.arc(26, 32, 9, Math.PI + 0.7, -0.3); ctx.stroke(); }
  else if (m === "o") { ctx.fillStyle = "#5A2E2A"; ctx.ellipse(28, 26, 6, 8, 0, 0, 6.29); ctx.fill(); }
  else if (m === "grimace") { ctx.moveTo(16, 28); ctx.quadraticCurveTo(24, 22, 30, 28); ctx.quadraticCurveTo(36, 32, 40, 26); ctx.stroke(); }
  else { ctx.moveTo(18, 26); ctx.lineTo(36, 25); ctx.stroke(); }
  if (L.glasses) { ctx.strokeStyle = "#222"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex + 1, ey, 15, 0, 6.29); ctx.stroke(); limb(ex - 14, ey - 2, -10, ey - 6, 3, "#222"); }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// Draws a character. o = { look, pose, phase, k, face, flip, props: {book, paper, clipboard, watchGlow} }
function character(x, y, scale, look, o = {}) {
  const L = LOOKS[look] || look;
  const P = Object.assign(poseFor(o.pose || "stand", o.phase || 0, o.k || 0), o.override || {});
  const t = o.t || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(o.flip ? -scale : scale, scale);
  if (o.shadow !== false) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 4, P.sit ? 120 : 70, 12, 0, 0, 6.29); ctx.fill(); }
  // plant: the supporting leg (gaits) or the lowest foot / knee (other poses) touches the ground
  const low = i => Math.max(Math.cos(P.hip[i]) * THIGH, Math.cos(P.hip[i]) * THIGH + Math.cos(P.hip[i] + P.knee[i]) * SHIN) + 12;
  const support = P.stance !== undefined ? low(P.stance) : Math.max(low(0), low(1));
  if (P.stance !== undefined) {
    // the swinging leg folds its knee a bit more rather than scraping through the floor
    const sw = 1 - P.stance;
    P.knee = P.knee.slice();
    for (let k = 0; k < 30 && low(sw) > support - 6; k++) P.knee[sw] -= 0.05;
  }
  const pelvisY = (P.pelvisY ?? -support) - (P.lift || 0) + (P.bob || 0);
  const lean = P.lean || 0;
  const neck = { x: Math.sin(lean) * 130, y: pelvisY - Math.cos(lean) * 130 };
  const shoulder = { x: neck.x * 0.92, y: neck.y + 14 };
  // far leg & arm (darker)
  const legW = 30, armW = 22;
  chain(-4, pelvisY, P.hip[1], THIGH, P.knee[1], SHIN, legW, legW - 4, shade(L.pants, -18));
  footAt(-4, pelvisY, P.hip[1], P.knee[1], shade(L.shoes, -10), P.sit);
  const farArm = chain(shoulder.x - 4, shoulder.y, P.sh[1], UPPER_ARM, P.el[1], FOREARM, armW, armW - 3, L.jacketDark);
  ctx.fillStyle = shade(L.skin, -16); ctx.beginPath(); ctx.arc(farArm.ex, farArm.ey, 11, 0, 6.29); ctx.fill();
  // torso
  ctx.save(); ctx.translate(0, pelvisY); ctx.rotate(lean);
  ctx.fillStyle = L.jacket; ctx.beginPath(); ctx.roundRect(-38, -136, 76, 150, [30, 34, 18, 18]); ctx.fill();
  ctx.fillStyle = L.shirt; ctx.beginPath(); ctx.moveTo(10, -136); ctx.lineTo(36, -136); ctx.lineTo(30, -70); ctx.closePath(); ctx.fill();
  if (L.collar) { ctx.fillStyle = "#111"; ctx.fillRect(4, -142, 30, 14); ctx.fillStyle = "#fff"; ctx.fillRect(22, -142, 10, 13); }
  if (L.tie) { ctx.fillStyle = L.tie; ctx.beginPath(); ctx.moveTo(26, -132); ctx.lineTo(34, -132); ctx.lineTo(32, -84); ctx.lineTo(27, -78); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = L.jacketDark; ctx.fillRect(-38, -4, 76, 18);
  ctx.restore();
  // near leg
  chain(4, pelvisY, P.hip[0], THIGH, P.knee[0], SHIN, legW, legW - 4, L.pants);
  footAt(4, pelvisY, P.hip[0], P.knee[0], L.shoes, P.sit);
  // head
  ctx.save(); ctx.translate(neck.x + 4, neck.y - 40); ctx.rotate(P.headTilt || 0);
  drawHead(L, o.face || {}, t);
  ctx.restore();
  // near arm + props in hand
  const arm = chain(shoulder.x + 4, shoulder.y, P.sh[0], UPPER_ARM, P.el[0], FOREARM, armW, armW - 3, shade(L.jacket, 8));
  if (o.props?.book) { ctx.save(); ctx.translate(arm.ex + 6, arm.ey - 4); ctx.rotate(-0.15); ctx.fillStyle = "#7A2E22"; ctx.beginPath(); ctx.roundRect(-30, -40, 56, 74, 6); ctx.fill(); ctx.fillStyle = "#F1E6CF"; ctx.fillRect(22, -36, 6, 66); ctx.fillStyle = "#E0B44A"; ctx.fillRect(-20, -22, 34, 5); ctx.restore(); }
  if (o.props?.paper) { ctx.save(); ctx.translate(arm.ex + 8, arm.ey - 10); ctx.rotate(-0.3); ctx.fillStyle = "#F7F2E6"; ctx.fillRect(-26, -36, 52, 66); ctx.fillStyle = "rgba(0,0,0,.25)"; for (let k = 0; k < 5; k++) ctx.fillRect(-18, -26 + k * 11, 36 - (k % 2) * 10, 3); ctx.restore(); }
  if (o.props?.clipboard) { ctx.save(); ctx.translate(arm.ex + 10, arm.ey - 16); ctx.rotate(-0.2); ctx.fillStyle = "#8B6A48"; ctx.beginPath(); ctx.roundRect(-30, -42, 60, 82, 6); ctx.fill(); ctx.fillStyle = "#F7F2E6"; ctx.fillRect(-24, -32, 48, 66); ctx.fillStyle = "#777"; ctx.fillRect(-10, -46, 20, 10); ctx.restore(); }
  if (o.props?.watch) { ctx.fillStyle = o.props.watchGlow ? "#FF4D4D" : "#DDD"; ctx.beginPath(); ctx.arc(arm.kx + (arm.ex - arm.kx) * 0.8, arm.ky + (arm.ey - arm.ky) * 0.8, 8, 0, 6.29); ctx.fill(); }
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(arm.ex, arm.ey, 12, 0, 6.29); ctx.fill();
  ctx.restore();
}
function footAt(x, y, a1, a2, color, sit) {
  const kx = x + Math.sin(a1) * THIGH, ky = y + Math.cos(a1) * THIGH;
  const ex = kx + Math.sin(a1 + a2) * SHIN, ey = ky + Math.cos(a1 + a2) * SHIN;
  // the foot stays roughly perpendicular to the shin but never points its toes backwards
  const rot = clamp(a1 + a2, -0.9, 0.9);
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(rot);
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(13, 4, 27, 12, 0, 0, 6.29); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- environments
const _cache = {};
function cached(key, w, h, draw) {
  if (!_cache[key]) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); _cache[key] = c; }
  return _cache[key];
}

function nightSky(t, { top = "#090D22", mid = "#1B1638", bottom = "#3A2347" } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const stars = cached("stars", W, 1100, (c, w, h) => { const r = rng(4); for (let i = 0; i < 140; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; c.beginPath(); c.arc(r() * w, r() * h, r() * 2.2 + 0.4, 0, 6.29); c.fill(); } });
  ctx.save(); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 1.7); ctx.drawImage(stars, 0, 0); ctx.restore();
}

function moon(x, y, r) {
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4); g.addColorStop(0, "rgba(255,240,210,.35)"); g.addColorStop(1, "rgba(255,240,210,0)");
  ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.fillStyle = "#FFF2D6"; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
  ctx.fillStyle = "rgba(200,180,150,.35)"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, 6.29); ctx.arc(x + r * 0.35, y + r * 0.3, r * 0.15, 0, 6.29); ctx.fill();
}

// gothic campus skyline (Princeton-like towers); camX shifts with parallax
function skyline(camX, baseY, color = "#1A1735", windowColor = "#FFC97A", par = 0.25) {
  const img = cached("skyline" + color, 2600, 700, (c, w, h) => {
    const r = rng(12); c.fillStyle = color;
    let x = 0;
    while (x < w) {
      const bw = 140 + r() * 220, bh = 220 + r() * 300;
      c.fillRect(x, h - bh, bw, bh);
      if (r() < 0.45) { // tower with spire
        const tx = x + bw * (0.2 + r() * 0.5), tw = 50 + r() * 40, th = bh + 120 + r() * 120;
        c.fillRect(tx, h - th, tw, th);
        c.beginPath(); c.moveTo(tx - 6, h - th); c.lineTo(tx + tw / 2, h - th - 90); c.lineTo(tx + tw + 6, h - th); c.fill();
      } else { // pitched roof
        c.beginPath(); c.moveTo(x - 10, h - bh); c.lineTo(x + bw / 2, h - bh - 70); c.lineTo(x + bw + 10, h - bh); c.fill();
      }
      c.fillStyle = windowColor;
      for (let k = 0; k < bw * bh / 9000; k++) if (r() < 0.35) { c.globalAlpha = 0.5 + r() * 0.5; c.fillRect(x + 14 + r() * (bw - 40), h - bh + 30 + r() * (bh - 60), 12, 20); }
      c.globalAlpha = 1; c.fillStyle = color;
      x += bw + r() * 30;
    }
  });
  const ox = -((camX * par) % 1300) - 300;
  ctx.drawImage(img, ox, baseY - 700);
}

function brickWall(x, y, w, h, camX = 0, { color = "#5A2F2A", mortar = "#3A1E1C" } = {}) {
  const img = cached("brick" + color, 1200, 1200, (c, W2, H2) => {
    c.fillStyle = mortar; c.fillRect(0, 0, W2, H2);
    const r = rng(8), bw = 92, bh = 38;
    for (let row = 0; row * bh < H2; row++) for (let col = -1; col * bw < W2; col++) {
      const bx = col * bw + (row % 2) * bw / 2, by = row * bh;
      const v = r() * 22 - 11;
      c.fillStyle = shade(color, v); c.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
    }
  });
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const ox = -(camX % 1200);
  for (let ix = ox - 1200; ix < x + w; ix += 1200) for (let iy = y; iy < y + h; iy += 1200) ctx.drawImage(img, ix, iy);
  ctx.restore();
}

// street lamp with a warm light cone (additive) + dust motes
function streetLamp(x, groundY, t, { h = 620, glow = 1 } = {}) {
  ctx.fillStyle = "#14161F"; ctx.fillRect(x - 9, groundY - h, 18, h);
  ctx.fillRect(x - 9, groundY - h, 90, 14);
  ctx.fillStyle = "#14161F"; ctx.beginPath(); ctx.moveTo(x + 50, groundY - h + 10); ctx.lineTo(x + 110, groundY - h + 10); ctx.lineTo(x + 96, groundY - h + 46); ctx.lineTo(x + 64, groundY - h + 46); ctx.closePath(); ctx.fill();
  const lx = x + 80, ly = groundY - h + 48;
  if (glow <= 0) return; // lamp switched off (daytime)
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const cone = ctx.createLinearGradient(0, ly, 0, groundY);
  cone.addColorStop(0, `rgba(255,196,110,${0.32 * glow})`); cone.addColorStop(1, `rgba(255,196,110,${0.05 * glow})`);
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(lx - 16, ly); ctx.lineTo(lx + 16, ly); ctx.lineTo(lx + 260, groundY); ctx.lineTo(lx - 260, groundY); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 140); g.addColorStop(0, `rgba(255,220,150,${0.9 * glow})`); g.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = g; ctx.fillRect(lx - 140, ly - 140, 280, 280);
  const pool = ctx.createRadialGradient(lx, groundY, 0, lx, groundY, 300); pool.addColorStop(0, `rgba(255,190,110,${0.25 * glow})`); pool.addColorStop(1, "rgba(255,190,110,0)");
  ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(lx, groundY + 10, 300, 60, 0, 0, 6.29); ctx.fill();
  const r = rng(21);
  for (let i = 0; i < 26; i++) {
    const px = lx + (r() - 0.5) * 360, py = ly + 40 + ((r() * 600 + t * (8 + r() * 14)) % (groundY - ly - 40));
    const spread = (py - ly) / (groundY - ly);
    ctx.fillStyle = `rgba(255,225,170,${0.25 + 0.4 * r()})`; ctx.beginPath(); ctx.arc(lx + (px - lx) * spread + Math.sin(t + i) * 6, py, 1.5 + r() * 2, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

function sidewalk(groundY, camX = 0) {
  const g = ctx.createLinearGradient(0, groundY, 0, H); g.addColorStop(0, "#2B2A33"); g.addColorStop(1, "#141319");
  ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = "#3A3946"; ctx.fillRect(0, groundY, W, 10);
  ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 3;
  const off = -(camX % 220);
  for (let x = off; x < W + 220; x += 220) { ctx.beginPath(); ctx.moveTo(x, groundY + 10); ctx.lineTo(x - 90, groundY + 220); ctx.stroke(); }
}

// doorway set into a wall (wooden door, stone frame, two steps)
function doorway(x, groundY, s = 1) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
  ctx.fillStyle = "#6E6458"; ctx.beginPath(); ctx.roundRect(-150, -430, 300, 430, [130, 130, 0, 0]); ctx.fill();
  ctx.fillStyle = "#2B1D16"; ctx.beginPath(); ctx.roundRect(-115, -395, 230, 395, [105, 105, 0, 0]); ctx.fill();
  ctx.fillStyle = "#3A281E"; ctx.fillRect(-100, -300, 95, 290); ctx.fillRect(5, -300, 95, 290);
  ctx.fillStyle = "#C9A24A"; ctx.beginPath(); ctx.arc(-18, -150, 7, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#77706A"; ctx.fillRect(-180, -30, 360, 30); ctx.fillStyle = "#86807A"; ctx.fillRect(-200, -6, 400, 10);
  ctx.restore();
}

// warm office interior used for the questionnaire / instruction scenes
function office(t, { clockMin = 0, day = false } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#3A2B26"); g.addColorStop(1, "#22191A");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2C201C"; ctx.fillRect(0, 1060, W, 26); // wainscot rail
  ctx.fillStyle = "#1E1614"; ctx.fillRect(0, 1086, W, H);
  // window with night outside
  ctx.save(); ctx.beginPath(); ctx.roundRect(640, 330, 320, 440, 12); ctx.clip();
  const sg = ctx.createLinearGradient(0, 330, 0, 770); sg.addColorStop(0, day ? "#7FB2E5" : "#0E1330"); sg.addColorStop(1, day ? "#E9DCC4" : "#2C1F45"); ctx.fillStyle = sg; ctx.fillRect(640, 330, 320, 440);
  if (day) skyline(0, 790, "#8C93AD", "#C9D3E6", 0); else { moon(860, 420, 34); skyline(0, 790, "#15122B", "#FFC97A", 0); }
  ctx.restore();
  ctx.strokeStyle = "#5A4334"; ctx.lineWidth = 18; ctx.strokeRect(640, 330, 320, 440); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(800, 330); ctx.lineTo(800, 770); ctx.moveTo(640, 550); ctx.lineTo(960, 550); ctx.stroke();
  // wall clock
  iconClock(260, 430, 170, clockMin, { ring: "#7A5A3A", face: "#F6EEDC", hand: "#2A1E18" });
  // desk lamp glow
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const lg = ctx.createRadialGradient(330, 980, 0, 330, 980, 520); lg.addColorStop(0, "rgba(255,190,110,.32)"); lg.addColorStop(1, "rgba(255,190,110,0)");
  ctx.fillStyle = lg; ctx.fillRect(0, 460, 900, 1040); ctx.restore();
}

function desk(x, y, w = 560) {
  ctx.fillStyle = "#5C3F2C"; ctx.fillRect(x - w / 2, y, w, 26);
  ctx.fillStyle = "#4A3223"; ctx.fillRect(x - w / 2 + 20, y + 26, 26, 240); ctx.fillRect(x + w / 2 - 46, y + 26, 26, 240);
  // lamp
  ctx.fillStyle = "#2F3A2F"; ctx.fillRect(x - w / 2 + 60, y - 10, 70, 10); limb(x - w / 2 + 95, y - 10, x - w / 2 + 95, y - 150, 8, "#2F3A2F");
  ctx.fillStyle = "#3E5A3E"; ctx.beginPath(); ctx.moveTo(x - w / 2 + 55, y - 150); ctx.lineTo(x - w / 2 + 145, y - 150); ctx.lineTo(x - w / 2 + 125, y - 200); ctx.lineTo(x - w / 2 + 75, y - 200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#FFE3A8"; ctx.fillRect(x - w / 2 + 62, y - 152, 76, 5);
  // papers
  ctx.fillStyle = "#F4EEDF"; ctx.save(); ctx.translate(x + 40, y - 4); ctx.rotate(-0.06); ctx.fillRect(-70, -8, 140, 8); ctx.restore();
}

// paper texture card (notes, map)
function paper(x, y, w, h, { rot = 0, color = "#F3EAD3", shadow = true } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (shadow) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; }
  ctx.fillStyle = color; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = "transparent";
  const tex = cached("paper", 512, 512, (c) => { const img = c.createImageData(512, 512); const r = rng(3); for (let i = 0; i < img.data.length; i += 4) { const v = 120 + r() * 60; img.data[i] = v; img.data[i + 1] = v * 0.95; img.data[i + 2] = v * 0.8; img.data[i + 3] = 26; } c.putImageData(img, 0, 0); });
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); ctx.drawImage(tex, -w / 2, -h / 2, Math.max(w, 512), Math.max(h, 512)); ctx.restore();
  ctx.restore();
}

// handwritten text block on a note
function handwrite(lines, x, y, size, color, t, t0, cps = 22, { font = "Caveat", align = "left", lh = 1.2 } = {}) {
  let shown = Math.max(0, Math.floor((t - t0) * cps));
  ctx.save(); ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle";
  lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, shown)); shown -= l.length; ctx.fillText(part, x, y + i * size * lh); });
  ctx.restore();
}

// light leak / lens flare flash for transitions
function lightLeak(x, y, a, color = "255,170,90") {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, 900); g.addColorStop(0, `rgba(${color},${0.55 * a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------------------------------------------------------------- explanatory components

// Paper campus map seen from above: building A (start) -> path -> alley -> building B; p = route progress 0..1
function campusMap(cx, cy, s, p, t, { labels = ["DÉPART", "ENREGISTREMENT"], alleyMark = 0 } = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  paper(0, 0, 820, 980, { rot: -0.02, color: "#EFE3C6" });
  ctx.rotate(-0.02);
  // lawns and roads
  ctx.fillStyle = "#CBD8A8"; ctx.fillRect(-380, -450, 760, 900);
  ctx.fillStyle = "#E6D9B8"; ctx.fillRect(-60, -450, 120, 900); ctx.fillRect(-380, -40, 760, 110);
  ctx.strokeStyle = "rgba(120,100,70,.35)"; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.moveTo(0, -450); ctx.lineTo(0, 450); ctx.moveTo(-380, 15); ctx.lineTo(380, 15); ctx.stroke(); ctx.setLineDash([]);
  // buildings
  const bld = (x, y, w, h, c, label) => {
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x - w / 2 + 10, y - h / 2 + 12, w, h);
    ctx.fillStyle = c; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = "#5B4A36"; ctx.lineWidth = 4; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.font = `${Math.min(30, (w - 20) / label.length * 1.6)}px MontX`; ctx.fillStyle = "#3B2E22"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, x, y);
  };
  bld(-200, -300, 260, 180, "#D9B99B", labels[0]);
  bld(210, 300, 280, 180, "#C9B7D6", labels[1]);
  // the alley between two blocks
  ctx.fillStyle = "#A7967F"; ctx.fillRect(110, -230, 250, 120); ctx.fillRect(110, -90, 250, 50);
  ctx.fillStyle = "#4A3B2E"; ctx.fillRect(110, -110, 250, 20);
  // trees
  const r = rng(5);
  for (let i = 0; i < 14; i++) { const x = -360 + r() * 300, y = -120 + r() * 520; if (x > -80) continue; ctx.fillStyle = "#7FA46A"; ctx.beginPath(); ctx.arc(x, y, 18 + r() * 10, 0, 6.29); ctx.fill(); }
  // route (red dashed, drawn progressively) + walking dot
  const pts = [[-200, -205], [-200, -120], [0, -120], [0, 15], [80, 15], [80, 210], [130, 210]];
  drawPath(pts, p, { color: "#D8342C", width: 10, dash: [18, 14], offset: -t * 30 });
  if (p > 0.01) { const [x, y] = pointOnPath(pts, p); ctx.fillStyle = "#D8342C"; ctx.beginPath(); ctx.arc(x, y, 18, 0, 6.29); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.29); ctx.fill(); }
  // alley marker
  if (alleyMark > 0) {
    ctx.save(); ctx.translate(40, -100); ctx.scale(easeOutBack(clamp(alleyMark), 2.5), easeOutBack(clamp(alleyMark), 2.5));
    ctx.fillStyle = "#FFC93C"; ctx.strokeStyle = "#3B2E22"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, 6.29); ctx.fill(); ctx.stroke();
    ctx.font = "54px MontX"; ctx.fillStyle = "#3B2E22"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 0, 3);
    ctx.restore();
  }
  // compass
  ctx.strokeStyle = "#5B4A36"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-300, 360, 44, 0, 6.29); ctx.stroke();
  ctx.font = "28px MontX"; ctx.fillStyle = "#5B4A36"; ctx.textAlign = "center"; ctx.fillText("N", -300, 312);
  ctx.beginPath(); ctx.moveTo(-300, 330); ctx.lineTo(-290, 362); ctx.lineTo(-310, 362); ctx.closePath(); ctx.fill();
  ctx.restore();
  return pts;
}

// Questionnaire sheet with checkboxes being ticked; p = 0..1
function questionnaire(cx, cy, s, p, { title = "QUESTIONNAIRE" } = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  paper(0, 0, 560, 720, { rot: 0.03 });
  ctx.rotate(0.03);
  ctx.font = "36px MontX"; ctx.fillStyle = "#2B2B33"; ctx.textAlign = "center"; ctx.fillText(title, 0, -300);
  for (let i = 0; i < 7; i++) {
    const y = -220 + i * 78;
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-200, y - 6, 260 - (i % 3) * 40, 8); ctx.fillRect(-200, y + 14, 180 - (i % 2) * 50, 6);
    ctx.strokeStyle = "#2B2B33"; ctx.lineWidth = 4; ctx.strokeRect(150, y - 18, 40, 40);
    if (p * 7 > i + 0.3) { ctx.strokeStyle = "#1E5BD8"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(156, y); ctx.lineTo(168, y + 14); ctx.lineTo(196, y - 22); ctx.stroke(); }
  }
  ctx.restore();
}

// 0..5 helping scale drawn as a staircase; level highlighted with value
function helpScale(cx, cy, s, p, labels, hi = -1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  const cols = ["#5C6378", "#8B6FB8", "#4F8FD8", "#3DB6C8", "#3DDC84", "#FFC93C"];
  labels.forEach((lab, i) => {
    const q = easeOutBack(clamp(p * 6 - i), 2); if (q <= 0) return;
    const x = -420 + i * 150, h = 90 + i * 70;
    ctx.save(); ctx.translate(x, 0); ctx.scale(1, q);
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.roundRect(0, -h, 130, h, [16, 16, 0, 0]); ctx.fill();
    if (i === hi) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.stroke(); }
    ctx.restore();
    txt(String(i), x + 65, -h + 46, 62, "MontX", "#0E1322", { alpha: clamp(q) });
    ctx.save(); ctx.translate(x + 65, 30); ctx.rotate(-0.0);
    wrap(lab, 26, "MontX", 140).forEach((l, k) => txt(l, 0, 10 + k * 30, 26, "MontX", i === hi ? "#fff" : "rgba(255,255,255,.75)", { alpha: clamp(q) }));
    ctx.restore();
  });
  ctx.restore();
}

// row of 10 little people, `share` of them highlighted (fractional allowed), animated by p
function peopleRow(x, y, size, share, p, color, { dim = "rgba(255,255,255,.16)", n = 10, gap = 1.0 } = {}) {
  for (let i = 0; i < n; i++) {
    const q = easeOutBack(clamp(p * n * 1.2 - i), 2); if (q <= 0) continue;
    const filled = clamp(share * n * clamp(p * 1.3) - i);
    const cx = x + i * size * 0.62 * gap;
    ctx.save(); ctx.translate(cx, y); ctx.scale(q, q);
    iconPerson(0, 0, size, dim);
    if (filled > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-size, size * 0.8 - size * 1.6 * filled, size * 2, size * 1.6 * filled + 4); ctx.clip(); iconPerson(0, 0, size, color); ctx.restore(); }
    ctx.restore();
  }
}

// tug of war between two obligations; bias -1..1 (negative = left wins)
function tugOfWar(cx, cy, s, t, bias, left, right, { lc = "#3DDC84", rc = "#FF4D4D" } = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  const shift = bias * 90 + Math.sin(t * 3) * 10;
  ctx.strokeStyle = "#C9A26A"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-380, -40); ctx.quadraticCurveTo(shift, -10, 380, -40); ctx.stroke();
  ctx.fillStyle = "#FFC93C"; ctx.beginPath(); ctx.moveTo(shift - 18, -26); ctx.lineTo(shift + 18, -26); ctx.lineTo(shift, 20); ctx.closePath(); ctx.fill();
  iconPerson(-420, 10, 170, lc, { pose: "run", phase: 2.2, flip: true });
  iconPerson(420, 10, 170, rc, { pose: "run", phase: 2.2 });
  txt(left, -330, 170, 40, "MontX", lc); txt(right, 330, 170, 40, "MontX", rc);
  ctx.restore();
}

// big quote card with serif italic text
function quoteCard(cx, cy, w, lines, p, { author = "", size = 64, color = "#F4EFE6" } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); const q = easeOutBack(clamp(p), 1.6); ctx.scale(q, q); ctx.globalAlpha = clamp(p * 2);
  ctx.fillStyle = "rgba(14,19,34,.86)"; ctx.strokeStyle = "rgba(255,201,60,.8)"; ctx.lineWidth = 4;
  const h = lines.length * size * 1.25 + (author ? 120 : 70);
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 30); ctx.fill(); ctx.stroke();
  txt("“", -w / 2 + 70, -h / 2 + 50, 180, "Playfair", "#FFC93C");
  lines.forEach((l, i) => txt(l, 0, -h / 2 + 70 + size * 0.6 + i * size * 1.25, size, "Playfair", color));
  if (author) txt(author, w / 2 - 40, h / 2 - 44, 30, "MontX", "rgba(255,255,255,.6)", { align: "right" });
  ctx.restore();
}

// 3x5 index card with a pen-sketched map drawn progressively (p 0..1), handwritten labels
function indexCardMap(cx, cy, s, p, t, { from = "ICI", to = "Labo du Pr Steiner", alley = 0 } = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(-0.05);
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#FBF8EE"; ctx.fillRect(-420, -260, 840, 520); ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(70,120,200,.35)"; ctx.lineWidth = 3;
  for (let y = -170; y < 260; y += 56) { ctx.beginPath(); ctx.moveTo(-420, y); ctx.lineTo(420, y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(220,80,80,.5)"; ctx.beginPath(); ctx.moveTo(-420, -205); ctx.lineTo(420, -205); ctx.stroke();
  const ink = "#1E2A6E";
  const seg = (k, f) => { const q = clamp(p * 6 - k); if (q > 0) f(q); };
  ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  seg(0, q => { ctx.strokeRect(-360, -150, 190 * q, 150); });                       // building A
  seg(1, q => { ctx.strokeRect(170, 40, 190, 150 * q); });                          // building B
  seg(2, q => { ctx.beginPath(); ctx.moveTo(-60, -160); ctx.lineTo(-60, -160 + 180 * q); ctx.moveTo(40, -160); ctx.lineTo(40, -160 + 180 * q); ctx.stroke(); }); // alley walls
  seg(3, q => { drawPath([[-170, -75], [-10, -75], [-10, 115], [170, 115]], q, { color: "#D8342C", width: 7, dash: [16, 12] }); });
  seg(4, q => { ctx.font = "44px Caveat"; ctx.fillStyle = ink; ctx.globalAlpha = q; ctx.fillText(from, -330, -185); ctx.fillText(to, 120, 238); ctx.globalAlpha = 1; });
  seg(5, q => { ctx.beginPath(); ctx.moveTo(150, 100); ctx.lineTo(170, 115); ctx.lineTo(150, 130); ctx.stroke(); });
  if (alley > 0) {
    ctx.save(); ctx.translate(-10, -10); const a = easeOutBack(clamp(alley), 2.5); ctx.scale(a, a);
    ctx.strokeStyle = "#D8342C"; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 90, 70, 0.2, 0, 6.29); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function microphone(x, y, s, t, { live = true } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  limb(0, 40, 0, 150, 10, "#2A2D38"); ctx.fillStyle = "#2A2D38"; ctx.beginPath(); ctx.ellipse(0, 152, 60, 12, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#3A3E4D"; ctx.beginPath(); ctx.roundRect(-34, -70, 68, 120, 34); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 3;
  for (let k = -50; k < 40; k += 14) { ctx.beginPath(); ctx.moveTo(-28, k); ctx.lineTo(28, k); ctx.stroke(); }
  if (live) { ctx.fillStyle = Math.sin(t * 6) > 0 ? "#FF4D4D" : "#7A2020"; ctx.beginPath(); ctx.arc(60, -60, 12, 0, 6.29); ctx.fill(); txt("REC", 112, -58, 26, "MontX", "#FF4D4D"); }
  ctx.restore();
}

// small score card held up (the "victim" secretly grading), value 0..5
function scoreCard(x, y, s, value, p) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); const q = easeOutBack(clamp(p), 2.2); ctx.scale(q * s / 100, q * s / 100); ctx.rotate(0.08);
  ctx.fillStyle = "#FBF8EE"; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.roundRect(-60, -80, 120, 160, 12); ctx.fill(); ctx.shadowColor = "transparent";
  txt(String(value), 0, 10, 110, "MontX", value >= 3 ? "#1F9D55" : "#D8342C");
  txt("/5", 38, 58, 26, "MontX", "#555");
  ctx.restore();
}

// cold, clear winter morning (the real sessions ran in daytime)
function daySky(t, { top = "#6FA6DC", mid = "#B9D6EE", bottom = "#EFE0C6" } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, 1100); g.addColorStop(0, top); g.addColorStop(0.6, mid); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sx = 840, sy = 300;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 420); sg.addColorStop(0, "rgba(255,246,220,.9)"); sg.addColorStop(0.15, "rgba(255,240,200,.55)"); sg.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = sg; ctx.fillRect(sx - 420, sy - 420, 840, 840);
  ctx.fillStyle = "#FFF8E6"; ctx.beginPath(); ctx.arc(sx, sy, 58, 0, 6.29); ctx.fill();
  const r = rng(31);
  for (let i = 0; i < 5; i++) {
    const cx = ((r() * 1400 + t * (10 + i * 4)) % 1500) - 200, cy = 180 + r() * 380, s = 0.6 + r() * 0.8;
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (const [dx, dy, rr] of [[0, 0, 60], [55, 10, 48], [-55, 12, 44], [25, -30, 46]]) { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, rr * s, 0, 6.29); ctx.fill(); }
  }
}
