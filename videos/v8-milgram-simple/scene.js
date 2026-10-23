// Milgram, immersive cut: one continuous set (the ad on a desk -> the welcome room -> the learner's room -> the wall ->
// your room with the generator), a camera that glides through it on the voice, your hand on the switches, and the
// protocol written on the set. Timings from timings.json (lib/tts.py), engine in lib/immersive.js.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const FLOOR = 1250, CEIL = 330;
const GEN = { x: 4200, y: 905, s: 0.55 };
const swX = i => GEN.x + GEN.s * (-437 + 31 * i), swY = GEN.y + GEN.s * (-40);
const S = id => SEG[id].start, E = id => SEG[id].next;

// ---------------------------------------------------------------- set pieces
function room(x0, x1, wall = "#454A43", low = "#353833") {
  ctx.fillStyle = wall; ctx.fillRect(x0, CEIL, x1 - x0, FLOOR - CEIL);
  ctx.fillStyle = low; ctx.fillRect(x0, 900, x1 - x0, FLOOR - 900);
  ctx.fillStyle = "#2A2C28"; ctx.fillRect(x0, 892, x1 - x0, 10);
  ctx.fillStyle = "#24211D"; ctx.fillRect(x0, FLOOR, x1 - x0, 700);
  ctx.fillStyle = "rgba(255,255,255,.03)"; for (let x = x0; x < x1; x += 90) ctx.fillRect(x, FLOOR + 30, 3, 700);
  ctx.fillStyle = "#1B1C1A"; ctx.fillRect(x0, CEIL - 260, x1 - x0, 260);
}
function doorway(x, w = 180) {
  ctx.fillStyle = "#0E0F0E"; ctx.fillRect(x, CEIL + 180, w, FLOOR - CEIL - 180);
  ctx.fillStyle = "#5A4434"; ctx.fillRect(x - 16, CEIL + 164, w + 32, 18); ctx.fillRect(x - 16, CEIL + 164, 18, FLOOR - CEIL - 164); ctx.fillRect(x + w - 2, CEIL + 164, 18, FLOOR - CEIL - 164);
}
function newspaper(x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.035); ctx.scale(s, s);
  paper(0, 0, 640, 440, { color: "#E8E0CC" });
  txt("NEW HAVEN REGISTER", 0, -175, 30, "Playfair", "#2A2620", { spacing: 2 });
  ctx.fillStyle = "#2A2620"; ctx.fillRect(-290, -150, 580, 3);
  txt("NOUS VOUS PAIERONS 4 $", 0, -95, 40, "MontX", "#1E1B17");
  txt("pour une heure de votre temps", 0, -45, 30, "Playfair", "#2A2620");
  txt("Recherche volontaires : étude sur la MÉMOIRE", 0, 20, 23, "MontS", "#2A2620");
  txt("Université Yale · Département de psychologie", 0, 70, 22, "MontS", "#4A443A");
  for (let k = 0; k < 4; k++) { ctx.fillStyle = "rgba(42,38,32,.35)"; ctx.fillRect(-290, 115 + k * 22, 580 - (k % 2) * 120, 8); }
  ctx.restore();
}
function foldedSlip(x, y, rot, text, open) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  paper(0, 0, 230 * (0.4 + 0.6 * open), 110, { color: "#F1EAD8" });
  if (open > 0.6) txt(text, 0, 4, 34, "Caveat", "#1E2A6E", { alpha: prog(open, 0.6, 1) });
  ctx.restore();
}
function wordList(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.05);
  ctx.fillStyle = "#3A2C20"; ctx.fillRect(-8, 60, 16, 110);
  paper(0, 0, 170, 200, { color: "#EFE7D3" });
  [["boîte", "bleue"], ["belle", "journée"], ["canard", "sauvage"], ["ciel", "gris"], ["chien", "noir"]].forEach(([a, b], k) => txt(`${a} — ${b}`, 0, -70 + k * 34, 20, "Caveat", "#2A2620"));
  ctx.restore();
}

// generator level (switches pressed) along the story
function genLevel(t) {
  if (t < S("setup")) return 28;
  if (t < S("rule")) return 0;
  if (t < S("fake")) { const t0 = wt("rule", "trompe", 2); return t < t0 ? 0 : Math.min(4, 1 + Math.floor((t - t0) / 0.55)); }
  if (t < S("protest")) return 6;
  if (t < S("prod")) return Math.min(21, 6 + Math.floor((t - S("protest")) * 7));
  if (t < S("result")) return 21;
  if (t < S("cta")) return 21;
  return 0;
}

// ---------------------------------------------------------------- the 40 labs of the result
const LABS = (() => {
  const r = rng(61), out = [];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 5; i++) {
    if (i === 2 && j === 3) continue; // that one is yours
    out.push({ x: 4190 + (i - 2) * 1500, y: 880 + (j - 3) * 1250, end: 0, d: r() });
  }
  out.forEach((c, k) => { c.end = k < 25 ? 30 : 20 + Math.floor(r() * 10); }); // 25 + you = 26 to 450 V; the rest stop between 300 and 435 V
  return out.sort((a, b) => a.d - b.d);
})();
function labsGrid(t, a) {
  if (a <= 0) return;
  const p = easeInOut(prog(t, S("result") + 0.8, wt("result", "dernier", 4) + 1.2));
  ctx.save(); ctx.globalAlpha = a;
  for (const c of LABS) {
    roundRectFill(c.x - 650, c.y - 520, 1300, 1040, 30, "#23262C");
    roundRectFill(c.x - 650, c.y + 260, 1300, 260, 0, "#1B1D21");
    light(c.x, c.y - 120, 760, 0.85);
    const lev = Math.min(c.end, Math.round(30 * p * (0.85 + 0.15 * c.d)));
    roundRectFill(c.x - 420, c.y + 20, 840, 150, 18, "#3B3F46");
    roundRectFill(c.x - 400, c.y + 40, 800 * lev / 30, 110, 14, lev >= 30 ? "#FF4D4D" : lev >= 20 ? "#FFC93C" : "#9AA0A8");
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(c.x - 400 + 800 * 20 / 30 - 4, c.y + 10, 8, 170);
    iconPerson(c.x - 300, c.y - 160, 300, lev >= 30 && t > wt("result", "26", 2) ? COL.accent : "rgba(230,225,215,.8)");
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the world
function world(t) {
  const lv = genLevel(t);
  // R0: the ad on a desk at night
  if (IMM.c.z > 0.45) {
    room(0, 1120, "#2D302E", "#262826");
    desk(560, 1150, 820);
    newspaper(560, 1010, 0.95, t);
    light(420, 1000, 760, 1);
    chalk("1961", 560, 520, prog(t, S("setup") + 0.3, S("setup") + 1.1), { size: 130 });
    chalk("le but : jusqu'où obéit-on à un chef ?", 560, 660, prog(t, wt("setup", "obéit", 4) - 0.4, wt("setup", "obéit", 4) + 0.8), { size: 46, color: "#FFE08A" });
    doorway(1140, 170);
    // R1: welcome room, the rigged draw
    room(1320, 2480);
    hangingLamp(1900, 470, 140, 1, t); light(1900, 950, 820, 1);
    const tt = wt("roles", "Tirage", 2), tq = wt("roles", "truqué", 5.5), ta = wt("roles", "acteur", 7);
    character(1640, FLOOR, 1.15, "man1950", { pose: "stand", face: { look: [1, 0], brows: t > tq ? "worried" : "neutral" }, t });
    character(1900, FLOOR, 1.15, "experimenter", { pose: t > tt && t < tq ? "point" : "stand", face: { look: [0, 0] }, props: { clipboard: true }, t });
    character(2170, FLOOR, 1.15, "learner", { pose: "stand", flip: true, face: { look: [-1, 0], mouth: t > ta ? "smile" : "neutral" }, t });
    chalk("toi", 1545, 790, prog(t, S("roles") + 0.2, S("roles") + 0.7), { size: 62 });
    const op = prog(t, tt + 0.3, tt + 1.0), op2 = prog(t, tq - 0.4, tq + 0.3);
    if (t > tt) { foldedSlip(1720, 720 - 40 * op, -0.08, "PROFESSEUR", op); foldedSlip(2090, 720 - 40 * op2, 0.07, "PROFESSEUR", op2); }
    chalkCircle(2090, 680, 150, 70, prog(t, tq, tq + 0.6));
    chalk("les deux disent « professeur »", 1905, 560, prog(t, tq + 0.3, tq + 1.2), { size: 44 });
    chalkArrow(2330, 620, 2215, 780, prog(t, ta - 0.1, ta + 0.5), { bend: -0.3 });
    chalk("acteur", 2330, 570, prog(t, ta, ta + 0.4), { size: 64, color: "#FFB3A8" });
    doorway(2480, 80);
    // R2: the learner strapped in
    room(2560, 3480, "#3F443F", "#30332F");
    hangingLamp(3040, 470, 140, 1, t); light(3040, 960, 760, t > S("protest") && t < S("result") ? 0.7 : 1);
    strapChair(3040, FLOOR, 1.05);
    character(3050, FLOOR, 1.0, "learner", { pose: "sit", face: { brows: "worried", mouth: t > S("protest") ? "grimace" : "neutral", look: [1, 0] }, t });
    straps(3050, FLOOR, 1.0);
    const plugged = t < S("fake") + 0.6;
    ctx.strokeStyle = "#B03A3A"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(3290, 1080); ctx.quadraticCurveTo(3360, 1200, plugged ? 3460 : 3420, plugged ? 1010 : 1150); ctx.stroke();
    roundRectFill(3456, 990, 22, 40, 4, "#C9CED6");
    if (!plugged) roundRectFill(3408, 1140, 30, 24, 5, "#C9CED6");
    const te = wt("strap", "fil", 2);
    chalkArrow(2880, 860, 3110, 1020, prog(t, te - 0.1, te + 0.5), { bend: 0.25 });
    chalk("fil électrique", 2800, 820, prog(t, te, te + 0.5), { size: 52 });
    const tf = wt("fake", "faux", 1.5);
    if (t < S("protest")) {
      chalkCircle(3425, 1150, 70, 50, prog(t, tf - 0.2, tf + 0.4));
      chalk("rien n'est branché", 3230, 1360, prog(t, tf, tf + 0.8), { size: 50, color: "#B9F5C8" });
    }
  }
  // the wall between the two rooms
  if (IMM.c.z > 0.45) {
    const kn = wt("protest", "tape", 1.5), shake = t > kn && t < kn + 1.2 ? Math.sin((t - kn) * 60) * 6 * (1 - (t - kn) / 1.2) : 0;
    ctx.fillStyle = "#2B2D2A"; ctx.fillRect(3480 + shake, CEIL - 260, 90, FLOOR - CEIL + 960);
    ctx.fillStyle = "#3A3C38"; ctx.fillRect(3480 + shake, CEIL, 10, FLOOR - CEIL);
    if (t > kn && t < kn + 1.4) for (let n = 0; n < 3; n++) { const p = prog(t, kn + n * 0.35, kn + n * 0.35 + 0.5); if (p > 0 && p < 1) { ctx.strokeStyle = `rgba(255,120,100,${1 - p})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(3575, 760, 40 + p * 160, -1.1, 1.1); ctx.stroke(); } }
  }
  // R3: your room
  room(3570, 4820, "#454A43", "#353833");
  const dim = t > wtEnd("protest", "rien", 4) && t < S("prod") + 1.5 ? 0.45 : 1;
  hangingLamp(4180, 470, 140, dim, t); light(4180, 940, 900, dim);
  roundRectFill(3700, 1060, 820, 26, 4, "#5C3F2C"); ctx.fillStyle = "#4A3223"; ctx.fillRect(3720, 1086, 24, FLOOR - 1086); ctx.fillRect(4476, 1086, 24, FLOOR - 1086);
  ctx.fillStyle = "#3B2A1E"; ctx.fillRect(3555, 1080, 140, 18); ctx.fillRect(3560, 1098, 16, FLOOR - 1098); ctx.fillRect(3672, 1098, 16, FLOOR - 1098);
  character(3625, FLOOR, 1.0, "man1950", { pose: "sit", face: { look: [1, -0.1], brows: t > S("protest") ? "worried" : "neutral", mouth: t > S("prod") && t < S("result") ? "grimace" : "neutral" }, t });
  microphone(3735, 969, 60, t, { live: false });
  wordList(3840, 930);
  shockGenerator(GEN.x, GEN.y, GEN.s, lv, t);
  // experimenter behind you, then gone (orders by phone)
  const tp = wt("nuance", "téléphone", 2);
  const gone = prog(t, S("nuance") + 0.2, tp);
  ctx.fillStyle = "#3B2A1E"; ctx.fillRect(4600, 1090, 200, 18); ctx.fillRect(4610, 1108, 14, FLOOR - 1108); ctx.fillRect(4776, 1108, 14, FLOOR - 1108);
  const ring = t > tp - 0.2 && t < tp + 2.5 ? Math.sin(t * 70) * 4 : 0;
  oldPhone(4700 + ring, 1060, 0.42);
  if (gone < 1) { ctx.save(); ctx.globalAlpha = 1 - gone; character(4660 + 380 * easeIn(gone), FLOOR, 1.05, "experimenter", { pose: gone > 0 ? "walk" : t > S("prod") && t < S("result") ? "talk" : "stand", phase: t * 3, flip: gone === 0, face: { look: [-1, 0] }, props: { clipboard: true }, t }); ctx.restore(); }

  // notes on the set
  const t15 = wt("machine", "premier", 4), t450 = wt("machine", "450", 5), t30 = wt("machine", "trente", 3);
  if (t < S("rule")) {
    chalkUnderline(swX(0) - 12, swX(29) + 12, swY + 50, prog(t, t30 - 0.1, t30 + 0.6));
    chalk("30 boutons", GEN.x, GEN.y - 200, prog(t, t30, t30 + 0.5), { size: 46 });
    chalkCircle(swX(0), swY, 26, 40, prog(t, t15 - 0.1, t15 + 0.4), { width: 4 });
    chalk("15 V", swX(0) - 30, swY - 90, prog(t, t15, t15 + 0.3), { size: 40 });
    chalkCircle(swX(29), swY, 26, 40, prog(t, t450 - 0.1, t450 + 0.4), { width: 4, color: "#FFB3A8" });
    chalk("450 V", swX(29) + 20, swY - 90, prog(t, t450, t450 + 0.3), { size: 40, color: "#FFB3A8" });
  }
  const tpa = wt("rule", "question", 1);
  if (t < S("fake")) {
    chalkArrow(3800, 730, 3840, 815, prog(t, tpa, tpa + 0.5), { bend: -0.2 });
    chalk("il doit retenir des mots", 3860, 690, prog(t, tpa + 0.2, tpa + 1.0), { size: 34 });
  }
  const ter = wt("rule", "trompe", 2);
  chalk("il se trompe → plus fort", GEN.x + 40, GEN.y - 210, prog(t, ter, ter + 0.6) * (t < S("fake") ? 1 : 0), { size: 46, color: "#FFB3A8" });
  // the experimenter's four prods
  const tprod = S("prod") + 1.6;
  ["1. Veuillez continuer.", "2. L'expérience exige que vous continuiez.", "3. Il est absolument essentiel de continuer.", "4. Vous n'avez pas le choix."].forEach((l, k) => {
    if (t > S("result")) return;
    chalk(l, 4120, 520 + k * 52, prog(t, tprod + k * 0.9, tprod + k * 0.9 + 0.7), { size: 36, align: "center", color: k === 1 ? "#FFE08A" : CHALK });
  });
  // why: tiny steps, and the responsibility handed over
  if (t > S("why") - 0.2 && t < S("nuance") + 0.3) {
    const ts = wt("why", "bouton", 1), tr = wt("why", "faute", 3);
    const steps = 10, x0 = 3820, y0 = 790, sw = 62, sh = 34, p = prog(t, ts - 0.4, ts + 1.6);
    const pts = []; for (let k = 0; k < steps; k++) { pts.push([x0 + k * sw, y0 - k * sh], [x0 + (k + 1) * sw, y0 - k * sh]); }
    const fadeSteps = 1 - prog(t, tr - 0.2, tr + 0.4);
    ctx.save(); ctx.globalAlpha = fadeSteps;
    sketchPath(pts, p, { width: 5 });
    for (let k = 0; k < 3; k++) chalk("+15 V", x0 + k * sw + 30, y0 - k * sh - 30, prog(t, ts + k * 0.35, ts + k * 0.35 + 0.3), { size: 26 });
    const k = Math.floor(p * steps * 0.999), fx = x0 + k * sw + 30, fy = y0 - k * sh;
    if (p > 0) sketchPath([[fx, fy], [fx, fy - 46], [fx - 14, fy - 20], [fx, fy - 46], [fx + 14, fy - 20]], 1, { width: 4 }), chalkCircle(fx, fy - 58, 11, 11, 1, { width: 4 });
    ctx.restore();
    const pr = easeInOut(prog(t, tr + 0.2, tr + 1.8));
    if (pr > 0) {
      chalkArrow(3640, 660, 4640, 640, pr, { bend: 0.12, color: "#FFE08A" });
      chalk("la faute", lerp(3700, 4560, pr), 640 - Math.sin(pr * Math.PI) * 150, 1, { size: 44, color: "#FFE08A" });
    }
  }
  // nuance: obedience in the room vs. by phone, chalked on the wall
  if (t > S("nuance") && t < S("now")) {
    const pa = easeOutCubic(prog(t, S("nuance") + 0.3, S("nuance") + 1.0)), pb = easeOutCubic(prog(t, tp + 0.4, tp + 1.2));
    sketchPath([[4480, 820], [4480, 820 - 260 * 0.65 * pa], [4580, 820 - 260 * 0.65 * pa], [4580, 820]], pa, { width: 5 });
    chalk("65 %", 4530, 820 - 260 * 0.65 - 40, pa, { size: 40 });
    chalk("chercheur présent", 4530, 860, pa, { size: 28 });
    sketchPath([[4660, 820], [4660, 820 - 260 * 0.225 * pb], [4760, 820 - 260 * 0.225 * pb], [4760, 820]], pb, { width: 5, color: "#9FE7FF" });
    chalk("22 %", 4710, 820 - 260 * 0.225 - 40, pb, { size: 40, color: "#9FE7FF" });
    chalk("par téléphone", 4710, 900, pb, { size: 28, color: "#9FE7FF" });
  }
  if (IMM.c.z > 0.45) insideAndToday(t);
  // result: you are one lab among forty
  labsGrid(t, 1 - prog(IMM.c.z, 0.28, 0.6));
  if (IMM.c.z < 0.5) {
    const a = 1 - prog(IMM.c.z, 0.3, 0.5), t26 = wt("result", "26", 2), tn = wt("result", "s'arrête", 6);
    chalk("40 personnes · 40 salles", 4190, -4750, prog(t, S("result") + 1.0, S("result") + 2.0) * a, { size: 360 });
    chalk("26 vont jusqu'au dernier bouton", 4190, -4200, prog(t, t26, t26 + 0.8) * a, { size: 380, color: "#FFB3A8" });
    chalk("personne ne s'arrête avant le trait blanc", 4190, -3700, prog(t, tn, tn + 1.0) * a, { size: 250 });
  }
}


// ---------------------------------------------------------------- inside you, and today
function insideAndToday(t) {
  // the mind: what happens in the teacher's head
  mindWall(5000, 6500, CEIL - 260, FLOOR + 700);
  const tag = wt("why", "tête", 12), tau = wt("why", "décide", 14.8), tex = wt("why", "savant", 16.4), trs = wt("why", "faute", 18.5);
  light(5800, 880, 900, 0.8, "200,215,255");
  chalkHead(5700, 880, 1.15, prog(t, tag - 1.0, tag + 0.4));
  chalk("« ce n'est pas moi qui décide »", 5750, 280, prog(t, tag - 0.2, tag + 0.6), { size: 64, color: "#FFE08A" });
  const lit = 1 - 0.75 * prog(t, tex - 0.2, tex + 0.8);
  pulse(5640, 700, 90, t, prog(t, tag, tag + 0.6) * lit, "255,220,140");
  chalk("conscience", 5640, 590, prog(t, tag + 0.2, tag + 0.8), { size: 40, color: "#FFE08A" });
  chalkFigure(5700, 1010, 1.4, prog(t, tau - 0.6, tau));
  chalk("moi, je décide", 5700, 1150, prog(t, tau - 0.2, tau + 0.6), { size: 42 });
  sketchPath([[5480, 1150], [5920, 1150]], prog(t, tex - 0.2, tex + 0.3), { width: 7, color: "#FFB3A8" });
  chalk("j'obéis, c'est tout", 5700, 1220, prog(t, tex, tex + 0.6), { size: 48, color: "#FFB3A8" });
  const pr = easeInOut(prog(t, trs - 0.2, trs + 1.4));
  chalkArrow(5880, 920, 6330, 860, pr, { bend: -0.15, color: "#FFE08A" });
  if (pr > 0) chalk("la faute", lerp(5900, 6260, pr), 820 - Math.sin(pr * Math.PI) * 90, 1, { size: 40, color: "#FFE08A" });
  if (t > trs) character(6380, FLOOR, 1.0, "experimenter", { pose: "stand", flip: true, face: { look: [-1, 0] }, props: { clipboard: true }, t, id: "mind-exp" });
  // today: the office
  room(6500, 7900, "#3E4248", "#2F3236");
  const tn = S("now"), tpro = wt("now", "règle", 5), tord = wt("now", "réfléchir", 9), tbl = wt("now", "blouse", 9.8), tti = wt("now", "titre", 10.8), tvo = wt("now", "voix", 11.4), tju = wt("now", "bien", 15.5);
  light(7200, 900, 900, 1, "225,235,255");
  roundRectFill(6900, 1060, 600, 22, 4, "#4A4F57"); ctx.fillStyle = "#3A3E45"; ctx.fillRect(6920, 1082, 18, FLOOR - 1082); ctx.fillRect(7462, 1082, 18, FLOOR - 1082);
  laptop(7130, 1060, 0.38, () => { ctx.fillStyle = "#E9EEF5"; ctx.fillRect(0, 0, 480, 290); roundRectFill(30, 30, 420, 40, 6, "#3D7BFF"); for (let k = 0; k < 5; k++) roundRectFill(30, 90 + k * 36, 300 + (k % 2) * 90, 16, 6, "#C9CED6"); });
  character(6880, FLOOR, 1.0, "student", { pose: "sit", face: { look: [1, -0.1], brows: t > tpro ? "worried" : "neutral", mouth: t > tord ? "frown" : "neutral" }, t, id: "office-emp" });
  character(7420, FLOOR, 1.1, "man1950b", { pose: t > tn + 1 && t < tord ? "point" : "stand", flip: true, face: { look: [-1, 0] }, props: { paper: true }, t, id: "office-boss" });
  if (t > tn - 0.5) {
    chalk("aujourd'hui", 7200, 380, prog(t, tn + 0.2, tn + 0.9), { size: 78, color: "#9FE7FF" });
    chalk("« fais-le, c'est la règle »", 7200, 520, prog(t, tpro - 0.4, tpro + 0.5), { size: 65 });
    chalk("on obéit sans réfléchir", 7200, 620, prog(t, tord - 1.0, tord + 0.4), { size: 57, color: "#FFB3A8" });
    chalk("une blouse", 6830, 740, prog(t, tbl - 0.1, tbl + 0.3), { size: 55 });
    chalk("un titre", 7200, 740, prog(t, tti - 0.1, tti + 0.3), { size: 55 });
    chalk("une voix assurée", 7560, 740, prog(t, tvo - 0.1, tvo + 0.4), { size: 55 });
    chalk("… est-ce que c'est bien ?", 7200, 1360, prog(t, tju - 0.6, tju + 0.3), { size: 104, color: "#FFE08A" });
  }
}

// ---------------------------------------------------------------- first person, on top of the set
function overlay(t) {
  const sw = i => toScreen(swX(i), swY);
  // hook: your finger hovering over 450 V
  if (t < S("setup")) {
    const p = easeOutCubic(prog(t, 0.6, 3.6)), s = sw(29), tr = Math.sin(t * 9) * 4 * p;
    povHand(lerp(W + 260, s.x + 6, p) + tr, lerp(H + 300, s.y + 40, p), 0.95, { rot: -0.38 });
  }
  // the sample shock on your own wrist
  const tv = wt("strap", "vrai", 4), tq = wt("strap", "quarante", 5);
  if (t > tv - 0.6 && t < S("machine") + 0.2) {
    const p = easeOutCubic(prog(t, tv - 0.6, tv)) * (1 - prog(t, S("machine") - 0.3, S("machine") + 0.2));
    const y = lerp(H + 200, 1180, p);
    ctx.save(); ctx.translate(W, y); ctx.rotate(-0.1);
    roundRectFill(-900, -70, 700, 140, 60, "#E3AE8A"); roundRectFill(-260, -95, 120, 190, 30, "#E9E4DA"); roundRectFill(-200, -112, 520, 224, 60, "#2C323F");
    roundRectFill(-1030, -84, 190, 168, 70, "#E3AE8A");
    for (let k = 0; k < 4; k++) roundRectFill(-1080, -66 + k * 36, 80, 30, 14, "#D99F7C");
    ctx.fillStyle = "#C9CED6"; ctx.beginPath(); ctx.arc(-640, -10, 34, 0, 6.29); ctx.fill();
    ctx.strokeStyle = "#B03A3A"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-640, -10); ctx.quadraticCurveTo(-580, -300, -300, -420); ctx.stroke();
    if (t > tq - 0.1 && t < tq + 0.7) {
      ctx.strokeStyle = `rgba(190,230,255,${1 - prog(t, tq, tq + 0.7)})`; ctx.lineWidth = 6;
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + t * 9; ctx.beginPath(); ctx.moveTo(-640, -10); let px = -640, py = -10; for (let j = 0; j < 4; j++) { px += Math.cos(a + Math.sin(j * 3 + t * 40) * 0.6) * 28; py += Math.sin(a + Math.cos(j * 2 + t * 33) * 0.6) * 28; ctx.lineTo(px, py); } ctx.stroke(); }
    }
    ctx.restore();
    chalk("45 V, un vrai choc", 360, y - 230, prog(t, tq, tq + 0.6), { size: 64, color: "#9FE7FF" });
  }
  // the rule: your hand pressing the first switches
  const ter = wt("rule", "trompe", 2);
  if (t > ter - 0.8 && t < S("fake") + 0.1) {
    const lv = genLevel(t), i = Math.max(0, lv - 1), s = sw(i), p = easeOutCubic(prog(t, ter - 0.8, ter - 0.1));
    const press = lv > 0 ? Math.max(0, 1 - (t - (ter + (lv - 1) * 0.55)) * 5) : 0;
    povHand(lerp(W + 260, s.x + 6, p), lerp(H + 300, s.y + 40, p), 0.95, { rot: -0.38, press });
  }
  // the question at the end: your hand moving along the switches
  if (t > S("cta") - 0.4) {
    const u = (Math.sin((t - S("cta")) * 0.9 - 1.2) + 1) / 2, s = sw(Math.round(10 + u * 19)), p = easeOutCubic(prog(t, S("cta") - 0.4, S("cta") + 0.8));
    povHand(lerp(W + 260, s.x + 6, p), lerp(H + 300, s.y + 60, p), 0.95, { rot: -0.38 });
  }
}

startImmersive({
  world, overlay, keyRegex: /^(450|TRUQUÉ|ACTEUR|VRAI|TRENTE|FAUX|RIEN|EXIGE|26|65|AUCUN|RESPONSABILITÉ|TÉLÉPHONE|PROGRESSIF|AGENTIQUE|EXÉCUTANT|PROCÉDURE|ORDRES|JUSTE)/,
  ambient: t => (t > wtEnd("protest", "rien", 4) && t < S("prod") + 1.2 ? 0.86 : IMM.c.z < 0.5 ? 0.45 : 0.68),
  camera: () => [
    { t: 0, x: 4390, y: 880, z: 2.5, d: 0.01 },
    { t: 0.4, x: 4370, y: 880, z: 2.8, d: 4.5 },
    { t: S("setup"), x: 560, y: 1010, z: 1.75, d: 0.01 },
    { t: S("setup") + 0.2, x: 560, y: 960, z: 1.55, d: 2.5 },
    { t: wt("setup", "mémoire", 4) - 0.2, x: 560, y: 860, z: 1.0, d: 1.6 },
    { t: wt("setup", "présentes", 6) - 0.4, x: 1900, y: 860, z: 1.0, d: 2.2 },
    { t: wt("roles", "Tirage", 2) + 0.2, x: 1880, y: 760, z: 1.25, d: 1.4 },
    { t: wt("roles", "truqué", 5.5) - 0.5, x: 2000, y: 700, z: 1.55, d: 1.0 },
    { t: wt("roles", "acteur", 7) - 0.3, x: 2180, y: 820, z: 1.35, d: 0.9 },
    { t: S("strap") - 0.1, x: 3040, y: 880, z: 1.1, d: 1.8 },
    { t: wt("strap", "fil", 2) - 0.3, x: 3110, y: 960, z: 1.6, d: 1.4 },
    { t: S("machine") - 0.1, x: 4150, y: 880, z: 1.0, d: 2.4 },
    { t: wt("machine", "trente", 3) - 0.5, x: 4200, y: 880, z: 1.8, d: 1.2 },
    { t: wt("rule", "question", 1) - 0.5, x: 3800, y: 860, z: 2.0, d: 1.0 },
    { t: wt("rule", "trompe", 2) - 0.4, x: 4120, y: 880, z: 2.1, d: 0.9 },
    { t: S("fake") - 0.1, x: 3300, y: 1060, z: 1.5, d: 1.6 },
    { t: S("protest") - 0.1, x: 4010, y: 860, z: 1.15, d: 1.4 },
    { t: wt("protest", "rien", 4) - 0.2, x: 3920, y: 860, z: 1.35, d: 2.6 },
    { t: S("prod") + 1.0, x: 4300, y: 700, z: 1.25, d: 1.8 },
    { t: S("result") - 0.1, x: 4190, y: 1500, z: 0.13, d: 3.2 },
    { t: S("why") - 0.2, x: 4150, y: 720, z: 1.15, d: 1.6 },
    { t: wt("why", "tête", 12) - 1.2, x: 5800, y: 820, z: 1.0, d: 1.8 },
    { t: wt("why", "faute", 18.5) - 0.4, x: 6000, y: 860, z: 0.92, d: 1.4 },
    { t: S("nuance") - 0.1, x: 4360, y: 860, z: 1.0, d: 1.0 },
    { t: S("now") - 0.3, x: 7200, y: 820, z: 1.15, d: 2.2 },
    { t: wt("now", "blouse", 9.8) - 0.5, x: 7200, y: 760, z: 1.15, d: 1.0 },
    { t: wt("now", "bien", 15.5) - 1.0, x: 7200, y: 960, z: 1.05, d: 1.2 },
    { t: S("cta") - 0.05, x: 4330, y: 880, z: 2.5, d: 0.01 },
  ],
  dips: () => [[S("setup"), 0.6], [S("cta"), 0.6]],
  music: () => ({ style: "dark", root: 37, room: true, tick: true, heart: [[S("machine"), wt("protest", "rien", 4), 66, 110], [S("prod") + 1.0, S("result"), 84, 92]] }),
  sfx() {
    sfx(S("setup") + 0.25, "paper", { gain: 0.6 });
    const tp = wt("setup", "présentes", 6) - 0.4; for (let k = 0; k < 5; k++) sfx(tp + k * 0.42, "step", { gain: 0.5 });
    sfx(tp + 0.9, "door", { gain: 0.6 });
    sfx(wt("roles", "Tirage", 2) + 0.3, "paper", { gain: 0.5 });
    const ta = wt("strap", "attache", 1); sfx(ta, "click", { gain: 0.6 }); sfx(ta + 0.25, "click", { gain: 0.6 });
    const tq = wt("strap", "quarante", 5); sfx(tq - 0.05, "spark", { gain: 0.8 }); sfx(tq - 0.05, "buzz", { dur: 0.45, gain: 0.7 });
    for (let k = 0; k < 4; k++) sfx(S("machine") + k * 0.42, "step", { gain: 0.45 });
    const ter = wt("rule", "trompe", 2);
    for (let k = 0; k < 4; k++) { sfx(ter + k * 0.55, "switch", { gain: 0.8 }); sfx(ter + k * 0.55 + 0.03, "buzz", { dur: 0.3, gain: 0.35 }); }
    for (let k = 0; k < 14; k++) sfx(S("protest") + k / 7, "switch", { gain: 0.35 });
    const tk = wt("protest", "tape", 1.5); for (let n = 0; n < 3; n++) sfx(tk + n * 0.35, "knock", { gain: 0.9 });
    const end = wtEnd("protest", "rien", 4) + 0.05;
    sfx(end, "silence", { dur: Math.max(0.6, SEG.prod.sentences[0].start - end - 0.1) });
    for (let k = 0; k < 4; k++) sfx(S("prod") + 1.6 + k * 0.9, "scribble", { dur: 0.6 });
    sfx(wt("why", "bouton", 1) - 0.3, "scribble", { dur: 1.4 });
    for (let k = 0; k < 2; k++) sfx(S("nuance") + 0.3 + k * 0.42, "step", { gain: 0.45 });
    const tph = wt("nuance", "téléphone", 2); sfx(tph - 0.2, "ring", { dur: 1.2, gain: 0.9 }); sfx(tph + 1.4, "ring", { dur: 1.2, gain: 0.7 });
    sfx(wt("why", "tête", 12) - 1.0, "scribble", { dur: 1.4 });
    sfx(wt("why", "faute", 18.5), "dark_whoosh", { gain: 0.4, dur: 1.2 });
    sfx(S("now") + 0.2, "door", { gain: 0.4 });
    sfx(wt("now", "règle", 5) - 0.3, "paper", { gain: 0.5 });
    sfx(wt("now", "bien", 15.5) - 0.5, "scribble", { dur: 1.0 });
  },
});
