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
  insideAndToday(t);
  // ---- A: the desk, the ad, the coin
  wall(-300, 1150, "#3A3D3A");
  desk(560, 1150, 820); light(420, 980, 760, 1);
  const ts = S("setup"), trc = S("recruit"), t24 = wt("recruit", "Vingt-quatre", 4), tpf = wt("recruit", "pile", 6.5);
  chalk("le but : un gentil peut-il devenir méchant ?", 560, 480, prog(t, wt("setup", "méchant", 5) - 0.6, wt("setup", "méchant", 5) + 0.6) * (1 - prog(t, S("recruit") + 0.3, S("recruit") + 1.0)), { size: 46, color: "#FFE08A" });
  chalk("une cave → une fausse prison", 560, 570, prog(t, wt("setup", "cave", 4), wt("setup", "cave", 4) + 1.0), { size: 46 });
  newspaperAd(500, 1000, 0.62, t, -10);
  if (t > trc) {
    for (let k = 0; k < 24; k++) { const x = 250 + (k % 12) * 52, y = 680 + Math.floor(k / 12) * 70, p = prog(t, t24 + k * 0.02, t24 + 0.2 + k * 0.02); sketchPath([[x, y + 24], [x, y], [x - 10, y + 15], [x, y], [x + 10, y + 15]], p, { width: 3 }); chalkCircle(x, y - 10, 8, 8, p, { width: 3 }); }
    chalk("24 étudiants", 560, 840, prog(t, t24 + 0.3, t24 + 1.0), { size: 40 });
    coinFlip(880, 1080, 0.8, t, tpf - 0.2, t > tpf + 0.9 ? "?" : "");
    if (t > tpf) {
      roundRectFill(760, 1110, 110, 30, 4, "#B79E6E"); txt("GARDIEN", 815, 1126, 16, "MontX", "#2B2116");
      roundRectFill(900, 1110, 130, 30, 4, "#E4DCC8"); txt("PRISONNIER", 965, 1126, 16, "MontX", "#2B2116");
      chalk("au hasard", 900, 960, prog(t, tpf + 0.4, tpf + 1.0), { size: 40, color: "#FFE08A" });
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
    chalk("menottes · yeux bandés", 1800, 1360, prog(t, tmen, tmen + 1.4), { size: 40 });
  }
  // ---- C: the basement jail
  wall(2450, 4900, "#4A4A48", "#33302C");
  ctx.fillStyle = "rgba(0,0,0,.18)"; for (let y = CEIL; y < GROUND; y += 60) for (let x = 2450 + (y / 60 % 2) * 60; x < 4900; x += 120) ctx.fillRect(x, y, 116, 4);
  roundRectFill(3480, 400, 480, 120, 10, "#E9E1CC"); txt("STANFORD", 3720, 440, 46, "MontX", "#2B2B33", { spacing: 3 }); txt("COUNTY JAIL", 3720, 490, 36, "MontX", "#B03A2E", { spacing: 4 });
  hangingLamp(3300, 300, 60, 1, t); hangingLamp(4150, 300, 60, 1, t);
  const night = t > wt("revolt", "dormir", 6) - 0.3 && t < S("stop") ? 0.55 + 0.45 * (Math.sin(t * 23) > 0.7 ? 0 : 1) : 1;
  light(3300, 900, 800, night); light(4150, 900, 800, night);
  const tr = S("revolt"), trv = wt("revolt", "révoltent", 1.5), tex = wt("revolt", "aspergent", 4);
  const revolt = t > trv - 0.2 && t < S("stop");
  cell(2600, t, { prisoner: t > S("cell") - 0.5, arms: revolt, barricade: revolt && t < tex });
  cell(4400, t, { prisoner: t > S("cell") - 0.5, arms: revolt, barricade: revolt && t < tex });
  roundRectFill(2980, 700, 120, GROUND - 700, 4, "#2A2622"); txt("LE TROU", 3040, 680, 26, "MontX", "#C9C2B0");
  // the prisoner, close
  const tc = S("cell");
  if (t > tc - 0.6 && t < S("guards") + 0.5) {
    character(3300, GROUND, 1.25, "prisoner", { pose: "stand", face: { brows: "worried", mouth: "frown", look: [1, 0] }, t });
    ctx.strokeStyle = "#9AA0A8"; ctx.lineWidth = 8; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(3330 + k * 26, GROUND - 22, 13, 8, 0, 0, 6.29); ctx.stroke(); }
    const tb = wt("cell", "robe", 1), tn = wt("cell", "numéro", 2), tch = wt("cell", "chaîne", 3.5);
    chalkArrow(3520, 740, 3360, 880, prog(t, tb, tb + 0.4)); chalk("une robe", 3600, 700, prog(t, tb, tb + 0.4), { size: 44 });
    chalkArrow(3150, 760, 3285, 860, prog(t, tn, tn + 0.4), { bend: -0.2 }); chalk("un numéro, plus de prénom", 3110, 710, prog(t, tn, tn + 0.5), { size: 44 });
    chalkArrow(3560, 1150, 3420, 1225, prog(t, tch, tch + 0.4)); chalk("une chaîne", 3640, 1120, prog(t, tch, tch + 0.4), { size: 44 });
  }
  // the guards
  const tg = S("guards");
  if (t > tg - 0.6) {
    const gx = t < tr ? 3850 : 3700;
    character(gx, GROUND, 1.25, "guard", { pose: "stand", face: { mouth: "neutral", look: [-1, 0] }, flip: true, props: { baton: true }, t });
    if (t > tex - 0.4 && t < S("stop")) extinguisher(gx - 90, GROUND - 120, 0.75, t, prog(t, tex - 0.3, tex + 0.2) * (1 - prog(t, tex + 2.2, tex + 2.8)));
    if (t < tr) {
      const tu = wt("guards", "uniforme", 1), tm = wt("guards", "bâton", 2), tl = wt("guards", "lunettes", 3);
      chalk("uniforme kaki", 4120, 780, prog(t, tu, tu + 0.4), { size: 44 });
      chalk("un bâton", 4060, 1060, prog(t, tm, tm + 0.4), { size: 44 });
      chalkArrow(4080, 560, 3880, 650, prog(t, tl, tl + 0.4), { bend: 0.2 }); chalk("lunettes miroir", 4160, 530, prog(t, tl, tl + 0.4), { size: 44 });
      chalk("ses yeux restent cachés", 3850, 1360, prog(t, wt("guards", "yeux", 5) - 0.2, wt("guards", "yeux", 5) + 0.6), { size: 40, color: "#FFB3A8" });
    }
  }
  if (revolt) {
    chalk("jour 2 : révolte", 3720, 600, prog(t, trv - 0.1, trv + 0.5), { size: 56, color: "#FFB3A8" });
    [["arrosés d'extincteur", "aspergent"], ["des pompes", "pompes"], ["pas le droit de dormir", "dormir"]].forEach(([it, w], k) => { const tw = wt("revolt", w, 4 + k); chalk(it, 3720, 1330 + k * 54, prog(t, tw - 0.1, tw + 0.4), { size: 40 }); });
  }
  // calendar on the wall
  const tst = S("stop");
  if (t > tst - 0.4) calendarDays(4250, 650, 0.32, t, tst - 0.4, 14, 6);
  chalk("arrêtée au jour 6", 4250, 860, prog(t, wt("stop", "six", 3), wt("stop", "six", 3) + 0.6), { size: 44, color: "#FFB3A8" });
  // Zimbardo's conclusion
  const tcl = S("claim");
  if (t > tcl - 0.6 && t < S("today")) {
    character(4600, GROUND, 1.15, "researcher", { pose: "talk", phase: t * 4, flip: true, face: { look: [-1, 0] }, t });
    chalk("mauvais rôle → méchant", 4300, 980, prog(t, wt("claim", "méchants", 2), wt("claim", "méchants", 2) + 1.0), { size: 46 });
  }
  // ---- D: the archives
  wall(4900, 6000, "#33352F");
  ctx.fillStyle = "#121315"; ctx.fillRect(4890, -400, 30, 2600);
  for (let r = 0; r < 4; r++) { ctx.fillStyle = "#4A3A2A"; ctx.fillRect(5000, 480 + r * 150, 900, 14); for (let k = 0; k < 8; k++) roundRectFill(5020 + k * 110, 400 + r * 150, 90, 80, 4, k % 3 ? "#8C7A5E" : "#A08B6A"); }
  desk(5450, 1150, 700); light(5300, 950, 650, 1);
  tapeRecorder(5450, 1020, 0.36, t > S("twist") ? t : 0);
  roundRectFill(5040, 700, 820, 220, 8, "#4A3A2A"); roundRectFill(5052, 712, 796, 196, 6, "#1F2A24");
  const ttw = S("twist"), tpo = wt("twist", "poussait", 3), tsi = wt("twist", "semblant", 5);
  chalk("des enregistrements", 5450, 380, prog(t, ttw + 0.3, ttw + 1.1), { size: 46 });
  chalk("gardiens poussés à être durs", 5450, 760, prog(t, tpo - 0.2, tpo + 0.8), { size: 44, color: "#FFB3A8" });
  chalk("un prisonnier : « je faisais semblant »", 5450, 860, prog(t, tsi - 0.2, tsi + 1.0), { size: 38, color: "#FFE08A" });
  // ---- the theatre around the jail (always there, mostly off screen)
  const stage = Math.max(1 - prog(t, S("setup") - 0.3, S("setup")), prog(t, S("today") - 0.2, S("today") + 1.2) * (1 - prog(t, S("inside") - 0.3, S("inside"))), prog(t, S("cta") - 0.3, S("cta")));
  proscenium(t, prog(t, S("cta") + 0.4, S("cta") + 2.6) * 0.75, stage);
  const tmise = wt("today", "théâtre", 3);
  chalk("du théâtre ?", 3700, 220, prog(t, 3.9, 4.6) * (t < S("setup") ? 1 : 0), { size: 120, color: "#FFE08A" });
  chalk("plus du théâtre qu'une expérience", 3700, 1420, prog(t, tmise - 0.2, tmise + 1.0) * (t < S("inside") ? 1 : 0), { size: 70, color: "#FFE08A" });
  if (t > S("cta") - 0.3) {
    coinFlip(3700, GROUND - 80, 1.2, t, S("cta") + 0.6, "");
    light(3700, GROUND - 200, 500, 1.2);
    chalk("le pouvoir rend méchant ?", 3700, 760, prog(t, S("cta") + 0.3, S("cta") + 1.0), { size: 70 });
    chalk("ou une belle histoire ?", 3700, 860, prog(t, wt("cta", "histoire", 2.5) - 0.3, wt("cta", "histoire", 2.5) + 0.4), { size: 70, color: "#FFE08A" });
  }
}


// ---------------------------------------------------------------- what is really at work, and today
function insideAndToday(t) {
  mindWall(6000, 7700, -600, 2400);
  const ti = S("inside"), tme = wt("inside", "choses", 1.7), tde = wt("inside", "porte", 3.3), tun = wt("inside", "uniforme", 4.8), tlu = wt("inside", "lunettes", 5.8), tnu = wt("inside", "numéro", 6.7), tre = wt("inside", "responsable", 8.5);
  const tch = wt("inside", "chef", 10.3), tdu = wt("inside", "dur", 12.4), tsu = wt("inside", "obéissent", 13.5), tfi = wt("inside", "fiers", 15);
  light(6850, 880, 1000, 0.8, "200,215,255");
  chalkHead(6800, 900, 1.2, prog(t, ti, ti + 1.4));
  chalk("deux choses vraies", 6850, 250, prog(t, tme - 0.4, tme + 0.6), { size: 58, color: "#FFE08A" });
  chalk("1. caché sous l'uniforme", 6780, 560, prog(t, tde - 0.3, tde + 0.4), { size: 48 });
  // "me" fading behind uniform, glasses, number
  const fadeMe = 1 - 0.7 * prog(t, tre - 0.6, tre + 0.4);
  ctx.save(); ctx.globalAlpha = fadeMe; chalkFigure(6620, 800, 1.1, prog(t, tde, tde + 0.5)); chalk("moi", 6620, 830, prog(t, tde + 0.2, tde + 0.6), { size: 36 }); ctx.restore();
  if (t > tun - 0.2) { ctx.save(); ctx.globalAlpha = prog(t, tun - 0.2, tun + 0.2); roundRectFill(6595, 720, 50, 60, 10, "#B79E6E"); ctx.restore(); chalk("uniforme", 6780, 690, prog(t, tun - 0.2, tun + 0.3), { size: 34 }); }
  if (t > tlu - 0.2) { ctx.save(); ctx.globalAlpha = prog(t, tlu - 0.2, tlu + 0.2); roundRectFill(6596, 694, 48, 14, 6, "#15171C"); ctx.restore(); chalk("lunettes", 6780, 740, prog(t, tlu - 0.2, tlu + 0.3), { size: 34 }); }
  if (t > tnu - 0.2) { chalk("819", 6620, 760, prog(t, tnu - 0.2, tnu + 0.2), { size: 26 }); chalk("numéro", 6780, 790, prog(t, tnu - 0.2, tnu + 0.3), { size: 34 }); }
  chalk("→ moins responsable", 6870, 860, prog(t, tre - 0.5, tre + 0.4), { size: 40, color: "#FFB3A8" });
  chalk("2. le chef pousse", 6780, 960, prog(t, tch - 0.4, tch + 0.3), { size: 48 });
  chalkFigure(6560, 1180, 1.2, prog(t, tdu - 0.6, tdu), "#FFE08A");
  for (let k = 0; k < 3; k++) { chalkFigure(6760 + k * 90, 1180, 0.8, prog(t, tsu - 0.3 + k * 0.12, tsu + k * 0.12)); }
  chalkArrow(6620, 1080, 6740, 1080, prog(t, tsu - 0.4, tsu), { bend: -0.3, width: 5, color: "#FFE08A" });
  if (t > tfi - 0.3) for (let k = 0; k < 3; k++) chalk("★", 6760 + k * 90, 1060, prog(t, tfi - 0.3 + k * 0.08, tfi + k * 0.08), { size: 40, color: "#FFE08A", font: "MontX" });
  chalk("et même fiers", 6900, 1290, prog(t, tfi - 0.2, tfi + 0.5), { size: 44, color: "#FFE08A" });
  // today: anonymous comments, and a group whose leader looks away
  mindWall(7700, 9700, -600, 2400);
  const tn = S("now"), tps = wt("now", "pseudo", 1.4), tfa = wt("now", "face", 3.8), tgr = wt("now", "groupe", 4.8), tye = wt("now", "yeux", 6.6), tpe = wt("now", "permis", 7.9);
  chalk("aujourd'hui", 8200, 160, prog(t, tn + 0.2, tn + 0.9), { size: 66, color: "#9FE7FF" });
  smartphone(8100, 840, 1.1, () => {
    ctx.fillStyle = "#F4F5F7"; ctx.fillRect(0, 0, 344, 724);
    roundRectFill(0, 0, 344, 80, 0, "#22252C"); txt("Commentaires", 172, 46, 24, "MontX", "#fff");
    [["@anonyme_93", "T'es vraiment nul…"], ["@dark_wolf", "Personne t'aime"], ["@xx_inconnu", "Supprime ton compte"], ["@user_4471", "Ridicule"]].forEach(([who, msg], k) => {
      const p = prog(t, tps + k * 0.45, tps + 0.2 + k * 0.45); if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = p;
      ctx.fillStyle = "#B8BDC6"; ctx.beginPath(); ctx.arc(40, 130 + k * 110, 22, 0, 6.29); ctx.fill();
      txt("?", 40, 132 + k * 110, 24, "MontX", "#fff");
      txt(who, 74, 118 + k * 110, 20, "MontX", "#555", { align: "left" });
      txt(msg, 74, 148 + k * 110, 22, "MontS", "#C0392B", { align: "left" });
      ctx.restore();
    });
  });
  chalk("derrière un pseudo", 8100, 300, prog(t, tps - 0.3, tps + 0.4) * (t < tgr - 0.4 ? 1 : 0), { size: 52 });
  chalk("ce qu'on n'oserait jamais dire en face", 8100, 1360, prog(t, tfa - 0.8, tfa + 0.3) * (t < tgr - 0.4 ? 1 : 0), { size: 44, color: "#FFB3A8" });
  // the group: three against one, the boss with closed eyes
  ctx.fillStyle = "#2A2D33"; ctx.fillRect(8500, GROUND, 1200, 700);
  light(9050, 950, 800, 0.9);
  const k = Math.sin(t * 5);
  for (const [x, look] of [[8780, "man1950"], [8920, "man1950b"], [9060, "student"]]) character(x, GROUND, 0.95, look, { pose: "point", override: { sh: [1.55 + 0.1 * k, 0.1], el: [0.05, 0.2] }, face: { mouth: "smile", look: [1, 0] }, t, id: "bully-" + x });
  character(9270, GROUND, 0.95, "passerby", { pose: "stand", flip: true, override: { sh: [0.4, 0.5], el: [1.4, 1.4] }, face: { brows: "worried", mouth: "frown", look: [-1, 0.3] }, t, id: "victim" });
  character(9480, GROUND, 1.15, "experimenter", { pose: "stand", override: { sh: [0.6, 0.6], el: [1.7, 1.7] }, face: { eyes: t > tye - 0.4 ? "closed" : "open", look: [-1, 0] }, flip: true, t, id: "boss" });
  chalk("le chef ferme les yeux", 9200, 620, prog(t, tye - 0.5, tye + 0.3), { size: 46 });
  chalk("… et tout devient permis", 9160, 1380, prog(t, tpe - 0.4, tpe + 0.4), { size: 50, color: "#FFB3A8" });
}

startImmersive({
  world, keyRegex: /^(MISE|PRISON|FACE|VRAIE|NUMÉRO|MIROIR|RÉVOLTENT|SOMMEIL|SIX|BOURREAUX|POUSSÉS|SIMULÉ|DÉSINDIVIDUATION|CHEF|FIERS|PSEUDO|YEUX)/,
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
    { t: wt("twist", "semblant", 5) - 1.0, x: 5450, y: 830, z: 1.45, d: 1.4 },
    { t: S("today") - 0.2, x: 3700, y: 850, z: 0.42, d: 3.0 },
    { t: S("inside") - 0.05, x: 6850, y: 860, z: 0.98, d: 0.01 },
    { t: wt("inside", "porte", 3.3) - 0.5, x: 6760, y: 760, z: 1.3, d: 1.2 },
    { t: wt("inside", "chef", 10.3) - 0.6, x: 6760, y: 1080, z: 1.25, d: 1.2 },
    { t: S("now") - 0.05, x: 8100, y: 840, z: 1.0, d: 0.01 },
    { t: wt("now", "groupe", 4.8) - 0.7, x: 9140, y: 980, z: 1.08, d: 1.4 },
    { t: S("cta") - 0.05, x: 3700, y: 950, z: 0.85, d: 0.01 },
  ],
  dips: () => [[S("setup"), 0.6], [S("inside"), 0.6], [S("now"), 0.6], [S("cta"), 0.6]],
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
    sfx(wt("revolt", "aspergent", 4) - 0.3, "dark_whoosh", { gain: 0.6, dur: 1.2 });
    sfx(S("stop") + 0.2, "scribble", { dur: 1.0 });
    sfx(S("twist") + 0.4, "click", { gain: 0.6 });
    sfx(wt("cta", "Le", 0.3) + 0.6, "ding", { gain: 0.3 });
    sfx(S("inside") + 0.2, "scribble", { dur: 1.4 });
    sfx(wt("inside", "chef", 10.3) - 0.3, "scribble", { dur: 1.0 });
    const tps = wt("now", "pseudo", 1.4); for (let k = 0; k < 4; k++) sfx(tps + k * 0.45, "pop", { gain: 0.35 });
  },
});
