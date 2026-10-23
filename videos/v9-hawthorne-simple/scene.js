// Hawthorne, immersive cut: one continuous set (the factory at night, the test workshop whose lamps go up and down,
// the control workshop next door, the small relay room with its observer, the economists' office in 2011). The camera
// glides through it on the voice; production curves are chalked on the walls. Engine: lib/immersive.js.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const GROUND = 1250, CEIL = 330;
const S = id => SEG[id].start;

function shop(x0, x1, wall = "#4A4640", floor = "#2C2824") {
  ctx.fillStyle = "#1B1C1A"; ctx.fillRect(x0, -400, x1 - x0, CEIL + 400);
  ctx.fillStyle = wall; ctx.fillRect(x0, CEIL, x1 - x0, GROUND - CEIL);
  ctx.fillStyle = "rgba(255,255,255,.035)"; for (let x = x0 + 60; x < x1; x += 180) ctx.fillRect(x, CEIL, 8, GROUND - CEIL);
  ctx.fillStyle = floor; ctx.fillRect(x0, GROUND, x1 - x0, 900);
}
// production curve chalked on a wall: pts 0..1, drawn up to p
function chalkCurve(x, y, w, h, pts, p, { color = CHALK, label = "", labelColor } = {}) {
  sketchPath([[x, y - h - 20], [x, y], [x + w + 20, y]], Math.min(1, p * 3), { width: 4 });
  const n = pts.length - 1, path = pts.map((v, i) => [x + (i / n) * w, y - v * h]);
  sketchPath(path, p, { color, width: 7 });
  if (label) chalk(label, x + w / 2, y - h - 50, Math.min(1, p * 2), { size: 48, color: labelColor || color });
}
// a seated worker assembling (small hand movements)
function assembler(x, look, s, t, seed = 0, { look: dir = 1 } = {}) {
  const k = Math.sin(t * 6 + seed * 1.7);
  character(x, GROUND, s, look, { pose: "sit", flip: dir < 0, override: { sh: [1.2 + 0.12 * k, 1.0 - 0.1 * k], el: [0.9, 1.0] }, face: { look: [dir, 0.5] }, t, seed });
}

// lamp level in the test workshop
function testLight(t) {
  const tl = wt("light", "lumière", 2), tb = S("dim"), tp = wt("dim", "presque", 4);
  if (t < tl - 0.3) return 0.55;
  if (t < tb) return 0.55 + 0.45 * easeInOut(prog(t, tl - 0.3, tl + 0.5));
  if (t < tp + 1.5) return 1 - 0.93 * easeInOut(prog(t, tb + 0.2, tp + 0.2));
  return 0.6;
}

function world(t) {
  insideAndToday(t);
  // ---- A: the factory at night
  ctx.fillStyle = "#121827"; ctx.fillRect(-400, -400, 1700, GROUND + 400);
  ctx.fillStyle = "#2A2622"; ctx.fillRect(-400, GROUND, 1700, 900);
  factory(450, GROUND, 0.95, t);
  light(450, 900, 900, 0.9);
  const ts = S("setup"), tm = wt("setup", "milliers", 3);
  chalk("années 20 · près de Chicago", 450, 120, prog(t, ts + 0.3, ts + 1.2), { size: 65 });
  chalk("le but : qu'est-ce qui aide à mieux travailler ?", 450, 230, prog(t, wt("setup", "mieux", 5) - 0.6, wt("setup", "mieux", 5) + 0.8), { size: 44, color: "#FFE08A" });
  chalk("Western Electric : des milliers d'ouvriers", 450, 1360, prog(t, tm - 0.2, tm + 0.8), { size: 53 });
  // ---- B: the test workshop
  shop(1300, 2700);
  const lv = testLight(t);
  for (const bx of [1650, 2150]) { bulb(bx, 640, 0.9, lv); light(bx, 900, 300 + 700 * lv, 0.25 + 0.75 * lv); }
  workbench(2000, 1080, 1100);
  [1560, 1800, 2040, 2280].forEach((x, k) => assembler(x, k % 2 ? "worker" : "man1950", 0.95, t, k));
  const tl = S("light"), tmo = wt("light", "vite", 4), tb = S("dim"), tti = wt("dim", "toujours", 2.5), tp = wt("dim", "presque", 4);
  chalk("atelier test", 2000, 400, prog(t, tl, tl + 0.6) * (t < S("relay") ? 1 : 0), { size: 62 });
  if (t > tl - 0.2 && t < S("relay")) {
    const p1 = prog(t, tmo - 0.6, tmo + 0.6), p2 = prog(t, tb + 0.2, tp + 0.6);
    chalkCurve(1450, 860, 340, 260, [0.2, 0.3, 0.45, 0.62], p1, { label: "production" });
    chalkCurve(1790, 860, 300, 260, [0.62, 0.62, 0.6, 0.62, 0.55], p2 * (p1 >= 1 ? 1 : 0), { color: "#FFE08A" });
    chalk("plus de lumière", 1650, 470, prog(t, wt("light", "lumière", 2) - 0.2, wt("light", "lumière", 2) + 0.4), { size: 53, color: "#FFE08A" });
    chalk("moins de lumière… toujours aussi bien", 2250, 470, prog(t, tti - 0.2, tti + 0.6), { size: 48, color: "#FFE08A" });
    chalk("presque dans le noir", 2250, 540, prog(t, tp, tp + 0.6), { size: 48, color: "#9FE7FF" });
  }
  // ---- C: the control workshop: nothing changes, output climbs anyway
  ctx.fillStyle = "#121315"; ctx.fillRect(2700, -400, 60, 2600);
  shop(2760, 4100, "#47443E");
  for (const bx of [3100, 3600]) { bulb(bx, 640, 0.9, 0.6); light(bx, 900, 720, 0.7); }
  workbench(3430, 1080, 1100);
  [2990, 3230, 3470, 3710].forEach((x, k) => assembler(x, k % 2 ? "man1950b" : "worker", 0.95, t, k + 4));
  const tc = S("control"), tau = wt("control", "aussi", 3);
  chalk("l'autre atelier : on ne change rien", 3430, 400, prog(t, tc + 0.4, tc + 1.4), { size: 53 });
  chalkCurve(2950, 860, 520, 260, [0.2, 0.28, 0.4, 0.55, 0.62], prog(t, tau - 1.4, tau + 0.3), { color: "#B9F5C8", label: "production" });
  chalk("plus vite aussi ?!", 3700, 520, prog(t, tau, tau + 0.4), { size: 58, color: "#FFB3A8" });
  // ---- D: the relay room, six women and an observer
  ctx.fillStyle = "#121315"; ctx.fillRect(4100, -400, 60, 2600);
  shop(4160, 5600, "#514A44");
  hangingLamp(4880, 330, 60, 1, t); light(4880, 900, 900, 1);
  roundRectFill(5300, 520, 140, 140, 70, "#E9E1CC"); ctx.strokeStyle = "#2A2620"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(5370, 590); ctx.lineTo(5370, 545); ctx.moveTo(5370, 590); ctx.lineTo(5405, 605); ctx.stroke();
  workbench(4720, 1080, 900);
  [4340, 4480, 4620, 4760, 4900, 5040].forEach((x, k) => assembler(x, k % 2 ? "woman" : "worker", 0.82, t, k + 9));
  roundRectFill(5260, 1060, 260, 20, 4, "#5C3F2C"); ctx.fillStyle = "#4A3223"; ctx.fillRect(5280, 1080, 16, GROUND - 1080); ctx.fillRect(5490, 1080, 16, GROUND - 1080);
  character(5420, GROUND, 1.0, "researcher", { pose: "sit", flip: true, face: { look: [-1, 0.2] }, props: { clipboard: true }, t });
  const tr = S("relay"), tob = wt("relay", "regarde", 4), tpa = wt("relay", "pauses", 5.5), tho = wt("relay", "horaires", 6.2), tco = wt("relay", "goûters", 7), tgr = wt("relay", "mieux", 9.5);
  const tbk = S("back"), tha = wt("back", "toujours", 3);
  if (t > tr - 0.3 && t < S("name")) {
    chalk("6 ouvrières, à part", 4700, 420, prog(t, tr + 0.4, tr + 1.2), { size: 58 });
    chalkArrow(5350, 600, 5410, 760, prog(t, tob - 0.1, tob + 0.4), { bend: -0.2 }); chalk("quelqu'un regarde", 5330, 560, prog(t, tob, tob + 0.5), { size: 50, color: "#FFE08A" });
    chalk("pauses", 4400, 520, prog(t, tpa - 0.1, tpa + 0.3), { size: 48 });
    chalk("horaires", 4620, 520, prog(t, tho - 0.1, tho + 0.3), { size: 48 });
    chalk("goûters", 4860, 520, prog(t, tco - 0.1, tco + 0.3), { size: 48 });
    if (t > tco + 0.2) { for (let k = 0; k < 6; k++) { roundRectFill(4330 + k * 140, 1032, 26, 30, 4, "#E9E1CC"); } }
    chalkCurve(4330, 900, 600, 280, [0.2, 0.3, 0.42, 0.55, 0.66, 0.74, 0.8, 0.82, 0.84], prog(t, tpa, tgr + 0.6) * 0.75 + prog(t, tbk, tha + 0.4) * 0.25, { color: "#B9F5C8" });
    chalk("on remet tout comme avant", 4640, 960, prog(t, tbk + 0.2, tbk + 1.2), { size: 41, color: "#FFE08A" });
    chalk("toujours mieux", 4700, 700, prog(t, tha - 0.2, tha + 0.4), { size: 53, color: "#B9F5C8" });
  }
  // name: the eye on the wall
  const tn = S("name"), teff = wt("name", "Hawthorne", 2.5), tobs = wt("name", "regarde", 5);
  if (t > tn - 0.2 && t < S("twist") + 0.4) {
    const p = prog(t, teff - 0.3, teff + 0.4);
    if (p > 0) { ctx.save(); ctx.globalAlpha = p; eyeIcon(4880, 560, 1.3, Math.max(0.15, 1 - Math.pow(Math.max(0, Math.sin(t * 1.3)), 40)), "#FFE08A"); ctx.restore(); light(4880, 560, 400, 0.6 * p); }
    chalk("années 50 : « l'effet Hawthorne »", 4880, 380, prog(t, tn + 0.3, tn + 1.3), { size: 58 });
    chalk("on change quand on nous regarde", 4880, 760, prog(t, tobs - 0.6, tobs + 0.6), { size: 50, color: "#FFE08A" });
  }
  // ---- E: 2011, the economists dig out the data
  ctx.fillStyle = "#121315"; ctx.fillRect(5600, -400, 60, 2600);
  shop(5660, 7000, "#2F3438", "#202326");
  roundRectFill(5800, 420, 1060, 520, 8, "#E8EAEC"); roundRectFill(5812, 432, 1036, 496, 6, "#F7F8F9");
  light(6330, 760, 900, 1, "210,225,255");
  roundRectFill(6050, 1060, 600, 20, 4, "#3A3F46"); ctx.fillStyle = "#2E3238"; ctx.fillRect(6070, 1080, 16, GROUND - 1080); ctx.fillRect(6614, 1080, 16, GROUND - 1080);
  roundRectFill(6280, 960, 160, 100, 6, "#22262C"); roundRectFill(6292, 970, 136, 80, 4, "#7FB6E6");
  character(6120, GROUND, 1.0, "man1950", { pose: "sit", face: { look: [1, -0.2] }, t });
  character(6560, GROUND, 1.0, "man1950b", { pose: "sit", flip: true, face: { look: [-1, -0.2] }, t });
  const ttw = S("twist"), tdo = wt("twist", "chiffres", 3), tfa = wt("twist", "petit", 6);
  if (t > ttw - 0.3) {
    txt("2011", 6330, 500, 60, "MontX", "#2B2F35");
    lineChart(6290, 700, 600, 260, [
      { color: "#C9A24A", pts: [0.15, 0.4, 0.68, 0.9], dash: [18, 12], label: "la légende" },
      { color: "#2F7FD8", pts: [0.42, 0.45, 0.47, 0.46], label: "les données" },
    ], prog(t, tdo - 0.3, tdo + 1.2), { yLabel: "EFFET" });
    chalk("beaucoup plus petit", 6330, 1360, prog(t, tfa - 0.2, tfa + 0.6), { size: 67, color: "#FFB3A8" });
  }
  // cta: a modern desk, the boss walking past the glass
  if (t > S("cta") - 1) {
    const pb = prog(t, S("cta") + 0.4, S("cta") + 4.0);
    ctx.save(); ctx.globalAlpha = 0.85; character(lerp(6900, 5900, pb), GROUND, 1.1, "researcher", { pose: "walk", phase: pb * 9, flip: true, face: { look: [-1, 0] }, t, shadow: false }); ctx.restore();
    chalk("le chef passe…", 6330, 380, prog(t, wt("cta", "chef", 2), wt("cta", "chef", 2) + 0.5), { size: 67, color: "#FFE08A" });
  }
}

function overlay(t) {
  // hook: you, at the bench, someone watching
  if (t < S("setup") + 0.3) {
    const p = easeOutCubic(prog(t, 0.2, 1.2)) * (1 - prog(t, S("setup") - 0.3, S("setup") + 0.2));
    const k = Math.sin(t * 7);
    povHand(560 + k * 30, 1240 + Math.abs(k) * 10, 1.0 * p, { rot: -0.2, point: false });
  }
}


// ---------------------------------------------------------------- inside us, and today
function insideAndToday(t) {
  mindWall(7050, 8650, -600, 2400);
  const tl = S("lesson"), tre = wt("lesson", "regarde", 2.2), tim = wt("lesson", "image", 4.2), tdr = wt("lesson", "droit", 5.7), tef = wt("lesson", "d'efforts", 6.9), tat = wt("lesson", "contentes", 9.2), tin = wt("lesson", "s'intéresse", 12.3);
  light(7800, 880, 1000, 0.8, "200,215,255");
  chalkHead(7760, 920, 1.2, prog(t, tl, tl + 1.4));
  // the gaze from outside
  const pe = prog(t, tre - 0.4, tre + 0.2);
  if (pe > 0) { ctx.save(); ctx.globalAlpha = pe; eyeIcon(8190, 470, 0.7, Math.max(0.15, 1 - Math.pow(Math.max(0, Math.sin(t * 1.3)), 40)), "#FFE08A"); ctx.restore(); light(8190, 470, 300, 0.6 * pe); }
  chalkArrow(8150, 520, 8020, 640, prog(t, tre, tre + 0.5), { bend: 0.2, color: "#FFE08A" });
  chalk("on me regarde", 7980, 360, prog(t, tre - 0.2, tre + 0.5), { size: 46, color: "#FFE08A" });
  chalkCircle(7620, 640, 50, 66, prog(t, tim - 0.3, tim + 0.3));
  chalk("mon image", 7620, 750, prog(t, tim - 0.1, tim + 0.4), { size: 38 });
  // posture straightens, effort goes up
  const st = easeInOut(prog(t, tdr - 0.5, tdr + 0.3));
  sketchPath([[7880, 980], [7880 + 30 * (1 - st), 900], [7880 + 40 * (1 - st), 830]], prog(t, tdr - 0.8, tdr - 0.5), { width: 6 });
  chalkCircle(7880 + 46 * (1 - st), 808, 18, 18, prog(t, tdr - 0.8, tdr - 0.5), { width: 6 });
  chalk("plus droit", 7880, 1030, prog(t, tdr - 0.2, tdr + 0.4), { size: 36 });
  chalkArrow(8060, 980, 8060, 820, prog(t, tef - 0.3, tef + 0.2), { bend: 0, color: "#B9F5C8" });
  chalk("plus d'efforts", 8070, 1030, prog(t, tef - 0.2, tef + 0.4), { size: 36, color: "#B9F5C8" });
  pulse(7700, 1130, 70, t, prog(t, tat - 0.4, tat + 0.4), "255,200,120");
  chalk("contentes qu'on s'intéresse à elles", 7720, 1240, prog(t, tat - 0.2, tat + 0.6), { size: 46, color: "#FFE08A" });
  chalk("« enfin, on s'intéresse à nous »", 7780, 1340, prog(t, tin - 0.6, tin + 0.4), { size: 40 });
  // today: watched all the time; the eyes above the coffee box
  mindWall(8650, 10700, -600, 2400);
  const tn = S("now"), tca = wt("now", "caméras", 0.9), ttv = wt("now", "ordinateur", 1.4), tmo = wt("now", "montres", 2.8), tli = wt("now", "likes", 4.1), tpe = wt("now", "temps", 5.6);
  const tye = wt("now", "yeux", 8.9), tcf = wt("now", "café", 10.4), ttr = wt("now", "trois", 12.3);
  light(9220, 900, 800, 0.8, "210,225,255");
  chalk("aujourd'hui", 9200, 230, prog(t, tn + 0.2, tn + 0.9), { size: 66, color: "#9FE7FF" });
  if (t > tca - 0.4) { ctx.save(); ctx.globalAlpha = prog(t, tca - 0.4, tca); cctv(8950, 470, 1.0, t); ctx.restore(); }
  if (t > ttv - 0.4) laptop(9260, 760, 0.55 * easeOutBack(prog(t, ttv - 0.4, ttv)), () => { ctx.fillStyle = "#E9EEF5"; ctx.fillRect(0, 0, 480, 290); txt("Activité", 240, 70, 40, "MontX", "#2B2F35"); txt("97 %", 240, 150, 80, "MontX", "#2FB866"); txt("dernier clic : il y a 3 min", 240, 230, 26, "MontS", "#777"); });
  if (t > tmo - 0.4) smartwatch(8980, 1010, 1.0 * easeOutBack(prog(t, tmo - 0.4, tmo)), "8 432", "#3DDC84");
  if (t > tli - 0.4) { const p = easeOutBack(prog(t, tli - 0.4, tli)); heart(9500, 980, 2.2 * p); txt("+128", 9500, 1070, 40 * p, "MontX", "#FF3B5C"); }
  chalk("regardés tout le temps", 9200, 1150, prog(t, tpe - 0.4, tpe + 0.4) * (t < tye - 0.8 ? 1 : 0), { size: 50, color: "#FFE08A" });
  // the honesty-box study: same coffee corner, two posters
  const tb = tye - 1.6;
  if (t > tb) {
    const a = prog(t, tb, tb + 0.6);
    ctx.save(); ctx.globalAlpha = a;
    roundRectFill(9850, 1060, 760, 22, 4, "#4A3A2A"); ctx.fillStyle = "#3A2C20"; ctx.fillRect(9870, 1082, 16, GROUND - 1082); ctx.fillRect(10574, 1082, 16, GROUND - 1082);
    poster(10020, 760, 230, 300, "flowers"); poster(10440, 760, 230, 300, "eyes");
    for (const x of [10020, 10440]) { roundRectFill(x - 70, 960, 140, 100, 10, "#C9A24A"); ctx.fillStyle = "#3A2C20"; ctx.fillRect(x - 30, 966, 60, 8); }
    ctx.restore();
    light(10230, 860, 700, a);
    chalk("semaine « fleurs »", 10020, 560, prog(t, tye - 0.6, tye), { size: 34 });
    chalk("semaine « yeux »", 10440, 560, prog(t, tye - 0.3, tye + 0.3), { size: 34, color: "#FFE08A" });
    const pr = easeOutCubic(prog(t, ttr - 0.2, ttr + 0.8));
    sketchPath([[9960, 1360], [9960, 1360 - 70 * pr], [10080, 1360 - 70 * pr], [10080, 1360]], pr, { width: 6 });
    sketchPath([[10380, 1360], [10380, 1360 - 195 * pr], [10500, 1360 - 195 * pr], [10500, 1360]], pr, { width: 6, color: "#FFE08A" });
    chalk("presque × 3", 10440, 1360 - 195 * pr - 40, pr, { size: 54, color: "#FFE08A" });
    chalk("argent payé", 10230, 1400, pr, { size: 34 });
  }
}

startImmersive({
  world, keyRegex: /^(REGARDE|MILLIERS|MONTE|AUSSI|TIENT|PRESQUE|OBSERVATEUR|GRIMPE|HAUTE|OBSERVÉ|FAIBLE|SIMPLE|IMAGE|ATTENTION|PERMANENCE|YEUX|TRIPLÉ)/,
  ambient: t => (t > S("dim") && t < S("relay") ? 0.62 + 0.3 * prog(t, S("dim"), wt("dim", "presque", 4)) : 0.6),
  camera: () => [
    { t: 0, x: 4880, y: 960, z: 1.7, d: 0.01 },
    { t: 1.2, x: 5300, y: 900, z: 1.45, d: 2.6 },
    { t: S("setup"), x: 450, y: 700, z: 0.95, d: 0.01 },
    { t: S("setup") + 0.1, x: 450, y: 720, z: 1.05, d: 5.0 },
    { t: S("light") - 0.3, x: 1900, y: 860, z: 1.05, d: 2.0 },
    { t: wt("light", "vite", 4) - 0.8, x: 1700, y: 760, z: 1.35, d: 1.2 },
    { t: S("control") - 0.2, x: 3400, y: 820, z: 1.05, d: 2.0 },
    { t: wt("control", "aussi", 3) - 0.8, x: 3350, y: 720, z: 1.3, d: 1.2 },
    { t: S("dim") - 0.3, x: 1950, y: 760, z: 1.15, d: 1.8 },
    { t: S("relay") - 0.3, x: 4760, y: 860, z: 1.0, d: 2.2 },
    { t: wt("relay", "regarde", 4) - 0.4, x: 5150, y: 860, z: 1.3, d: 1.2 },
    { t: wt("relay", "pauses", 5.5) - 0.5, x: 4700, y: 760, z: 1.15, d: 1.2 },
    { t: S("name") - 0.2, x: 4880, y: 640, z: 1.1, d: 1.4 },
    { t: S("twist") - 0.3, x: 6330, y: 820, z: 1.0, d: 2.2 },
    { t: S("lesson") - 0.05, x: 7820, y: 860, z: 0.98, d: 0.01 },
    { t: wt("lesson", "image", 4.2) - 0.8, x: 7900, y: 760, z: 1.2, d: 1.2 },
    { t: wt("lesson", "contentes", 9.2) - 0.8, x: 7800, y: 1060, z: 1.15, d: 1.2 },
    { t: S("now") - 0.05, x: 9220, y: 800, z: 1.05, d: 0.01 },
    { t: wt("now", "yeux", 8.9) - 2.0, x: 10230, y: 960, z: 1.1, d: 1.6 },
    { t: S("cta") - 0.05, x: 6330, y: 900, z: 1.0, d: 0.01 },
  ],
  dips: () => [[S("setup"), 0.6], [S("lesson"), 0.6], [S("now"), 0.6], [S("cta"), 0.6]],
  music: () => ({ style: "dark", root: 39, room: true, tick: true, heart: [[S("control"), S("dim") + 1, 62, 82]] }),
  sfx() {
    for (let k = 0; k < 6; k++) sfx(S("light") - 0.3 + k * 0.4, "step", { gain: 0.35 });
    sfx(wt("light", "lumière", 2) - 0.2, "switch", { gain: 0.6 });
    sfx(S("dim") + 0.2, "switch", { gain: 0.6 }); sfx(wt("dim", "toujours", 2.5), "switch", { gain: 0.5 });
    sfx(wt("light", "vite", 4) - 0.6, "scribble", { dur: 1.0 });
    sfx(wt("control", "aussi", 3) - 1.2, "scribble", { dur: 1.2 });
    sfx(S("relay") + 0.2, "door", { gain: 0.5 });
    sfx(wt("relay", "pauses", 5.5), "scribble", { dur: 0.5 }); sfx(wt("relay", "horaires", 6.2), "scribble", { dur: 0.5 }); sfx(wt("relay", "goûters", 7), "scribble", { dur: 0.5 });
    sfx(S("twist") + 0.4, "click", { gain: 0.6 });
    for (let k = 0; k < 6; k++) sfx(S("cta") + 0.5 + k * 0.55, "step", { gain: 0.45 });
    sfx(S("lesson") + 0.2, "scribble", { dur: 1.4 });
    for (const w of ["caméras", "ordinateur", "montres", "likes"]) sfx(wt("now", w, 2) - 0.3, "pop", { gain: 0.35 });
    sfx(wt("now", "yeux", 8.9) - 1.4, "dark_whoosh", { gain: 0.4, dur: 0.8 });
  },
});
