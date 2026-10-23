// Asch, immersive cut: one room (eight chairs in a row, the cards on an easel, a blackboard behind), a camera that
// glides along the row on the voice, you in the seventh chair, the protocol chalked on the set. Engine: lib/immersive.js.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const FLOOR = 1250, CEIL = 330, YOU = 6, SEATS = 8;
const seatX = i => 420 + i * 230;
const CARD = { x: 2560, y: 720, s: 0.55 };
const lineX = i => CARD.x + CARD.s * (-3 + i * 150), lineY = CARD.y + CARD.s * 40; // A, B, C
const S = id => SEG[id].start;

function classroom() {
  ctx.fillStyle = "#43473F"; ctx.fillRect(-400, CEIL, 3700, FLOOR - CEIL);
  ctx.fillStyle = "#34372F"; ctx.fillRect(-400, 930, 3700, FLOOR - 930);
  ctx.fillStyle = "#26231F"; ctx.fillRect(-400, FLOOR, 3700, 700);
  ctx.fillStyle = "#1B1C1A"; ctx.fillRect(-400, CEIL - 300, 3700, 300);
  // blackboard
  roundRectFill(260, 400, 1500, 440, 10, "#4A3A2A"); roundRectFill(280, 418, 1460, 404, 6, "#1F2A24");
  ctx.fillStyle = "rgba(255,255,255,.03)"; for (let k = 0; k < 9; k++) ctx.fillRect(300 + k * 160, 430, 80, 380);
  // tall window, night
  roundRectFill(2000, 420, 300, 420, 6, "#141A24"); ctx.fillStyle = "#2B2F35"; ctx.fillRect(2146, 420, 8, 420); ctx.fillRect(2000, 626, 300, 8);
}
function easel(x) {
  ctx.fillStyle = "#4A3424"; ctx.save(); ctx.translate(x, FLOOR);
  [[-150, -0.12], [150, 0.12]].forEach(([dx, r]) => { ctx.save(); ctx.translate(dx, 0); ctx.rotate(r); ctx.fillRect(-10, -760, 20, 760); ctx.restore(); });
  ctx.fillRect(-190, -380, 380, 18); ctx.restore();
}
// answers said out loud, one after the other (bubble above each chair)
function answer(i, text, p, ok) {
  if (p <= 0) return;
  iconBubble(seatX(i) + 30, 760 - (i % 2) * 70, 110, 96, text, { p, size: 56, bg: ok === true ? "#3DDC84" : ok === false ? "#FF4D4D" : COL.cream, fg: ok === undefined ? COL.ink : "#fff" });
}

function world(t) {
  classroom();
  light(1300, 900, 1500, 0.9); light(2560, 760, 700, 1);
  hangingLamp(900, 470, 120, 1, t); hangingLamp(2000, 470, 120, 1, t);
  chalk("1951", 560, 520, prog(t, S("setup") + 0.2, S("setup") + 1.0), { size: 110 });
  chalk("Swarthmore College · « test de perception »", 1100, 760, prog(t, S("setup") + 0.8, S("setup") + 2.0), { size: 40 });

  const tw = wt("twist", "mauvaise", 3), tToi = wt("twist", "tour-là", 1), ta = wt("ally", "allié", 2), te = wt("easy", "faciles", 0.6);
  const worried = t > tToi && t < ta + 1;
  // the row of chairs; the table in front of them
  for (let i = 0; i < SEATS; i++) {
    const x = seatX(i), you = i === YOU;
    ctx.fillStyle = "#4A3A2E"; ctx.fillRect(x - 60, FLOOR - 330, 14, 330);
    character(x, FLOOR, 1.0, you ? "student" : i % 2 ? "man1950" : "man1950b", { pose: "sit", seed: i,
      face: you ? { look: [worried ? -1 : 1, -0.2], brows: worried ? "worried" : "neutral", eyes: t > tw && t < tw + 2.5 ? "wide" : "open", mouth: worried ? "grimace" : "neutral" } : { look: [1, -0.2] }, t });
  }
  roundRectFill(260, 1085, 1920, 26, 4, "#6E4C34"); ctx.fillStyle = "#5A3E2B"; ctx.fillRect(260, 1111, 1920, 12);
  ctx.fillStyle = "#4A3223"; ctx.fillRect(290, 1123, 22, FLOOR - 1123); ctx.fillRect(2130, 1123, 22, FLOOR - 1123);

  easel(CARD.x);
  const tl = wt("task", "Laquelle", 2.5);
  lineCard(CARD.x, CARD.y, CARD.s, { p: 1, wrong: t > tw - 0.3 && t < S("secret") + 1 ? 1 : -1, hi: (t > tl + 0.8 && t < S("easy") + 2.5) || t > S("cta") ? 0 : -1 });
  character(2860, FLOOR, 1.1, "researcher", { pose: t > S("task") && t < S("easy") ? "point" : "stand", flip: true, face: { look: [-1, 0] }, props: { clipboard: true }, t });

  // notes on the card
  if (t > S("task") && t < S("easy")) {
    chalk("même longueur ?", CARD.x, 470, prog(t, tl - 0.2, tl + 0.6), { size: 46 });
    chalkArrow(CARD.x - 120, 500, CARD.x - 150, 610, prog(t, tl, tl + 0.5), { bend: 0.2 });
  }
  // speaking order 1..8, you are 7th
  const tc = wt("task", "Chacun", 5), tav = wt("task", "avant-dernier", 8);
  if (t > tc - 0.2 && t < S("twist")) {
    for (let i = 0; i < SEATS; i++) chalk(String(i + 1), seatX(i), 640, prog(t, tc + i * 0.18, tc + i * 0.18 + 0.25), { size: 60, color: i === YOU ? "#FFE08A" : CHALK });
  }
  chalkCircle(seatX(YOU), 960, 110, 150, prog(t, tav - 0.1, tav + 0.6) * (t < S("result") ? 1 : 0), { color: "#FFE08A" });
  if (t > tav && t < S("result")) chalk("toi", seatX(YOU) + 150, 790, prog(t, tav, tav + 0.4), { size: 56, color: "#FFE08A" });

  // easy rounds: everybody says A
  if (t > te - 0.3 && t < S("twist")) for (let i = 0; i < SEATS; i++) answer(i, "A", prog(t, te + i * 0.22, te + i * 0.22 + 0.2), true);
  // the trap: everyone before you says B, then your turn
  if (t > S("twist") && t < S("result")) {
    for (let i = 0; i < YOU; i++) answer(i, "B", prog(t, tToi + 0.3 + i * 0.28, tToi + 0.5 + i * 0.28), false);
    answer(YOU, "?", prog(t, tw + 0.2, tw + 0.5));
    if (t > S("secret")) answer(7, "B", 1, false);
  }
  // they are all in on it
  const tcomp = wt("secret", "complices", 1.5);
  if (t > tcomp - 0.4 && t < S("result") + 0.3) for (let i = 0; i < SEATS; i++) if (i !== YOU) chalk("complice", seatX(i), 620 - (i % 2) * 40, prog(t, tcomp - 0.4 + i * 0.1, tcomp - 0.1 + i * 0.1), { size: 38, color: "#FFB3A8" });

  // the blackboard: what came out of it
  if (t > S("result") - 0.2) {
    const t3 = wt("result", "tiers", 1.5), t4 = wt("result", "quatre", 4), ts = wt("result", "seuls", 7);
    const fade = 1 - prog(t, S("ally") - 0.3, S("ally") + 0.3);
    ctx.save(); ctx.globalAlpha = fade;
    chalk("12 tours truqués sur 18", 700, 470, prog(t, S("result") + 0.4, S("result") + 1.2), { size: 40 });
    for (let k = 0; k < 18; k++) {
      const red = [1, 2, 4, 5, 7, 8, 9, 11, 12, 14, 15, 16].includes(k);
      sketchPath([[340 + k * 42, 520], [372 + k * 42, 520], [372 + k * 42, 560], [340 + k * 42, 560], [340 + k * 42, 520]], prog(t, S("result") + 0.5 + k * 0.04, S("result") + 0.8 + k * 0.04), { width: 3, color: red ? "#FFB3A8" : CHALK });
    }
    const pp = prog(t, t3 - 0.3, t3 + 0.6);
    chalkCircle(470, 700, 90, 90, pp);
    if (pp > 0) { ctx.save(); ctx.globalAlpha *= 0.55 * pp; ctx.fillStyle = "#FFB3A8"; ctx.beginPath(); ctx.moveTo(470, 700); ctx.arc(470, 700, 86, -Math.PI / 2, -Math.PI / 2 + 2.1 * pp); ctx.fill(); ctx.restore(); }
    chalk("≈ 1/3 des réponses", 470, 820, pp, { size: 36 });
    for (let k = 0; k < 4; k++) {
      const p4 = prog(t, t4 - 0.2 + k * 0.12, t4 + k * 0.12);
      const x = 800 + k * 90;
      sketchPath([[x, 760], [x, 690], [x - 22, 730], [x, 690], [x + 22, 730]], p4, { width: 5, color: k < 3 ? "#FFB3A8" : CHALK });
      chalkCircle(x, 668, 16, 16, p4, { width: 5, color: k < 3 ? "#FFB3A8" : CHALK });
    }
    chalk("3 sur 4 cèdent au moins 1 fois", 935, 820, prog(t, t4, t4 + 0.8), { size: 34 });
    chalk("seuls : moins de 1 % d'erreurs", 1450, 640, prog(t, ts - 0.1, ts + 0.8), { size: 36, color: "#B9F5C8" });
    ctx.restore();
  }
  // why: two voices in your head
  if (t > S("why") && t < S("ally")) {
    const td = wt("why", "douter", 1.5), tsv = wt("why", "savent", 3.5);
    iconBubble(seatX(YOU) - 120, 640, 470, 110, "Et si je voyais mal ?", { p: prog(t, td - 0.2, td + 0.1), size: 36 });
    iconBubble(seatX(YOU) + 220, 500, 520, 110, "Je ne veux pas être seul.", { p: prog(t, tsv, tsv + 0.3), size: 36, bg: "#FFE08A", tail: "right" });
  }
  // one ally changes everything
  if (t > S("ally") - 0.2 && t < S("cta")) {
    for (let i = 0; i < YOU; i++) answer(i, i === 3 ? "A" : "B", 1, i === 3 ? true : false);
    answer(YOU, "A", prog(t, ta + 1.2, ta + 1.5), true);
    const tch = wt("ally", "chutent", 5), pb = easeOutCubic(prog(t, tch - 0.3, tch + 0.7));
    chalk("allié", seatX(3), 600, prog(t, ta, ta + 0.4), { size: 50, color: "#B9F5C8" });
    sketchPath([[600, 800], [600, 800 - 250 * 0.32], [690, 800 - 250 * 0.32], [690, 800]], prog(t, ta + 0.2, ta + 0.9), { width: 5 });
    chalk("32 %", 645, 800 - 250 * 0.32 - 34, prog(t, ta + 0.4, ta + 0.9), { size: 34 });
    chalk("seul contre tous", 645, 834, prog(t, ta + 0.4, ta + 0.9), { size: 26 });
    sketchPath([[760, 800], [760, 800 - 250 * 0.055 * pb], [850, 800 - 250 * 0.055 * pb], [850, 800]], pb, { width: 5, color: "#B9F5C8" });
    chalk("5 %", 805, 800 - 250 * 0.055 - 34, pb, { size: 34, color: "#B9F5C8" });
    chalk("avec un allié", 805, 834, pb, { size: 26, color: "#B9F5C8" });
  }
  // a quarter never gave in
  if (t > S("nuance") - 0.1 && t < S("cta") + 0.3) {
    const tq = wt("nuance", "quart", 1);
    for (let k = 0; k < 4; k++) { const x = 1150 + k * 110, pq = prog(t, tq - 0.2 + k * 0.1, tq + k * 0.1); sketchPath([[x, 760], [x, 680], [x - 26, 726], [x, 680], [x + 26, 726]], pq, { width: 6, color: k === 3 ? "#B9F5C8" : CHALK }); chalkCircle(x, 654, 20, 20, pq, { width: 6, color: k === 3 ? "#B9F5C8" : CHALK }); }
    chalkCircle(1480, 710, 70, 100, prog(t, tq + 0.5, tq + 1.1), { color: "#B9F5C8" });
    chalk("jamais cédé", 1480, 830, prog(t, tq + 0.6, tq + 1.2), { size: 36, color: "#B9F5C8" });
  }
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
  world, overlay, keyRegex: /^(TROMPER|SEPT|AVANT-DERNIER|MAUVAISE|COMPLICES|TIERS|QUATRE|SEULS|ALLIÉ|CHUTENT|QUART|JAMAIS)/,
  ambient: 0.66,
  camera: () => [
    { t: 0, x: 2560, y: 760, z: 1.9, d: 0.01 },
    { t: 0.3, x: 2560, y: 760, z: 2.1, d: 4.0 },
    { t: S("setup") - 0.3, x: 1450, y: 860, z: 0.44, d: 2.6 },
    { t: wt("setup", "sept", 4) - 0.4, x: 1200, y: 880, z: 0.62, d: 1.6 },
    { t: S("task") - 0.1, x: 2560, y: 740, z: 1.5, d: 1.6 },
    { t: wt("task", "Chacun", 5) - 0.4, x: 1230, y: 860, z: 0.52, d: 1.6 },
    { t: wt("task", "avant-dernier", 8) - 0.5, x: 1820, y: 880, z: 1.0, d: 1.2 },
    { t: S("easy") - 0.1, x: 1250, y: 860, z: 0.5, d: 1.2 },
    { t: S("twist") - 0.1, x: 2560, y: 760, z: 1.5, d: 1.0 },
    { t: wt("twist", "tour-là", 1) + 0.1, x: 1000, y: 860, z: 0.85, d: 1.0 },
    { t: wt("twist", "tour-là", 1) + 1.2, x: 1800, y: 880, z: 1.1, d: 2.0 },
    { t: wt("twist", "mauvaise", 3) - 0.2, x: 1800, y: 930, z: 1.6, d: 1.0 },
    { t: S("secret") - 0.1, x: 1250, y: 820, z: 0.5, d: 1.4 },
    { t: S("result") - 0.1, x: 1000, y: 640, z: 0.95, d: 1.6 },
    { t: S("why") - 0.1, x: 1830, y: 760, z: 1.15, d: 1.4 },
    { t: S("ally") - 0.1, x: 1150, y: 760, z: 0.62, d: 1.6 },
    { t: S("nuance") - 0.1, x: 1250, y: 720, z: 0.9, d: 1.2 },
    { t: S("cta") - 0.3, x: 2560, y: 760, z: 1.9, d: 1.6 },
  ],
  music: () => ({ style: "dark", root: 38, room: true, tick: true, heart: [[wt("twist", "tour-là", 1), S("secret") + 0.5, 70, 104]] }),
  sfx() {
    sfx(S("setup") - 0.2, "door", { gain: 0.5 });
    for (let k = 0; k < 4; k++) sfx(S("setup") + 0.4 + k * 0.4, "step", { gain: 0.4 });
    sfx(wt("task", "ligne", 0.5) - 0.2, "paper", { gain: 0.5 });
    const te = wt("easy", "faciles", 0.6); for (let i = 0; i < SEATS; i++) sfx(te + i * 0.22, "pop", { gain: 0.35 });
    const tt = wt("twist", "tour-là", 1); for (let i = 0; i < YOU; i++) sfx(tt + 0.3 + i * 0.28, "pop", { gain: 0.4 });
    sfx(S("result") + 0.3, "scribble", { dur: 1.6 });
    sfx(wt("ally", "allié", 2), "ding", { gain: 0.4 });
  },
});
