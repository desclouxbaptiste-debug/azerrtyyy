// Asch, immersive cut: one room (eight chairs in a row, the cards on an easel, a blackboard behind), a camera that
// glides along the row on the voice, you in the seventh chair, the protocol chalked on the set. Engine: lib/immersive.js.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const FLOOR = 1000, CEIL = 300, YOU = 6, SEATS = 8;
// the row recedes from the front (left, big) to the back (right, small): seat 0 speaks first, you are seat 6
const seatX = i => 1300 - i * 100, seatY = i => 1010 + i * 72, seatS = i => 0.66 + i * 0.085;
const CARD = { x: 1600, y: 620, s: 0.4 };
const lineX = i => CARD.x + CARD.s * (-3 + i * 150), lineY = CARD.y + CARD.s * 40; // A, B, C
const S = id => SEG[id].start;

function classroom() {
  ctx.fillStyle = "#1B1C1A"; ctx.fillRect(-600, -400, 3200, CEIL + 400);
  ctx.fillStyle = "#43473F"; ctx.fillRect(-600, CEIL, 3200, FLOOR - CEIL);
  ctx.fillStyle = "#34372F"; ctx.fillRect(-600, 800, 3200, FLOOR - 800);
  // floor in perspective
  ctx.fillStyle = "#26231F"; ctx.fillRect(-600, FLOOR, 3200, 1400);
  ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.lineWidth = 3;
  for (let k = -8; k <= 14; k++) { ctx.beginPath(); ctx.moveTo(1100 + k * 90, FLOOR); ctx.lineTo(1100 + k * 260, 2400); ctx.stroke(); }
  // blackboard and window
  roundRectFill(370, 370, 1060, 410, 10, "#4A3A2A"); roundRectFill(388, 386, 1024, 378, 6, "#1F2A24");
  ctx.fillStyle = "rgba(255,255,255,.03)"; for (let k = 0; k < 6; k++) ctx.fillRect(410 + k * 170, 400, 90, 350);
  roundRectFill(1500, 380, 260, 380, 6, "#141A24"); ctx.fillStyle = "#2B2F35"; ctx.fillRect(1626, 380, 8, 380); ctx.fillRect(1500, 566, 260, 8);
}
function easel(x) {
  ctx.fillStyle = "#4A3424"; ctx.save(); ctx.translate(x, FLOOR);
  [[-90, -0.12], [90, 0.12]].forEach(([dx, r]) => { ctx.save(); ctx.translate(dx, 0); ctx.rotate(r); ctx.fillRect(-8, -420, 16, 420); ctx.restore(); });
  ctx.fillRect(-120, -270, 240, 14); ctx.restore();
}
// answers said out loud, one after the other (bubble above each head, scaled with depth)
function answer(i, text, p, ok) {
  if (p <= 0) return;
  const s = seatS(i);
  iconBubble(seatX(i) + 30 * s, seatY(i) - 400 * s, 110 * s, 96 * s, text, { p, size: 56 * s, bg: ok === true ? "#3DDC84" : ok === false ? "#FF4D4D" : COL.cream, fg: ok === undefined ? COL.ink : "#fff" });
}
const above = (i, k = 480) => seatY(i) - k * seatS(i);

function world(t) {
  classroom();
  insideAndToday(t);
  light(1100, 1150, 1100, 0.95); light(CARD.x, CARD.y + 40, 520, 1); light(900, 560, 700, 0.8);
  hangingLamp(1000, 160, 60, 1, t);
  const pre = 1 - prog(t, S("task") - 0.2, S("task") + 0.4);
  chalk("1951", 560, 470, prog(t, S("setup") + 0.2, S("setup") + 1.0) * pre, { size: 96 });
  chalk("le but : suit-on le groupe, même s'il a tort ?", 900, 580, prog(t, S("setup") + 0.8, S("setup") + 2.0) * pre, { size: 40 });

  const tw = wt("twist", "mauvaise", 3), tToi = wt("twist", "tour-là", 1), ta = wt("ally", "joueur", 2), te = wt("easy", "facile", 0.6);
  const worried = t > tToi && t < ta + 1;
  easel(CARD.x);
  const tl = wt("task", "jeu", 2.5);
  lineCard(CARD.x, CARD.y, CARD.s, { p: 1, wrong: t > tw - 0.3 && t < S("secret") + 1 ? 1 : -1, hi: (t > tl + 0.8 && t < S("easy") + 2.5) || t > S("cta") ? 0 : -1 });
  character(1450, FLOOR, 0.66, "researcher", { pose: t > S("task") && t < S("easy") ? "point" : "stand", flip: true, face: { look: [-1, 0] }, props: { clipboard: true }, t });
  // the row, back to front
  for (let i = 0; i < SEATS; i++) {
    const x = seatX(i), y = seatY(i), s = seatS(i), you = i === YOU;
    ctx.fillStyle = "#4A3A2E"; ctx.fillRect(x - 64 * s, y - 330 * s, 14 * s, 330 * s); ctx.fillRect(x - 64 * s, y - 128 * s, 150 * s, 16 * s);
    character(x, y, s, you ? "student" : i % 2 ? "man1950" : "man1950b", { pose: "sit", seed: i,
      face: you ? { look: [worried ? -1 : 1, -0.2], brows: worried ? "worried" : "neutral", eyes: t > tw && t < tw + 2.5 ? "wide" : "open", mouth: worried ? "grimace" : "neutral" } : { look: [1, -0.25] }, t });
  }

  if (t > S("task") && t < S("easy")) {
    chalk("même taille ?", CARD.x, 420, prog(t, tl - 0.2, tl + 0.6), { size: 40 });
    chalkArrow(CARD.x - 100, 440, CARD.x - 120, 520, prog(t, tl, tl + 0.5), { bend: 0.2, width: 5 });
  }
  // speaking order 1..8, you are 7th
  const tc = wt("task", "Chacun", 5), tav = wt("task", "avant-dernier", 8);
  if (t > tc - 0.2 && t < S("twist")) for (let i = 0; i < SEATS; i++) chalk(String(i + 1), seatX(i) + 10, above(i), prog(t, tc + i * 0.18, tc + i * 0.18 + 0.25), { size: 64 * seatS(i), color: i === YOU ? "#FFE08A" : CHALK });
  chalkCircle(seatX(YOU) + 10, seatY(YOU) - 190 * seatS(YOU), 120, 190, prog(t, tav - 0.1, tav + 0.6) * (t < S("result") ? 1 : 0), { color: "#FFE08A" });
  if (t > tav && t < S("result")) chalk("toi", seatX(YOU) - 150, seatY(YOU) - 330, prog(t, tav, tav + 0.4), { size: 64, color: "#FFE08A" });

  if (t > te - 0.3 && t < S("twist")) for (let i = 0; i < SEATS; i++) answer(i, "A", prog(t, te + i * 0.22, te + i * 0.22 + 0.2), true);
  if (t > S("twist") && t < S("result")) {
    for (let i = 0; i < YOU; i++) answer(i, "B", prog(t, tToi + 0.3 + i * 0.28, tToi + 0.5 + i * 0.28), false);
    answer(YOU, "?", prog(t, tw + 0.2, tw + 0.5));
    if (t > S("secret")) answer(7, "B", 1, false);
  }
  const tcomp = wt("secret", "complices", 1.5);
  if (t > tcomp - 0.4 && t < S("result") + 0.3) for (let i = 0; i < SEATS; i++) if (i !== YOU) chalk("complice", seatX(i) + 10, above(i, 520), prog(t, tcomp - 0.4 + i * 0.1, tcomp - 0.1 + i * 0.1), { size: 42 * seatS(i), color: "#FFB3A8" });

  // the blackboard: what came out of it
  if (t > S("result") - 0.2) {
    const t3 = wt("result", "trois", 1.5), t4 = wt("result", "quatre", 4), ts = wt("result", "seuls", 7);
    const fade = 1 - prog(t, S("ally") - 0.3, S("ally") + 0.3);
    ctx.save(); ctx.globalAlpha = fade;
    chalk("12 tours truqués sur 18", 900, 425, prog(t, S("result") + 0.4, S("result") + 1.2), { size: 42 });
    for (let k = 0; k < 18; k++) {
      const red = [1, 2, 4, 5, 7, 8, 9, 11, 12, 14, 15, 16].includes(k), x = 530 + k * 41;
      sketchPath([[x, 462], [x + 32, 462], [x + 32, 500], [x, 500], [x, 462]], prog(t, S("result") + 0.5 + k * 0.04, S("result") + 0.8 + k * 0.04), { width: 3, color: red ? "#FFB3A8" : CHALK });
    }
    const pp = prog(t, t3 - 0.3, t3 + 0.6);
    chalkCircle(560, 625, 72, 72, pp);
    if (pp > 0) { ctx.save(); ctx.globalAlpha *= 0.55 * pp; ctx.fillStyle = "#FFB3A8"; ctx.beginPath(); ctx.moveTo(560, 625); ctx.arc(560, 625, 68, -Math.PI / 2, -Math.PI / 2 + 2.1 * pp); ctx.fill(); ctx.restore(); }
    chalk("≈ 1/3 des réponses", 560, 730, pp, { size: 34 });
    for (let k = 0; k < 4; k++) {
      const p4 = prog(t, t4 - 0.2 + k * 0.12, t4 + k * 0.12), x = 850 + k * 80;
      sketchPath([[x, 690], [x, 625], [x - 20, 662], [x, 625], [x + 20, 662]], p4, { width: 5, color: k < 3 ? "#FFB3A8" : CHALK });
      chalkCircle(x, 604, 15, 15, p4, { width: 5, color: k < 3 ? "#FFB3A8" : CHALK });
    }
    chalk("3 sur 4 se trompent au moins 1 fois", 970, 730, prog(t, t4, t4 + 0.8), { size: 32 });
    chalk("seuls : moins de 1 % d'erreurs", 1170, 560, prog(t, ts - 0.1, ts + 0.8), { size: 30, color: "#B9F5C8", rot: -0.08 });
    ctx.restore();
  }
  if (t > S("ally") - 0.2 && t < S("cta")) {
    for (let i = 0; i < YOU; i++) answer(i, i === 3 ? "A" : "B", 1, i === 3);
    answer(YOU, "A", prog(t, ta + 1.2, ta + 1.5), true);
    const tch = wt("ally", "ose", 5), pb = easeOutCubic(prog(t, tch - 0.3, tch + 0.7));
    chalk("allié", seatX(3) + 10, above(3, 560), prog(t, ta, ta + 0.4), { size: 52, color: "#B9F5C8" });
    sketchPath([[560, 720], [560, 720 - 250 * 0.32], [650, 720 - 250 * 0.32], [650, 720]], prog(t, ta + 0.2, ta + 0.9), { width: 5 });
    chalk("32 %", 605, 720 - 250 * 0.32 - 34, prog(t, ta + 0.4, ta + 0.9), { size: 36 });
    chalk("seul contre tous", 605, 748, prog(t, ta + 0.4, ta + 0.9), { size: 28 });
    sketchPath([[760, 720], [760, 720 - 250 * 0.055 * pb], [850, 720 - 250 * 0.055 * pb], [850, 720]], pb, { width: 5, color: "#B9F5C8" });
    chalk("5 %", 805, 720 - 250 * 0.055 - 34, pb, { size: 36, color: "#B9F5C8" });
    chalk("avec un allié", 805, 748, pb, { size: 28, color: "#B9F5C8" });
  }
  if (t > S("nuance") - 0.1 && t < S("cta") + 0.3) {
    const tq = wt("nuance", "quatre", 1);
    for (let k = 0; k < 4; k++) { const x = 1000 + k * 95, pq = prog(t, tq - 0.2 + k * 0.1, tq + k * 0.1); sketchPath([[x, 690], [x, 615], [x - 24, 658], [x, 615], [x + 24, 658]], pq, { width: 6, color: k === 3 ? "#B9F5C8" : CHALK }); chalkCircle(x, 592, 19, 19, pq, { width: 6, color: k === 3 ? "#B9F5C8" : CHALK }); }
    chalkCircle(1285, 645, 60, 90, prog(t, tq + 0.5, tq + 1.1), { color: "#B9F5C8" });
    chalk("jamais suivi", 1285, 750, prog(t, tq + 0.6, tq + 1.2), { size: 34, color: "#B9F5C8" });
  }
}


// ---------------------------------------------------------------- inside you, and today
function insideAndToday(t) {
  mindWall(2700, 4300, -600, 2400);
  const tw = S("why"), td = wt("why", "doute", 3.8), tex = wt("why", "peur", 10.4), tse = wt("why", "seul", 14), tal = wt("why", "alarme", 20);
  light(3500, 880, 1000, 0.8, "200,215,255");
  chalkHead(3450, 900, 1.2, prog(t, tw, tw + 1.4));
  chalk("deux raisons", 3500, 260, prog(t, tw + 0.8, tw + 1.6), { size: 64, color: "#FFE08A" });
  // 1. doubt
  chalk("1. le doute", 3380, 560, prog(t, td - 0.4, td + 0.3), { size: 50 });
  for (let k = 0; k < 7; k++) chalk("B", 3150 + k * 60, 650, prog(t, td + 0.4 + k * 0.08, td + 0.6 + k * 0.08), { size: 44, color: "#FFB3A8" });
  chalk("« et si je voyais mal ? »", 3420, 730, prog(t, td + 1.6, td + 2.6), { size: 40 });
  // 2. fear of being left out: seven together, you alone
  chalk("2. la peur d'être seul", 3400, 880, prog(t, tex - 1.2, tex - 0.4), { size: 50 });
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; chalkFigure(3270 + Math.cos(a) * 90, 1080 + Math.sin(a) * 40, 0.55, prog(t, tex - 0.3 + k * 0.06, tex + k * 0.06)); }
  chalkFigure(3560, 1090, 0.6, prog(t, tse - 0.4, tse), "#FFE08A");
  chalk("seul contre tous", 3600, 1180, prog(t, tse - 0.2, tse + 0.5), { size: 38, color: "#FFE08A" });
  // the brain's alarm
  pulse(3690, 980, 90, t, prog(t, tal - 1.6, tal - 0.6), "255,80,70");
  chalk("alarme émotionnelle", 3450, 1290, prog(t, tal - 0.8, tal + 0.2), { size: 48, color: "#FFB3A8" });
  // today: a phone full of other people's opinions
  mindWall(4300, 6000, -600, 2400);
  const tn = S("now"), tli = wt("now", "likes", 1.5), tav = wt("now", "étoiles", 3.2), tgr = wt("now", "groupe", 4.6), tvo = wt("now", "voix", 10.5), tlib = wt("now", "osent", 11.6);
  chalk("aujourd'hui", 5150, 140, prog(t, tn + 0.2, tn + 0.9), { size: 70, color: "#9FE7FF" });
  smartphone(5150, 840, 1.45, () => {
    ctx.fillStyle = "#F4F5F7"; ctx.fillRect(0, 0, 344, 724);
    if (t < tgr - 0.3) {
      roundRectFill(20, 60, 304, 300, 16, "#DDE3EC"); txt("📷", 172, 200, 80, "MontX", "#888");
      const likes = Math.round(12000 * easeOutExpo(prog(t, tli - 0.3, tli + 1.2)));
      heart(46, 400, 1.1); txt(`${(likes / 1000).toFixed(1)} k`, 110, 400, 30, "MontX", "#1C1E24", { align: "left" });
      if (t > tav - 0.3) { starsRow(40, 480, 5, 26); txt("4,9 · 2 315 avis", 172, 540, 24, "MontS", "#555"); }
    } else {
      roundRectFill(0, 0, 344, 80, 0, "#3D7BFF"); txt("Groupe · 8 membres", 172, 46, 24, "MontX", "#fff");
      ["C'est trop bien !", "Grave", "Pareil", "+1", "Carrément", "Oui !"].forEach((m, k) => chatBubble(110 + k * 64, m, { p: prog(t, tgr + k * 0.25, tgr + 0.15 + k * 0.25) }));
      chatBubble(110 + 6 * 64, "Moi, pas d'accord !", { me: true, color: "#2FB866", p: prog(t, tvo - 0.4, tvo) });
      chatBubble(110 + 7 * 64, "En fait… moi non plus", { p: prog(t, tlib, tlib + 0.3) });
    }
  });
  const cap = t < tav - 0.3 ? ["les likes", tli] : t < tgr - 0.3 ? ["les étoiles", tav] : t < tvo - 0.3 ? ["personne n'ose contredire", tgr + 0.3] : ["une seule voix suffit", tvo];
  if (t > tli - 0.3) chalk(cap[0], 5150, 240, prog(t, cap[1] - 0.2, cap[1] + 0.5), { size: 54, color: cap[0] === "une seule voix suffit" ? "#B9F5C8" : CHALK });
}

function overlay(t) {
  // first person: your finger hesitating between A and B
  const hes = (t0, t1) => {
    if (t < t0 || t > t1) return;
    const p = easeOutCubic(prog(t, t0, t0 + 1.2)) * (1 - prog(t, t1 - 0.4, t1));
    const u = (Math.sin((t - t0) * 1.6) + 1) / 2, a = toScreen(lineX(0), lineY), b = toScreen(lineX(1), lineY);
    povHand(lerp(W + 260, lerp(a.x, b.x, u) + 8, p), lerp(H + 300, a.y + 60, p), 0.9, { rot: -0.36 });
  };
  hes(0.5, S("setup") + 0.2);
  hes(S("cta") - 0.2, DURATION + 1);
}

startImmersive({
  world, overlay, keyRegex: /^(TROMPER|SEPT|AVANT-DERNIER|MAUVAISE|COMPLICES|TIERS|QUATRE|SEULS|ALLIÉ|CHUTENT|QUART|JAMAIS|DOUTE|EXCLU|ALARME|LIKES|SEULE)/,
  ambient: 0.6,
  dips: () => [[S("cta"), 0.6]],
  camera: () => [
    { t: 0, x: 1600, y: 640, z: 2.0, d: 0.01 },
    { t: 0.3, x: 1600, y: 640, z: 2.2, d: 4.0 },
    { t: S("setup") - 0.3, x: 1100, y: 900, z: 0.8, d: 2.6 },
    { t: wt("setup", "sept", 4) - 0.4, x: 1000, y: 1150, z: 0.95, d: 1.6 },
    { t: S("task") - 0.1, x: 1600, y: 620, z: 1.8, d: 1.6 },
    { t: wt("task", "Chacun", 5) - 0.4, x: 1080, y: 930, z: 0.82, d: 1.6 },
    { t: wt("task", "avant-dernier", 8) - 0.5, x: 760, y: 1160, z: 1.35, d: 1.2 },
    { t: S("easy") - 0.1, x: 1080, y: 930, z: 0.82, d: 1.2 },
    { t: S("twist") - 0.1, x: 1600, y: 620, z: 1.7, d: 1.0 },
    { t: wt("twist", "tour-là", 1) + 0.1, x: 1220, y: 1000, z: 1.05, d: 1.0 },
    { t: wt("twist", "tour-là", 1) + 1.2, x: 820, y: 1120, z: 1.25, d: 2.0 },
    { t: wt("twist", "mauvaise", 3) - 0.2, x: 740, y: 1180, z: 1.6, d: 1.0 },
    { t: S("secret") - 0.1, x: 1080, y: 930, z: 0.82, d: 1.4 },
    { t: S("result") - 0.1, x: 900, y: 600, z: 1.1, d: 1.6 },
    { t: S("why") - 0.2, x: 3480, y: 860, z: 1.0, d: 1.8 },
    { t: wt("why", "doute", 3.8) - 0.6, x: 3420, y: 700, z: 1.35, d: 1.2 },
    { t: wt("why", "peur", 10.4) - 1.4, x: 3420, y: 1000, z: 1.3, d: 1.2 },
    { t: wt("why", "alarme", 20) - 2.2, x: 3450, y: 920, z: 0.95, d: 1.4 },
    { t: S("ally") - 0.1, x: 900, y: 880, z: 0.85, d: 1.6 },
    { t: S("nuance") - 0.1, x: 980, y: 640, z: 1.05, d: 1.2 },
    { t: S("now") - 0.3, x: 5150, y: 840, z: 0.98, d: 2.0 },
    { t: wt("now", "groupe", 4.6) - 0.6, x: 5150, y: 880, z: 1.02, d: 1.2 },
    { t: S("cta") - 0.05, x: 1600, y: 640, z: 2.0, d: 0.01 },
  ],
  music: () => ({ style: "dark", root: 38, room: true, tick: true, heart: [[wt("twist", "tour-là", 1), S("secret") + 0.5, 70, 104]] }),
  sfx() {
    sfx(S("setup") - 0.2, "door", { gain: 0.5 });
    for (let k = 0; k < 4; k++) sfx(S("setup") + 0.4 + k * 0.4, "step", { gain: 0.4 });
    sfx(wt("task", "ligne", 0.5) - 0.2, "paper", { gain: 0.5 });
    const te = wt("easy", "facile", 0.6); for (let i = 0; i < SEATS; i++) sfx(te + i * 0.22, "pop", { gain: 0.35 });
    const tt = wt("twist", "tour-là", 1); for (let i = 0; i < YOU; i++) sfx(tt + 0.3 + i * 0.28, "pop", { gain: 0.4 });
    sfx(S("result") + 0.3, "scribble", { dur: 1.6 });
    sfx(wt("ally", "joueur", 2), "ding", { gain: 0.4 });
    sfx(S("why") + 0.2, "scribble", { dur: 1.4 });
    sfx(wt("why", "alarme", 20) - 1.6, "heartbeat", { gain: 0.7 }); sfx(wt("why", "alarme", 20) - 0.8, "heartbeat", { gain: 0.7 });
    const tg = wt("now", "groupe", 4.6); for (let k = 0; k < 6; k++) sfx(tg + k * 0.25, "pop", { gain: 0.35 });
    sfx(wt("now", "voix", 10.5) - 0.4, "ding", { gain: 0.45 });
  },
});
