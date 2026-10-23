// Set pieces for the "what happens inside you" and "today" parts of the immersive cuts (classic script, after
// immersive.js). All in world coordinates. The mind space is a dark wall where a big chalk head profile is drawn and
// the mechanism is diagrammed inside it; the modern pieces (phone, laptop, camera, watch, poster) stage today's
// equivalents of each experiment.

// a dark wall to draw the mind on
function mindWall(x0, x1, top = -400, bottom = 2400) {
  ctx.fillStyle = "#14171B"; ctx.fillRect(x0, top, x1 - x0, bottom - top);
  ctx.fillStyle = "rgba(255,255,255,.025)"; for (let x = x0 + 40; x < x1; x += 120) ctx.fillRect(x, top, 4, bottom - top);
}
// big chalk profile of a head looking right, (cx, cy) = middle of the skull, drawn up to p
function chalkHead(cx, cy, s, p, { color = CHALK, width = 7 } = {}) {
  const P = [[-260, 330], [-250, 180], [-300, 40], [-310, -120], [-250, -280], [-110, -380], [70, -390], [220, -310], [290, -170], [300, -60],
    [350, 30], [330, 70], [300, 90], [310, 150], [290, 175], [300, 210], [270, 250], [200, 270], [180, 330]];
  const pts = [];
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 6; k++) { // smooth the outline (Catmull-Rom)
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)], u = k / 6, u2 = u * u, u3 = u2 * u;
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
    pts.push([cx + f(p0[0], p1[0], p2[0], p3[0]) * s, cy + f(p0[1], p1[1], p2[1], p3[1]) * s]);
  }
  pts.push([cx + P[P.length - 1][0] * s, cy + P[P.length - 1][1] * s]);
  sketchPath(pts, p, { color, width });
}
// a glowing pulse (alarm, attention) inside the head
function pulse(x, y, r, t, p, color = "255,90,80") {
  if (p <= 0) return;
  for (let k = 0; k < 3; k++) {
    const u = ((t * 0.9 + k / 3) % 1);
    ctx.strokeStyle = `rgba(${color},${(1 - u) * 0.8 * p})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * (0.4 + u), 0, 6.29); ctx.stroke();
  }
  ctx.fillStyle = `rgba(${color},${0.55 * p})`; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, 6.29); ctx.fill();
  light(x, y, r * 3, 0.6 * p, color);
}
// little chalk stick figure
function chalkFigure(x, y, s, p, color = CHALK) {
  sketchPath([[x, y], [x, y - 60 * s], [x - 22 * s, y - 28 * s], [x, y - 60 * s], [x + 22 * s, y - 28 * s]], p, { width: 5 * s, color });
  sketchPath([[x - 18 * s, y + 40 * s], [x, y], [x + 18 * s, y + 40 * s]], p, { width: 5 * s, color });
  chalkCircle(x, y - 80 * s, 17 * s, 17 * s, p, { width: 5 * s, color });
}

// ---------------------------------------------------------------- today
function smartphone(x, y, s, draw) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  roundRectFill(-190, -380, 380, 760, 54, "#15161A"); ctx.shadowColor = "transparent";
  roundRectFill(-172, -362, 344, 724, 40, "#F4F5F7");
  roundRectFill(-50, -350, 100, 22, 11, "#15161A");
  ctx.save(); ctx.beginPath(); ctx.roundRect(-172, -362, 344, 724, 40); ctx.clip(); ctx.translate(-172, -362); draw(); ctx.restore();
  ctx.restore();
  light(x, y, 520 * s, 0.9, "220,230,255");
}
// chat bubble inside a phone screen (screen coordinates, 344 wide)
function chatBubble(y, text, { me = false, color, p = 1, size = 22 } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(p * 2); ctx.font = `${size}px MontS`;
  const w = Math.min(280, ctx.measureText(text).width + 34), x = me ? 344 - 16 - w : 16;
  roundRectFill(x, y, w, size * 2, 18, color || (me ? "#3D7BFF" : "#E4E6EB"));
  ctx.fillStyle = me || color ? "#fff" : "#1C1E24"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 17, y + size + 1);
  ctx.restore();
}
function starsRow(x, y, n, size = 30, color = "#FFB400") {
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = k < n ? color : "#D5D7DC"; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? size * 0.42 : size; ctx.lineTo(x + k * size * 2.2 + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
}
function heart(x, y, s, color = "#FF3B5C") {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, 12); ctx.bezierCurveTo(-28, -8, -16, -32, 0, -16); ctx.bezierCurveTo(16, -32, 28, -8, 0, 12); ctx.fill(); ctx.restore();
}
function cctv(x, y, s, t, sweep = 0.4) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#2A2D33"; ctx.fillRect(-10, -60, 20, 60);
  ctx.rotate(0.35 + Math.sin(t * 0.8) * sweep * 0.5);
  roundRectFill(-20, -20, 170, 70, 18, "#D9DCE1"); roundRectFill(130, -10, 40, 50, 10, "#2A2D33");
  ctx.fillStyle = Math.sin(t * 5) > 0 ? "#FF3B3B" : "#5A1A1A"; ctx.beginPath(); ctx.arc(10, 0, 8, 0, 6.29); ctx.fill();
  ctx.restore();
}
function laptop(x, y, s, draw) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  roundRectFill(-260, -330, 520, 330, 18, "#2A2D33"); roundRectFill(-240, -310, 480, 290, 8, "#E9EEF5");
  ctx.save(); ctx.beginPath(); ctx.rect(-240, -310, 480, 290); ctx.clip(); ctx.translate(-240, -310); draw(); ctx.restore();
  ctx.fillStyle = "#3A3E46"; ctx.beginPath(); ctx.moveTo(-300, 0); ctx.lineTo(300, 0); ctx.lineTo(330, 30); ctx.lineTo(-330, 30); ctx.closePath(); ctx.fill();
  ctx.restore();
  light(x, y - 160 * s, 500 * s, 0.8, "210,225,255");
}
function smartwatch(x, y, s, text, color = "#3DDC84") {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  roundRectFill(-40, -170, 80, 340, 30, "#1E2026"); roundRectFill(-80, -90, 160, 180, 44, "#15161A"); roundRectFill(-68, -78, 136, 156, 34, "#0B0C0F");
  txt(text, 0, 0, 40, "MontX", color);
  ctx.restore();
}
function poster(x, y, w, h, kind) {
  roundRectFill(x - w / 2, y - h / 2, w, h, 6, "#F2EEE4");
  if (kind === "eyes") {
    for (const dx of [-0.2, 0.2]) { ctx.fillStyle = "#1C1E24"; ctx.beginPath(); ctx.ellipse(x + dx * w, y - h * 0.1, w * 0.13, h * 0.09, 0, 0, 6.29); ctx.fill(); ctx.fillStyle = "#F2EEE4"; ctx.beginPath(); ctx.arc(x + dx * w + w * 0.03, y - h * 0.13, w * 0.03, 0, 6.29); ctx.fill(); }
  } else {
    for (let k = 0; k < 3; k++) { const fx = x + (k - 1) * w * 0.25; ctx.fillStyle = "#4E8A4A"; ctx.fillRect(fx - 3, y, 6, h * 0.3); ctx.fillStyle = ["#E26D8C", "#F2B33D", "#8E7BE0"][k]; for (let i = 0; i < 5; i++) { const a = i * 1.257; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 16, y + Math.sin(a) * 16, 12, 0, 6.29); ctx.fill(); } }
  }
}
