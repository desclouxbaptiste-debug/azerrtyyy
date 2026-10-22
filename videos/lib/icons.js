// Flat vector pictograms for motion-design videos (classic script, after core.js).
// Every icon is drawn centred on (x, y) with size s; animation comes from the parameters.

function roundLine(x1, y1, x2, y2, w, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

// Person pictogram. pose: stand | walk | run | slumped | point | think. phase drives the walk cycle.
function iconPerson(x, y, s, color, { pose = "stand", phase = 0, collar = false, alpha = 1, flip = false, head = null } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s / 100 : s / 100, s / 100); ctx.globalAlpha *= alpha;
  const limb = 15, sw = Math.sin(phase), lean = pose === "run" ? 0.28 : pose === "walk" ? 0.08 : 0;
  if (pose === "slumped") {
    // sitting against a wall, knees up, head down
    ctx.fillStyle = color;
    roundLine(-6, 40, 30, 22, limb, color); roundLine(30, 22, 44, 58, limb, color);
    roundLine(-2, 44, 26, 30, limb, color); roundLine(26, 30, 38, 62, limb, color);
    ctx.beginPath(); ctx.roundRect(-26, -22, 34, 66, 16); ctx.fill();
    roundLine(-8, -8, 22, 22, limb * 0.85, color);
    ctx.beginPath(); ctx.arc(4, -38, 17, 0, 6.29); ctx.fill();
    ctx.restore(); return;
  }
  ctx.rotate(lean);
  const legA = pose === "stand" || pose === "point" || pose === "think" ? 0.1 : sw * (pose === "run" ? 0.75 : 0.5);
  const armA = pose === "stand" ? 0.15 : -sw * (pose === "run" ? 0.9 : 0.5);
  const bob = pose === "walk" || pose === "run" ? Math.abs(Math.cos(phase)) * -5 : 0;
  ctx.translate(0, bob);
  // legs
  roundLine(-7, 28, -7 + Math.sin(legA) * 46, 28 + Math.cos(legA) * 46, limb, color);
  roundLine(7, 28, 7 + Math.sin(-legA) * 46, 28 + Math.cos(-legA) * 46, limb, color);
  // body
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-20, -28, 40, 64, 18); ctx.fill();
  // arms
  if (pose === "point") { roundLine(-14, -16, -20, 26, limb * 0.85, color); roundLine(14, -16, 56, -24, limb * 0.85, color); }
  else if (pose === "think") { roundLine(-14, -16, -20, 26, limb * 0.85, color); roundLine(14, -16, 26, 10, limb * 0.85, color); roundLine(26, 10, 8, -36, limb * 0.85, color); }
  else {
    roundLine(-14, -16, -14 + Math.sin(armA) * 40, -16 + Math.cos(armA) * 40, limb * 0.85, color);
    roundLine(14, -16, 14 + Math.sin(-armA) * 40, -16 + Math.cos(-armA) * 40, limb * 0.85, color);
  }
  if (collar) { ctx.fillStyle = "#ffffff"; ctx.fillRect(-8, -30, 16, 8); }
  ctx.fillStyle = head || color; ctx.beginPath(); ctx.arc(0, -50, 19, 0, 6.29); ctx.fill();
  ctx.restore();
}

function iconClock(x, y, s, minutes, { ring = "#FF4D4D", face = "#F4EFE6", hand = "#151824", glow = null } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 40; }
  ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(0, 0, 50, 0, 6.29); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, 0, 41, 0, 6.29); ctx.fill();
  ctx.fillStyle = ring; ctx.fillRect(-7, -62, 14, 10); ctx.beginPath(); ctx.arc(0, -64, 8, 0, 6.29); ctx.fill();
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; roundLine(Math.sin(a) * 33, -Math.cos(a) * 33, Math.sin(a) * 37, -Math.cos(a) * 37, 3, hand); }
  const am = minutes / 60 * Math.PI * 2, ah = minutes / 720 * Math.PI * 2;
  roundLine(0, 0, Math.sin(ah) * 20, -Math.cos(ah) * 20, 6, hand);
  roundLine(0, 0, Math.sin(am) * 30, -Math.cos(am) * 30, 4, hand);
  ctx.fillStyle = hand; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.29); ctx.fill();
  ctx.restore();
}

function iconBook(x, y, s, { cover = "#B5523B", open = 0, pages = "#F4EFE6", title = "" } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  if (open > 0) {
    const o = open;
    ctx.fillStyle = cover; ctx.beginPath(); ctx.roundRect(-58, -40, 116, 84, 8); ctx.fill();
    ctx.fillStyle = pages;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(-26, -40, -52, -34); ctx.lineTo(-52, 36); ctx.quadraticCurveTo(-26, 30, 0, 40); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(26, -40, 52 * o, -34); ctx.lineTo(52 * o, 36); ctx.quadraticCurveTo(26, 30, 0, 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-44, -18 + k * 14); ctx.lineTo(-10, -14 + k * 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(10 * o, -14 + k * 14); ctx.lineTo(44 * o, -18 + k * 14); ctx.stroke(); }
  } else {
    ctx.fillStyle = pages; ctx.beginPath(); ctx.roundRect(-36, -46, 76, 94, 6); ctx.fill();
    ctx.fillStyle = cover; ctx.beginPath(); ctx.roundRect(-42, -50, 76, 96, 8); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(-30, -24, 52, 6); ctx.fillRect(-30, -12, 36, 6);
    if (title) { ctx.font = "16px MontX"; ctx.textAlign = "center"; ctx.fillText(title, -4, 20); }
  }
  ctx.restore();
}

function iconBuilding(x, y, s, color, { label = "", windows = "#FFD889" } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-60, -70, 120, 140, 6); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-66, -78, 132, 12);
  ctx.fillStyle = windows;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 2 && c === 1)) ctx.fillRect(-44 + c * 34, -52 + r * 34, 20, 22);
  ctx.fillStyle = "#5a3b2c"; ctx.fillRect(-12, 36, 24, 34);
  if (label) { ctx.font = "15px MontX"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 0, -88); }
  ctx.restore();
}

function iconCheck(x, y, s, p, color = "#3DDC84") {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 50 * easeOutBack(clamp(p * 2), 2), 0, 6.29); ctx.fill();
  const q = clamp(p * 2 - 0.6) / 1.4 * 1.4;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
  ctx.moveTo(-22, 2); const a = clamp(q * 2); ctx.lineTo(-22 + 14 * a, 2 + 16 * a);
  if (q > 0.5) { const b = clamp((q - 0.5) * 2); ctx.lineTo(-8 + 32 * b, 18 - 36 * b); }
  ctx.stroke(); ctx.restore();
}

function iconCross(x, y, s, p, color = "#FF4D4D") {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 50 * easeOutBack(clamp(p * 2), 2), 0, 6.29); ctx.fill();
  const q = clamp(p * 2 - 0.6) / 1.4 * 1.4;
  const a = clamp(q * 2), b = clamp(q * 2 - 1);
  roundLine(-20, -20, -20 + 40 * a, -20 + 40 * a, 12, "#fff");
  if (b > 0) roundLine(20, -20, 20 - 40 * b, -20 + 40 * b, 12, "#fff");
  ctx.restore();
}

function iconPhone(x, y, s, t, { notifs = 0, color = "#151824", screen = "#22283a" } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-50, -95, 100, 190, 18); ctx.fill();
  ctx.fillStyle = screen; ctx.beginPath(); ctx.roundRect(-43, -84, 86, 168, 12); ctx.fill();
  const cols = ["#4DD6FF", "#FFD23F", "#FF4D4D", "#3DDC84", "#B48CFF"];
  for (let k = 0; k < notifs; k++) {
    const yy = -66 + k * 30;
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.roundRect(-38, yy, 76, 24, 7); ctx.fill();
    ctx.fillStyle = cols[k % 5]; ctx.beginPath(); ctx.arc(-26, yy + 12, 7, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-14, yy + 7, 40, 4); ctx.fillRect(-14, yy + 14, 26, 4);
  }
  ctx.restore();
}

function iconBubble(x, y, w, h, text, { bg = "#F4EFE6", fg = "#151824", size = 40, tail = "left", p = 1 } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); const sc = easeOutBack(clamp(p), 2); ctx.scale(sc, sc);
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 3); ctx.fill();
  ctx.beginPath(); const tx = tail === "left" ? -w / 4 : w / 4;
  ctx.moveTo(tx - 18, h / 2 - 2); ctx.lineTo(tx + (tail === "left" ? -30 : 30), h / 2 + 34); ctx.lineTo(tx + 18, h / 2 - 2); ctx.fill();
  ctx.fillStyle = fg; ctx.font = `${size}px MontX`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 0, 3);
  ctx.restore();
}

// progressive dashed path (polyline of points), p in 0..1
function drawPath(points, p, { color = "rgba(255,255,255,.35)", width = 8, dash = [2, 22], offset = 0 } = {}) {
  let total = 0; const L = [];
  for (let i = 1; i < points.length; i++) { const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); L.push(l); total += l; }
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.setLineDash(dash); ctx.lineDashOffset = offset;
  ctx.beginPath(); ctx.moveTo(...points[0]);
  let left = total * clamp(p);
  for (let i = 1; i < points.length && left > 0; i++) {
    const k = Math.min(1, left / L[i - 1]);
    ctx.lineTo(lerp(points[i - 1][0], points[i][0], k), lerp(points[i - 1][1], points[i][1], k)); left -= L[i - 1];
  }
  ctx.stroke(); ctx.restore();
  return total;
}
function pointOnPath(points, p) {
  let total = 0; const L = [];
  for (let i = 1; i < points.length; i++) { const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]); L.push(l); total += l; }
  let d = total * clamp(p);
  for (let i = 1; i < points.length; i++) {
    if (d <= L[i - 1] || i === points.length - 1) { const k = clamp(d / L[i - 1]); return [lerp(points[i - 1][0], points[i][0], k), lerp(points[i - 1][1], points[i][1], k)]; }
    d -= L[i - 1];
  }
  return points[points.length - 1];
}

// percentage ring with counter
function ring(x, y, r, pct, p, color, { track = "rgba(255,255,255,.1)", width = 26, label = "", size = 96 } = {}) {
  ctx.save();
  ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.strokeStyle = track; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.stroke();
  const v = pct * easeOutExpo(clamp(p));
  if (v > 0) { ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + v / 100 * Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  txt(`${Math.round(v)} %`, x, y + 4, size, "MontX", "#fff");
  if (label) txt(label, x, y + r + 62, 38, "MontX", color, { spacing: 2 });
}
