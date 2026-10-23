// Stanford, immersive cut: one continuous set (Zimbardo's desk with the ad and the coin, a street at dawn with the
// police car, the basement jail, the archive room) that turns out to be built on a theatre stage. The camera glides
// through it on the voice; the protocol is chalked on the walls. Engine: lib/immersive.js.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const GROUND = 1250, CEIL = 330;
const S = id => SEG[id].start;
const COP = { skin: "#E0B48E", hair: "#2A1E16", hairStyle: "cap", cap: "#1E2A44", jacket: "#24324F", jacketDark: "#1B2640", shirt: "#3B4A6B", pants: "#1E2A44", shoes: "#111", tie: "#111" };

function wall(x0, x1, color, floor = "#2A2622") {
  ctx.fillStyle = "#1B1C1A"; ctx.fillRect(x0, -400, x1 - x0, CEIL + 400);
  ctx.fillStyle = color; ctx.fillRect(x0, CEIL, x1 - x0, GROUND - CEIL);
  ctx.fillStyle = floor; ctx.fillRect(x0, GROUND, x1 - x0, 900);
}
function cell(x, t, { prisoner = false, arms = false, barricade = false } = {}) {
  roundRectFill(x, 560, 300, GROUND - 560, 4, "#141516");
  if (barricade) roundRectFill(x + 20, 980, 260, 120, 8, "#6E5A44");
  if (prisoner) character(x + 150, GROUND - 6, 0.85, "prisoner", { pose: "stand", override: arms ? { sh: [2.8, 2.6], el: [0.2, 0.2] } : {}, face: { brows: arms ? "angry" : "worried", mouth: arms ? "o" : "frown", look: [1, 0] }, t, shadow: false });
  ctx.strokeStyle = "#8E949E"; ctx.lineWidth = 12;
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(x + 20 + k * 43, 560); ctx.lineTo(x + 20 + k * 43, GROUND); ctx.stroke(); }
  ctx.fillStyle = "#6F757E"; ctx.fillRect(x, 548, 300, 16); ctx.fillRect(x, 860, 300, 10);
}
function proscenium(t, close = 0, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  // the theatre around the jail: red curtains, a valance, footlights, darkness of the house
  const L = 2560, R = 4840, top = 120;
  ctx.fillStyle = "#0B0B0C"; ctx.fillRect(L - 2400, -1400, 2400, 4200); ctx.fillRect(R, -1400, 2400, 4200); ctx.fillRect(L - 2400, GROUND + 60, R - L + 4800, 2400); ctx.fillRect(L - 2400, -1400, R - L + 4800, 1400 + top);
  const cw = 150 + close * (R - L) / 2;
  for (const side of [0, 1]) {
    const x = side ? R - cw : L, g = ctx.createLinearGradient(x, 0, x + cw, 0);
    g.addColorStop(0, "#5E0F0F"); g.addColorStop(0.5, "#9E1E1E"); g.addColorStop(1, "#5A0E0E");
    ctx.fillStyle = g; ctx.fillRect(x, top, cw, GROUND + 60 - top);
    ctx.fillStyle = "rgba(0,0,0,.22)"; for (let k = 0; k < cw; k += 60) ctx.fillRect(x + k + 24, top, 12, GROUND + 60 - top);
  }
  ctx.fillStyle = "#6A0F0F"; ctx.fillRect(L - 60, top, R - L + 120, 120); ctx.fillStyle = "#C9A24A"; ctx.fillRect(L - 60, top + 120, R - L + 120, 10);
  ctx.fillStyle = "#3A2A1C"; ctx.fillRect(L - 60, GROUND + 20, R - L + 120, 40);
  for (let x = L + 80; x < R; x += 160) { ctx.fillStyle = "#FFE7A8"; ctx.beginPath(); ctx.arc(x, GROUND + 30, 9, 0, 6.29); ctx.fill(); light(x, GROUND - 60, 260, 0.5 * a); }
  ctx.restore();
}

function world(t) {
  // ---- A: the desk, the ad, the coin
  wall(-300, 1150, "#3A3D3A");
  desk(560, 1150, 820); light(420, 980, 760, 1);
  const ts = S("setup"), trc = S("recruit"), t24 = wt("recruit", "Vingt-quatre", 4), tpf = wt("recruit", "pile", 6.5);
  chalk("août 1971 · université Stanford", 560, 480, prog(t, ts + 0.3, ts + 1.3), { size: 52 });
  chalk("un sous-sol → une fausse prison", 560, 570, prog(t, wt("setup", "sous-sol", 4), wt("setup", "sous-sol", 4) + 1.0), { size: 46 });
  newspaperAd(500, 1000, 0.62, t, -10);
  if (t > trc) {
    for (let k = 0; k < 24; k++) { const x = 250 + (k % 12) * 52, y = 680 + Math.floor(k / 12) * 70, p = prog(t, t24 + k * 0.02, t24 + 0.2 + k * 0.02); sketchPath([[x, y + 24], [x, y], [x - 10, y + 15], [x, y], [x + 10, y + 15]], p, { width: 3 }); chalkCircle(x, y - 10, 8, 8, p, { width: 3 }); }
    chalk("24 étudiants « équilibrés »", 560, 840, prog(t, t24 + 0.3, t24 + 1.0), { size: 40 });
    coinFlip(880, 1080, 0.8, t, tpf - 0.2, t > tpf + 0.9 ? "?" : "");
    if (t > tpf) {
      roundRectFill(760, 1110, 110, 30, 4, "#B79E6E"); txt("GARDIEN", 815, 1126, 16, "MontX", "#2B2116");
      roundRectFill(900, 1110, 130, 30, 4, "#E4DCC8"); txt("PRISONNIER", 965, 1126, 16, "MontX", "#2B2116");
      chalk("hasard pur", 900, 960, prog(t, tpf + 0.4, tpf + 1.0), { size: 40, color: "#FFE08A" });
    }
  }
  // ---- B: a street at dawn, the real police
  const sky = ctx.createLinearGradient(0, CEIL, 0, GROUND); sky.addColorStop(0, "#1A2238"); sky.addColorStop(1, "#7A5A54");
  ctx.fillStyle = sky; ctx.fillRect(1150, -400, 1300, GROUND + 400);
  ctx.fillStyle = "#2E2A2A"; ctx.fillRect(1150, GROUND, 1300, 900);
  roundRectFill(1250, 640, 520, GROUND - 640, 4, "#5E4E44"); ctx.fillStyle = "#3E2E26"; ctx.beginPath(); ctx.moveTo(1220, 650); ctx.lineTo(1510, 470); ctx.lineTo(1800, 650); ctx.fill();
  roundRectFill(1440, 950, 120, GROUND - 950, 4, "#2A1E18"); roundRectFill(1300, 760, 100, 110, 4, "#E8C27A"); roundRectFill(1620, 760, 100, 110, 4, "#2A2A30");
  light(1350, 820, 300, 0.6);
  const ta = S("arrest"), tmen = wt("arrest", "Menottes", 4), cuffed = t > tmen - 0.3, blind = t > wt("arrest", "bandés", 5.5) - 0.2;
  policeCar(2200, GROUND, 0.9, t);
  if (t > ta - 1 && t < S("cell") + 1) { const on = Math.sin(t * 14) > 0; light(2170, 1000, 700, 0.7, on ? "255,80,80" : "90,120,255"); }
  character(1900, GROUND, 1.05, COP, { pose: "stand", face: { look: [-1, 0] }, flip: true, t });
  if (t > ta - 0.5) {
    character(1700, GROUND, 1.0, "student", { pose: "stand", override: cuffed ? { sh: [0.35, 0.35], el: [0.9, 0.9] } : {}, face: { look: [1, 0], brows: "worried", mouth: "o", eyes: blind ? "closed" : "wide" }, t });
    if (blind) { ctx.fillStyle = "#1C1C22"; ctx.fillRect(1650, GROUND - 1.0 * 352, 110, 26); }
    if (cuffed) { ctx.strokeStyle = "#C9CED6"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(1725, GROUND - 175, 12, 0, 6.29); ctx.arc(1745, GROUND - 175, 12, 0, 6.29); ctx.stroke(); }
    chalk("un dimanche matin", 1700, 420, prog(t, ta + 0.2, ta + 1.0), { size: 62 });
    chalkArrow(1990, 520, 1930, 760, prog(t, wt("arrest", "police", 2) - 0.1, wt("arrest", "police", 2) + 0.5), { bend: -0.2 });
    chalk("la vraie police", 1990, 470, prog(t, wt("arrest", "police", 2), wt("arrest", "police", 2) + 0.5), { size: 62, color: "#9FE7FF" });
    chalk("menottes · empreintes · yeux bandés", 1800, 1360, prog(t, tmen, tmen + 1.4), { size: 40 });
  }
  // ---- C: the basement jail
  wall(2450, 4900, "#4A4A48", "#33302C");
  ctx.fillStyle = "rgba(0,0,0,.18)"; for (let y = CEIL; y < GROUND; y += 60) for (let x = 2450 + (y / 60 % 2) * 60; x < 4900; x += 120) ctx.fillRect(x, y, 116, 4);
  roundRectFill(3480, 400, 480, 120, 10, "#E9E1CC"); txt("STANFORD", 3720, 440, 46, "MontX", "#2B2B33", { spacing: 3 }); txt("COUNTY JAIL", 3720, 490, 36, "MontX", "#B03A2E", { spacing: 4 });
  hangingLamp(3300, 300, 60, 1, t); hangingLamp(4150, 300, 60, 1, t);
  const night = t > wt("revolt", "nuits", 6) - 0.3 && t < S("stop") ? 0.55 + 0.45 * (Math.sin(t * 23) > 0.7 ? 0 : 1) : 1;
  light(3300, 900, 800, night); light(4150, 900, 800, night);
  const tr = S("revolt"), trv = wt("revolt", "révoltent", 1.5), tex = wt("revolt", "extincteurs", 4);
  const revolt = t > trv - 0.2 && t < S("stop");
  cell(2600, t, { prisoner: t > S("cell") - 0.5, arms: revolt, barricade: revolt && t < tex });
  cell(4400, t, { prisoner: t > S("cell") - 0.5, arms: revolt, barricade: revolt && t < tex });
  roundRectFill(2980, 700, 120, GROUND - 700, 4, "#2A2622"); txt("LE TROU", 3040, 680, 26, "MontX", "#C9C2B0");
  // the prisoner, close
  const tc = S("cell");
  if (t > tc - 0.6 && t < S("guards") + 0.5) {
    character(3300, GROUND, 1.25, "prisoner", { pose: "stand", face: { brows: "worried", mouth: "frown", look: [1, 0] }, t });
    ctx.strokeStyle = "#9AA0A8"; ctx.lineWidth = 8; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(3330 + k * 26, GROUND - 22, 13, 8, 0, 0, 6.29); ctx.stroke(); }
    const tb = wt("cell", "blouse", 1), tn = wt("cell", "numéro", 2), tch = wt("cell", "chaîne", 3.5);
    chalkArrow(3520, 740, 3360, 880, prog(t, tb, tb + 0.4)); chalk("une blouse", 3600, 700, prog(t, tb, tb + 0.4), { size: 44 });
    chalkArrow(3150, 760, 3285, 860, prog(t, tn, tn + 0.4), { bend: -0.2 }); chalk("819 au lieu du nom", 3110, 710, prog(t, tn, tn + 0.5), { size: 44 });
    chalkArrow(3560, 1150, 3420, 1225, prog(t, tch, tch + 0.4)); chalk("une chaîne", 3640, 1120, prog(t, tch, tch + 0.4), { size: 44 });
  }
  // the guards
  const tg = S("guards");
  if (t > tg - 0.6) {
    const gx = t < tr ? 3850 : 3700;
    character(gx, GROUND, 1.25, "guard", { pose: "stand", face: { mouth: "neutral", look: [-1, 0] }, flip: true, props: { baton: true }, t });
    if (t > tex - 0.4 && t < S("stop")) extinguisher(gx - 90, GROUND - 120, 0.75, t, prog(t, tex - 0.3, tex + 0.2) * (1 - prog(t, tex + 2.2, tex + 2.8)));
    if (t < tr) {
      const tu = wt("guards", "uniforme", 1), tm = wt("guards", "matraque", 2), tl = wt("guards", "lunettes", 3);
      chalk("uniforme kaki", 4120, 780, prog(t, tu, tu + 0.4), { size: 44 });
      chalk("matraque", 4060, 1060, prog(t, tm, tm + 0.4), { size: 44 });
      chalkArrow(4080, 560, 3880, 650, prog(t, tl, tl + 0.4), { bend: 0.2 }); chalk("lunettes miroir", 4160, 530, prog(t, tl, tl + 0.4), { size: 44 });
      chalk("ses yeux restent cachés", 3850, 1360, prog(t, wt("guards", "yeux", 5) - 0.2, wt("guards", "yeux", 5) + 0.6), { size: 40, color: "#FFB3A8" });
    }
  }
  if (revolt) {
    chalk("jour 2 : révolte", 3720, 600, prog(t, trv - 0.1, trv + 0.5), { size: 56, color: "#FFB3A8" });
    const items = ["extincteurs", "pompes", "isolement", "nuits sans sommeil"];
    items.forEach((it, k) => { const tw = wt("revolt", it.split(" ")[0], 4 + k); chalk(it, 3720, 1330 + k * 54, prog(t, tw - 0.1, tw + 0.4), { size: 40 }); });
  }
  // calendar on the wall
  const tst = S("stop");
  if (t > tst - 0.4) calendarDays(4250, 650, 0.32, t, tst - 0.4, 14, 6);
  chalk("arrêtée au jour 6", 4250, 860, prog(t, wt("stop", "six", 3), wt("stop", "six", 3) + 0.6), { size: 44, color: "#FFB3A8" });
  // Zimbardo's conclusion
  const tcl = S("claim");
  if (t > tcl - 0.6 && t < S("today")) {
    character(4600, GROUND, 1.15, "researcher", { pose: "talk", phase: t * 4, flip: true, face: { look: [-1, 0] }, t });
    chalk("la situation → des bourreaux", 4300, 980, prog(t, wt("claim", "situation", 2), wt("claim", "situation", 2) + 1.0), { size: 46 });
  }
  // ---- D: the archives
  wall(4900, 6000, "#33352F");
  ctx.fillStyle = "#121315"; ctx.fillRect(4890, -400, 30, 2600);
  for (let r = 0; r < 4; r++) { ctx.fillStyle = "#4A3A2A"; ctx.fillRect(5000, 480 + r * 150, 900, 14); for (let k = 0; k < 8; k++) roundRectFill(5020 + k * 110, 400 + r * 150, 90, 80, 4, k % 3 ? "#8C7A5E" : "#A08B6A"); }
  desk(5450, 1150, 700); light(5300, 950, 650, 1);
  tapeRecorder(5450, 1020, 0.36, t > S("twist") ? t : 0);
  roundRectFill(5040, 700, 820, 220, 8, "#4A3A2A"); roundRectFill(5052, 712, 796, 196, 6, "#1F2A24");
  const ttw = S("twist"), tpo = wt("twist", "poussés", 3), tsi = wt("twist", "simulé", 5);
  chalk("archives · enregistrements", 5450, 380, prog(t, ttw + 0.3, ttw + 1.1), { size: 46 });
  chalk("gardiens poussés à être durs", 5450, 760, prog(t, tpo - 0.2, tpo + 0.8), { size: 44, color: "#FFB3A8" });
  chalk("prisonnier 8612 : crise simulée pour sortir", 5450, 860, prog(t, tsi - 0.2, tsi + 1.0), { size: 38, color: "#FFE08A" });
  // ---- the theatre around the jail (always there, mostly off screen)
  const stage = Math.max(1 - prog(t, S("setup") - 0.3, S("setup")), prog(t, S("today") - 0.2, S("today") + 1.2));
  proscenium(t, prog(t, S("cta") + 0.4, S("cta") + 2.6) * 0.75, stage);
  const tmise = wt("today", "mise", 3);
  chalk("mise en scène ?", 3700, 220, prog(t, 3.9, 4.6) * (t < S("setup") ? 1 : 0), { size: 120, color: "#FFE08A" });
  chalk("plus une mise en scène qu'une expérience", 3700, 1420, prog(t, tmise - 0.2, tmise + 1.0) * (t < S("cta") ? 1 : 0), { size: 70, color: "#FFE08A" });
  if (t > S("cta") - 0.3) {
    coinFlip(3700, GROUND - 80, 1.2, t, S("cta") + 0.6, "");
    light(3700, GROUND - 200, 500, 1.2);
    chalk("le pouvoir corrompt ?", 3700, 760, prog(t, S("cta") + 0.3, S("cta") + 1.0), { size: 70 });
    chalk("ou une belle histoire ?", 3700, 860, prog(t, wt("cta", "histoire", 2.5) - 0.3, wt("cta", "histoire", 2.5) + 0.4), { size: 70, color: "#FFE08A" });
  }
}

startImmersive({
  world, keyRegex: /^(MISE|PRISON|FACE|VRAIE|NUMÉRO|MIROIR|RÉVOLTENT|SOMMEIL|SIX|BOURREAUX|POUSSÉS|SIMULÉ)/,
  ambient: t => (t < S("setup") || t > S("today") ? 0.55 : 0.62),
  camera: () => [
    { t: 0, x: 3850, y: 860, z: 1.6, d: 0.01 },
    { t: 0.4, x: 3830, y: 880, z: 1.75, d: 3.4 },
    { t: 3.9, x: 3700, y: 780, z: 0.42, d: 2.2 },
    { t: S("setup"), x: 560, y: 820, z: 1.3, d: 0.01 },
    { t: S("setup") + 0.1, x: 560, y: 860, z: 1.45, d: 4.0 },
    { t: S("recruit") - 0.1, x: 520, y: 980, z: 1.7, d: 1.4 },
    { t: wt("recruit", "Vingt-quatre", 4) - 0.4, x: 560, y: 860, z: 1.35, d: 1.2 },
    { t: wt("recruit", "pile", 6.5) - 0.5, x: 880, y: 1000, z: 1.5, d: 1.2 },
    { t: S("arrest") - 0.4, x: 1900, y: 900, z: 1.0, d: 2.2 },
    { t: wt("arrest", "Menottes", 4) - 0.4, x: 1780, y: 1000, z: 1.35, d: 1.2 },
    { t: S("cell") - 0.4, x: 3330, y: 920, z: 1.25, d: 2.2 },
    { t: S("guards") - 0.3, x: 3880, y: 900, z: 1.25, d: 1.4 },
    { t: wt("guards", "yeux", 5) - 0.6, x: 3830, y: 820, z: 2.4, d: 1.4 },
    { t: S("revolt") - 0.2, x: 3700, y: 960, z: 0.78, d: 1.6 },
    { t: S("stop") - 0.2, x: 4250, y: 700, z: 1.6, d: 1.4 },
    { t: S("claim") - 0.2, x: 4420, y: 940, z: 1.1, d: 1.4 },
    { t: S("twist") - 0.2, x: 5450, y: 860, z: 1.3, d: 2.0 },
    { t: wt("twist", "simulé", 5) - 1.0, x: 5450, y: 830, z: 1.45, d: 1.4 },
    { t: S("today") - 0.2, x: 3700, y: 850, z: 0.42, d: 3.0 },
    { t: S("cta") - 0.1, x: 3700, y: 950, z: 0.85, d: 2.4 },
  ],
  dips: () => [[S("setup"), 0.6]],
  music: () => ({ style: "dark", root: 36, room: true, heart: [[S("arrest"), S("cell"), 62, 76], [S("revolt"), S("stop") + 1, 76, 104]] }),
  sfx() {
    sfx(S("recruit") + 0.2, "paper", { gain: 0.5 });
    const tpf = wt("recruit", "pile", 6.5); sfx(tpf - 0.2, "ding", { gain: 0.35 }); sfx(tpf + 0.7, "click", { gain: 0.6 });
    sfx(S("arrest") - 0.3, "rumble", { dur: 1.6, gain: 0.5 });
    sfx(S("arrest") + 0.2, "door", { gain: 0.5 });
    const tmen = wt("arrest", "Menottes", 4); sfx(tmen, "click", { gain: 0.7 }); sfx(tmen + 0.15, "click", { gain: 0.7 });
    for (let k = 0; k < 4; k++) sfx(S("cell") - 0.4 + k * 0.4, "step", { gain: 0.45 });
    sfx(S("cell") + 0.4, "knock", { gain: 0.5 });
    for (let k = 0; k < 3; k++) sfx(S("guards") - 0.3 + k * 0.42, "step", { gain: 0.5 });
    const trv = wt("revolt", "révoltent", 1.5); for (let n = 0; n < 4; n++) sfx(trv + n * 0.3, "knock", { gain: 0.6 });
    sfx(wt("revolt", "extincteurs", 4) - 0.3, "dark_whoosh", { gain: 0.6, dur: 1.2 });
    sfx(S("stop") + 0.2, "scribble", { dur: 1.0 });
    sfx(S("twist") + 0.4, "click", { gain: 0.6 });
    sfx(wt("cta", "Le", 0.3) + 0.6, "ding", { gain: 0.3 });
  },
});
