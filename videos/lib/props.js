// Props for the social-psychology series (classic script, after core.js, icons.js, illus.js).
// All drawn with flat shapes; every function draws centred on (cx, cy) unless it takes a ground line.

function roundRectFill(x, y, w, h, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

// ---------------------------------------------------------------- Asch
// Card with the reference line (left) and three comparison lines A B C. hi = index to circle, wrong = index stamped by the group.
function lineCard(cx, cy, s, { p = 1, hi = -1, wrong = -1, t = 0 } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); const q = easeOutBack(clamp(p), 1.6); ctx.scale(s * q, s * q);
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  roundRectFill(-430, -260, 860, 520, 26, "#F6F1E6"); ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-150, -210); ctx.lineTo(-150, 210); ctx.stroke();
  const L = [250, 330, 190], ref = 250, col = "#1C1F2B";
  roundRectFill(-310, 150 - ref, 34, ref, 8, col);
  txt("X", -293, 190, 40, "MontX", "#9A9384");
  ["A", "B", "C"].forEach((n, i) => {
    const x = -20 + i * 150, h = L[i];
    roundRectFill(x, 150 - h, 34, h, 8, i === wrong ? "#E0524A" : col);
    txt(n, x + 17, 190, 40, "MontX", i === hi ? "#1F9D55" : "#9A9384");
    if (i === hi) { ctx.strokeStyle = "#1F9D55"; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(x + 17, 30, 70, 175, 0, 0, 6.29); ctx.stroke(); }
  });
  ctx.restore();
}

// ---------------------------------------------------------------- Bandura
// Inflatable clown (weighted base, wobbles back up). wob = current lean angle (rad).
function bobo(x, groundY, s, wob = 0) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 4, 120, 18, 0, 0, 6.29); ctx.fill();
  ctx.rotate(wob); ctx.translate(0, -10);
  // body
  const g = ctx.createLinearGradient(-110, 0, 110, 0); g.addColorStop(0, "#C62D2D"); g.addColorStop(0.5, "#F04848"); g.addColorStop(1, "#B42626");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -170, 110, 170, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; for (const [dx, dy] of [[-40, -140], [35, -90], [-20, -60], [50, -190], [-60, -220]]) { ctx.beginPath(); ctx.arc(dx, dy, 14, 0, 6.29); ctx.fill(); }
  // head
  ctx.fillStyle = "#F8EFE2"; ctx.beginPath(); ctx.arc(0, -380, 80, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#E23B3B"; ctx.beginPath(); ctx.arc(0, -372, 16, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#1C1C24"; ctx.beginPath(); ctx.arc(-28, -400, 9, 0, 6.29); ctx.arc(28, -400, 9, 0, 6.29); ctx.fill();
  ctx.strokeStyle = "#C62D2D"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, -362, 34, 0.35, Math.PI - 0.35); ctx.stroke();
  ctx.fillStyle = "#2E7DD1"; ctx.beginPath(); ctx.moveTo(-60, -440); ctx.lineTo(0, -540); ctx.lineTo(60, -440); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#FFD23F"; ctx.beginPath(); ctx.arc(0, -545, 16, 0, 6.29); ctx.fill();
  // weighted base
  ctx.fillStyle = "#3B3F4E"; ctx.beginPath(); ctx.ellipse(0, -8, 112, 30, 0, 0, Math.PI); ctx.fill();
  ctx.restore();
}
// damped wobble after hits at given times
function boboWobble(t, hits) {
  let a = 0;
  for (const h of hits) if (t >= h) a += 0.55 * Math.exp(-(t - h) * 3) * Math.sin((t - h) * 11);
  return clamp(a, -0.75, 0.75);
}
function toys(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  roundRectFill(-120, -60, 80, 60, 8, "#3DA5E0"); roundRectFill(-110, -110, 60, 50, 8, "#FFD23F"); roundRectFill(-40, -60, 70, 60, 8, "#3DDC84");
  ctx.fillStyle = "#E2533F"; ctx.beginPath(); ctx.arc(90, -40, 40, 0, 6.29); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(52, -46, 76, 10);
  ctx.restore();
}
// one-way mirror: dark glass with faint observers behind
function oneWayMirror(x, y, w, h, t, reveal = 0) {
  roundRectFill(x - 12, y - 12, w + 24, h + 24, 10, "#5B5048");
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, "#9FB3C4"); g.addColorStop(1, "#5E7183");
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.moveTo(x + w * 0.15, y); ctx.lineTo(x + w * 0.35, y); ctx.lineTo(x + w * 0.1, y + h); ctx.lineTo(x - w * 0.1, y + h); ctx.fill();
  if (reveal > 0) {
    ctx.save(); ctx.globalAlpha = reveal * 0.85; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = "#1E2A38"; ctx.fillRect(x, y, w, h);
    character(x + w * 0.35, y + h + 120, 0.75, "researcher", { pose: "stand", flip: true, face: { look: [-1, 0] }, props: { clipboard: true }, t, shadow: false });
    character(x + w * 0.72, y + h + 120, 0.75, "woman", { pose: "stand", flip: true, face: { look: [-1, 0.2] }, t, shadow: false });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Stanford
function prisonCorridor(t, { sign = true } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2B2D33"); g.addColorStop(1, "#16171B");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // cinder-block wall
  ctx.fillStyle = "#5C5F66"; ctx.fillRect(0, 330, W, 860);
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 3;
  for (let y = 330; y < 1190; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); for (let x = ((y / 60) % 2) * 60; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 60); ctx.stroke(); } }
  // cell doors
  for (const cx of [210, 870]) {
    roundRectFill(cx - 140, 560, 280, 630, 6, "#1A1B20");
    ctx.strokeStyle = "#8E949E"; ctx.lineWidth = 12;
    for (let k = 0; k < 7; k++) { const bx = cx - 120 + k * 40; ctx.beginPath(); ctx.moveTo(bx, 570); ctx.lineTo(bx, 1180); ctx.stroke(); }
    ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(cx - 140, 700); ctx.lineTo(cx + 140, 700); ctx.stroke();
  }
  if (sign) { roundRectFill(330, 400, 420, 110, 10, "#E9E1CC"); txt("STANFORD", 540, 438, 40, "MontX", "#2B2B33", { spacing: 3 }); txt("COUNTY JAIL", 540, 482, 34, "MontX", "#B03A2E", { spacing: 4 }); }
  // ceiling light
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const lg = ctx.createRadialGradient(540, 340, 0, 540, 340, 700); lg.addColorStop(0, "rgba(255,240,200,.28)"); lg.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.fillStyle = "#3A3A40"; ctx.fillRect(0, 1180, W, H - 1180); ctx.fillStyle = "#4A4A52"; ctx.fillRect(0, 1180, W, 10);
}
function newspaperAd(cx, cy, s, t, t0) {
  const p = pop(t, t0); if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.05); ctx.scale(s * p, s * p);
  paper(0, 0, 640, 480, { color: "#EFE7D2" });
  txt("ÉTUDIANTS RECHERCHÉS", 0, -170, 44, "MontX", "#2B2B33", { spacing: 1 });
  ctx.fillStyle = "#2B2B33"; ctx.fillRect(-280, -130, 560, 4);
  txt("Étude sur la vie en prison", 0, -80, 46, "Playfair", "#2B2B33");
  txt("1 à 2 semaines", 0, -10, 42, "Playfair", "#2B2B33");
  ctx.save(); ctx.rotate(-0.08); roundRectFill(-160, 50, 320, 110, 14, "#C0392B"); txt("15 $ / JOUR", 0, 106, 54, "MontX", "#fff"); ctx.restore();
  ctx.restore();
}
function coinFlip(x, y, s, t, t0, result = "G") {
  const p = prog(t, t0, t0 + 0.9); if (p <= 0) return;
  const h = Math.sin(p * Math.PI) * 220, sx = Math.cos(p * 18);
  ctx.save(); ctx.translate(x, y - h); ctx.scale(s * (p >= 1 ? 1 : Math.abs(sx) + 0.05), s);
  ctx.fillStyle = "#D9A934"; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#F2C14E"; ctx.beginPath(); ctx.arc(0, 0, 56, 0, 6.29); ctx.fill();
  if (p >= 1) txt(result, 0, 4, 60, "MontX", "#8A6516");
  ctx.restore();
}
function policeCar(x, groundY, s, t) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
  roundRectFill(-260, -150, 520, 110, 30, "#F2F2F2"); roundRectFill(-150, -240, 290, 100, 30, "#F2F2F2");
  roundRectFill(-130, -225, 120, 70, 10, "#7FA9C9"); roundRectFill(10, -225, 110, 70, 10, "#7FA9C9");
  ctx.fillStyle = "#1C1F2B"; ctx.fillRect(-260, -100, 520, 26); txt("POLICE", 0, -125, 40, "MontX", "#1C1F2B", { spacing: 4 });
  const on = Math.sin(t * 14) > 0;
  roundRectFill(-40, -268, 40, 28, 6, on ? "#FF3B3B" : "#7A1E1E"); roundRectFill(0, -268, 40, 28, 6, on ? "#2F57B5" : "#4D8BFF");
  for (const wx of [-160, 160]) { ctx.fillStyle = "#1A1A1A"; ctx.beginPath(); ctx.arc(wx, -38, 48, 0, 6.29); ctx.fill(); ctx.fillStyle = "#9A9A9A"; ctx.beginPath(); ctx.arc(wx, -38, 20, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
function extinguisher(x, y, s, t, spraying = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  roundRectFill(-40, -170, 80, 200, 30, "#D6312C"); roundRectFill(-20, -205, 40, 40, 8, "#222");
  ctx.strokeStyle = "#222"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(15, -195); ctx.quadraticCurveTo(80, -200, 90, -150); ctx.stroke();
  if (spraying > 0) {
    const r = rng(5);
    for (let i = 0; i < 40; i++) { const k = ((t * 1.7 + i / 40) % 1); ctx.fillStyle = `rgba(240,245,255,${0.6 * (1 - k) * spraying})`; ctx.beginPath(); ctx.arc(95 + k * 420 + r() * 40, -150 + (r() - 0.5) * k * 300, 18 + k * 60, 0, 6.29); ctx.fill(); }
  }
  ctx.restore();
}
function calendarDays(cx, cy, s, t, t0, total = 14, stop = 6) {
  const p = pop(t, t0); if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s * p, s * p);
  roundRectFill(-420, -260, 840, 520, 26, "#F6F1E6"); roundRectFill(-420, -260, 840, 90, [26, 26, 0, 0], "#C0392B");
  txt("PRÉVU : 14 JOURS", 0, -214, 44, "MontX", "#fff", { spacing: 2 });
  for (let d = 0; d < total; d++) {
    const x = -360 + (d % 7) * 120, y = -110 + Math.floor(d / 7) * 150;
    const done = d < stop, crossed = d >= stop && prog(t, t0 + 1.0 + (d - stop) * 0.06, t0 + 1.2 + (d - stop) * 0.06) > 0;
    roundRectFill(x - 45, y - 50, 90, 100, 14, done ? "#2B2D33" : "#E3DCCB");
    txt(String(d + 1), x, y, 44, "MontX", done ? "#fff" : "#8E8676");
    if (crossed) { ctx.strokeStyle = "#C0392B"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x - 36, y - 40); ctx.lineTo(x + 36, y + 40); ctx.moveTo(x + 36, y - 40); ctx.lineTo(x - 36, y + 40); ctx.stroke(); }
  }
  ctx.restore();
}
function tapeRecorder(cx, cy, s, t) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  roundRectFill(-300, -170, 600, 340, 30, "#3A3C44"); roundRectFill(-260, -130, 520, 170, 16, "#22242A");
  for (const rx of [-130, 130]) {
    ctx.save(); ctx.translate(rx, -45); ctx.rotate(t * 3);
    ctx.fillStyle = "#C9B79A"; ctx.beginPath(); ctx.arc(0, 0, 66, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#22242A"; for (let k = 0; k < 3; k++) { ctx.rotate(2.094); ctx.fillRect(-6, 12, 12, 40); }
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.29); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = "#6F5A44"; ctx.fillRect(-130, 5, 260, 12);
  ["⏮", "▶", "⏸", "⏹"].forEach((b, i) => { roundRectFill(-230 + i * 120, 80, 100, 60, 10, i === 1 ? "#E04848" : "#55575F"); });
  ctx.fillStyle = Math.sin(t * 6) > 0 ? "#FF4D4D" : "#5A1E1E"; ctx.beginPath(); ctx.arc(250, -150, 12, 0, 6.29); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- Milgram
const SHOCK_LABELS = ["CHOC LÉGER", "CHOC MODÉRÉ", "CHOC FORT", "CHOC TRÈS FORT", "CHOC INTENSE", "CHOC EXTRÊME", "DANGER", "XXX"];
// 30 switches 15 → 450 V; level = number of switches already pressed (0..30)
function shockGenerator(cx, cy, s, level, t, { focus = -1 } = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  roundRectFill(-500, -230, 1000, 460, 24, "#7A7F86"); ctx.shadowColor = "transparent";
  roundRectFill(-480, -210, 960, 420, 18, "#5E6369");
  txt("GÉNÉRATEUR DE CHOCS", 0, -170, 38, "MontX", "#E9E4D6", { spacing: 4 });
  ctx.fillStyle = "#3C3F44"; ctx.fillRect(-460, -130, 920, 4);
  for (let i = 0; i < 30; i++) {
    const x = -450 + i * 31, v = 15 * (i + 1), on = i < level, hot = i === Math.floor(level) - 1;
    const danger = v >= 375;
    txt(String(v), x + 13, -100, 15, "MontX", danger ? "#FF8A80" : "#D7D2C4");
    roundRectFill(x, -70, 26, 70, 5, "#2B2D31");
    roundRectFill(x + 4, on ? -24 : -66, 18, 40, 4, on ? (danger ? "#FF4D4D" : "#FFC93C") : "#BFC3C8");
    if (on) { ctx.fillStyle = danger ? "#FF4D4D" : "#FFC93C"; ctx.beginPath(); ctx.arc(x + 13, 30, hot ? 9 + Math.sin(t * 20) * 2 : 7, 0, 6.29); ctx.fill(); }
    else { ctx.fillStyle = "#3A3D42"; ctx.beginPath(); ctx.arc(x + 13, 30, 7, 0, 6.29); ctx.fill(); }
  }
  SHOCK_LABELS.forEach((l, k) => { const x = -450 + k * 4 * 31 + 50; txt(l, x, 90, 15, "MontX", k >= 6 ? "#FF8A80" : "#D7D2C4"); });
  ctx.fillStyle = "#3C3F44"; ctx.fillRect(-460, 120, 920, 4);
  // voltmeter
  roundRectFill(-120, 140, 240, 60, 10, "#1E2024");
  txt(`${Math.round(15 * level)} V`, 0, 172, 40, "MontX", level >= 25 ? "#FF4D4D" : "#7CFF9A");
  ctx.restore();
}
function strapChair(x, groundY, s) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
  roundRectFill(-90, -280, 30, 280, 6, "#5A3E2B"); roundRectFill(-90, -130, 200, 26, 6, "#6E4C34");
  roundRectFill(80, -130, 26, 130, 6, "#5A3E2B"); roundRectFill(-80, -130, 26, 130, 6, "#5A3E2B");
  ctx.restore();
}
function straps(x, groundY, s) {
  ctx.save(); ctx.translate(x, groundY); ctx.scale(s, s);
  ctx.fillStyle = "#3B2A1E"; ctx.fillRect(-60, -210, 150, 16); ctx.fillRect(-20, -130, 130, 14);
  ctx.fillStyle = "#C9CED6"; ctx.beginPath(); ctx.arc(70, -150, 10, 0, 6.29); ctx.fill();
  ctx.strokeStyle = "#E04848"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(70, -150); ctx.quadraticCurveTo(160, -100, 240, -170); ctx.stroke();
  ctx.restore();
}
function oldPhone(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  roundRectFill(-110, -40, 220, 120, 30, "#2B2D33");
  ctx.fillStyle = "#3C3F46"; ctx.beginPath(); ctx.arc(0, 20, 45, 0, 6.29); ctx.fill(); ctx.fillStyle = "#E9E4D6"; ctx.beginPath(); ctx.arc(0, 20, 18, 0, 6.29); ctx.fill();
  ctx.fillStyle = "#2B2D33"; ctx.beginPath(); ctx.roundRect(-140, -100, 280, 50, 25); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- Hawthorne
function factory(cx, groundY, s, t) {
  ctx.save(); ctx.translate(cx, groundY); ctx.scale(s, s);
  roundRectFill(-460, -520, 920, 520, 6, "#8C4A36");
  for (let k = 0; k < 3; k++) { ctx.fillStyle = "#7A3F2E"; ctx.beginPath(); ctx.moveTo(-460 + k * 306, -520); ctx.lineTo(-460 + k * 306 + 153, -620); ctx.lineTo(-460 + (k + 1) * 306, -520); ctx.fill(); }
  roundRectFill(300, -900, 70, 400, 4, "#6E3526");
  const r = rng(8);
  for (let i = 0; i < 8; i++) { const k = (t * 0.25 + i / 8) % 1; ctx.fillStyle = `rgba(220,220,225,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(335 + k * 160 + r() * 30, -920 - k * 360, 30 + k * 70, 0, 6.29); ctx.fill(); }
  for (let row = 0; row < 3; row++) for (let c = 0; c < 7; c++) roundRectFill(-410 + c * 125, -460 + row * 140, 80, 90, 6, (row + c + Math.floor(t * 0.5)) % 5 ? "#FFD889" : "#5A3328");
  roundRectFill(-250, -110, 500, 60, 8, "#E9E1CC"); txt("HAWTHORNE WORKS", 0, -78, 32, "MontX", "#5A2E22", { spacing: 3 });
  ctx.restore();
}
// hanging bulb; level 0..1 = brightness
function bulb(x, y, s, level) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = "#2B2B33"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -400); ctx.lineTo(0, -60); ctx.stroke();
  roundRectFill(-22, -70, 44, 34, 6, "#55575F");
  if (level > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 420); g.addColorStop(0, `rgba(255,224,150,${0.7 * level})`); g.addColorStop(1, "rgba(255,224,150,0)");
    ctx.fillStyle = g; ctx.fillRect(-420, -420, 840, 840); ctx.restore();
  }
  ctx.fillStyle = level > 0.02 ? `rgb(255,${200 + 40 * level},${120 + 100 * level})` : "#8E8A80";
  ctx.beginPath(); ctx.arc(0, 0, 40, 0, 6.29); ctx.fill();
  ctx.restore();
}
// simple line chart: series = [{color, pts:[0..1 values]}], p = drawn fraction
function lineChart(cx, cy, w, h, series, p, { xLabel = "", yLabel = "", band = null } = {}) {
  ctx.save(); ctx.translate(cx - w / 2, cy + h / 2);
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, 0); ctx.lineTo(w, 0); ctx.stroke();
  if (yLabel) txt(yLabel, 0, -h - 34, 30, "MontX", "rgba(255,255,255,.8)", { align: "left" });
  if (xLabel) txt(xLabel, w, 40, 30, "MontX", "rgba(255,255,255,.8)", { align: "right" });
  for (const sr of series) {
    const n = sr.pts.length - 1, upto = clamp(p) * n;
    ctx.strokeStyle = sr.color; ctx.lineWidth = sr.width || 10; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowColor = sr.color; ctx.shadowBlur = 20;
    if (sr.dash) ctx.setLineDash(sr.dash);
    ctx.beginPath();
    for (let i = 0; i <= Math.ceil(upto); i++) {
      const k = Math.min(i, upto), i0 = Math.floor(k), f = k - i0, v = sr.pts[i0] + (sr.pts[Math.min(n, i0 + 1)] - sr.pts[i0]) * f;
      const X = (k / n) * w, Y = -v * h;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
    if (sr.label && p > 0.95) txt(sr.label, w + 10, -sr.pts[n] * h, 30, "MontX", sr.color, { align: "left" });
  }
  ctx.restore();
}
function workbench(x, y, w) {
  roundRectFill(x - w / 2, y, w, 26, 6, "#6E4C34"); roundRectFill(x - w / 2 + 20, y + 26, 22, 160, 4, "#5A3E2B"); roundRectFill(x + w / 2 - 42, y + 26, 22, 160, 4, "#5A3E2B");
  const r = rng(Math.round(x));
  for (let i = 0; i < Math.floor(w / 70); i++) roundRectFill(x - w / 2 + 30 + i * 70, y - 26, 44, 26, 5, r() > 0.5 ? "#3B6EA8" : "#C9A24A");
}
function eyeIcon(x, y, s, open = 1, color = "#F4EFE6") {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-100, 0); ctx.quadraticCurveTo(0, -90 * open, 100, 0); ctx.quadraticCurveTo(0, 90 * open, -100, 0); ctx.fill();
  if (open > 0.2) { ctx.fillStyle = "#151824"; ctx.beginPath(); ctx.arc(0, 0, 34 * open, 0, 6.29); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(10, -10, 8, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
