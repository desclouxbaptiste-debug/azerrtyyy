// Stanford : la fausse prison de Zimbardo (1971) et ses critiques. Plans calés sur la voix off (timings.json).
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6", khaki: "#B79E6E" };
const CHAPTERS = { hook: "EXPÉRIENCE RÉELLE", setup: "LA PRISON", recruit: "LE CASTING", arrest: "L'ARRESTATION", guards: "LES GARDIENS", revolt: "L'ESCALADE", stop: "L'ARRÊT", claim: "LA CONCLUSION", twist: "LE REVERS", today: "AUJOURD'HUI", cta: "ET TOI ?" };
const FLOOR = 1180;

function curtains(open, t) {
  // red theatre curtains closing in from the sides (open = 1: fully open)
  const w = (1 - open) * W * 0.5 + 60;
  for (const side of [0, 1]) {
    const x = side ? W - w : 0;
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#7A1414"); g.addColorStop(0.5, "#B32222"); g.addColorStop(1, "#6A1010");
    ctx.fillStyle = g; ctx.fillRect(x, 0, w, H);
    ctx.fillStyle = "rgba(0,0,0,.18)"; for (let k = 0; k < w; k += 70) ctx.fillRect(x + k + 30 + Math.sin(t + k) * 4, 0, 14, H);
  }
  ctx.fillStyle = "#5A0E0E"; ctx.fillRect(0, 0, W, 140); ctx.fillStyle = "#C9A24A"; ctx.fillRect(0, 140, W, 10);
}
function callout(text, x, y, tx, ty, p, color = COL.gold) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(p * 2);
  ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, tx, easeOutCubic(clamp(p))), lerp(y, ty, easeOutCubic(clamp(p)))); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 10, 0, 6.29); ctx.fill();
  ctx.restore();
  label(text, tx, ty, 32, COL.ink, color, p);
}

const SHOT = {
  hook(s, t) {
    prisonCorridor(t);
    const z = 1 + (t - s.start) * 0.03;
    camera(z, 540, 1000, () => character(540, FLOOR + 40, 1.35, "guard", { pose: "stand", face: { mouth: "neutral" }, props: { baton: true }, t }));
    const tm = wt("hook", "mise", 3);
    stamp("MISE EN SCÈNE ?", W / 2, 600, 70, COL.accent, prog(t, tm - 0.2, tm + 0.2), -0.08);
  },
  setup(s, t) {
    spotlightBg(t, "#1E2230");
    headline("ÉTÉ 1971", 380, 100, "#fff", t, s.start + 0.05, { spacing: 6 });
    headline("UNIVERSITÉ STANFORD", 480, 46, COL.gold, t, s.start + 0.3, { spacing: 4 });
    // building cross-section with the basement turned into a jail
    const p = fade(t, s.start + 0.4, 0.5), tb = wt("setup", "sous-sol", 3.4);
    ctx.save(); ctx.globalAlpha = p;
    ctx.fillStyle = "#C9B79A"; ctx.fillRect(220, 620, 640, 420); ctx.fillStyle = "#8C7A62"; ctx.beginPath(); ctx.moveTo(190, 620); ctx.lineTo(540, 520); ctx.lineTo(890, 620); ctx.fill();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = "#FFE3A3"; ctx.fillRect(270 + c * 150, 670 + r * 160, 90, 100); }
    ctx.fillStyle = "#4A4038"; ctx.fillRect(140, 1040, 800, 12);
    const b = easeOutExpo(prog(t, tb - 0.3, tb + 0.4));
    ctx.fillStyle = "#2B2D33"; ctx.fillRect(220, 1052, 640, 220);
    if (b > 0) { ctx.strokeStyle = "#8E949E"; ctx.lineWidth = 9; for (let k = 0; k < 12; k++) { const x = 250 + k * 52; ctx.beginPath(); ctx.moveTo(x, 1060); ctx.lineTo(x, 1060 + 200 * b); ctx.stroke(); } }
    ctx.restore();
    label("SOUS-SOL → PRISON", W / 2, 1310, 36, "#fff", COL.accent, pop(t, tb + 0.2));
  },
  recruit(s, t) {
    spotlightBg(t, "#22202E");
    const tt = wt("recruit", "tirés", 4.6), tg = wt("recruit", "gardiens", 5.6), tp = wt("recruit", "prisonniers", 6.4);
    if (t < tt - 0.3) newspaperAd(540, 760, 1.05, t, s.start + 0.05);
    else {
      coinFlip(540, 640, 1.3, t, tt - 0.3, "?");
      if (t > tg - 0.3) { character(300, 1180, 0.95, "guard", { pose: "stand", face: {}, props: { baton: true }, t }); label("GARDIENS", 300, 1250, 34, COL.ink, COL.khaki, pop(t, tg - 0.3)); }
      if (t > tp - 0.3) { character(780, 1180, 0.95, "prisoner", { pose: "stand", flip: true, face: { brows: "worried", look: [-1, 0] }, t }); label("PRISONNIERS", 780, 1250, 34, COL.ink, COL.cream, pop(t, tp - 0.3)); }
    }
  },
  arrest(s, t) {
    const lt = t - s.start, tn = wt("arrest", "numéro", 3), tb = wt("arrest", "blouse", 3.6), tc = wt("arrest", "chaîne", 4.2);
    if (t < tn - 0.4) {
      const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, "#8EC5F0"); g.addColorStop(1, "#E9F2F7"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
      ctx.fillStyle = "#E3D2B5"; ctx.fillRect(560, 520, 460, 660); ctx.fillStyle = "#9C5B3B"; ctx.beginPath(); ctx.moveTo(520, 520); ctx.lineTo(790, 360); ctx.lineTo(1060, 520); ctx.fill();
      ctx.fillStyle = "#5A3E2B"; ctx.fillRect(740, 930, 110, 250);
      ctx.fillStyle = "#6F6A63"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
      policeCar(lerp(-300, 330, easeOutCubic(prog(lt, 0, 1.2))), FLOOR + 40, 0.9, t);
      label("LA VRAIE POLICE", W / 2, 400, 42, "#fff", "#2F57B5", pop(t, wt("arrest", "police", 2.2) - 0.3));
    } else {
      spotlightBg(t, "#25232E");
      character(400, 1220, 1.3, "prisoner", { pose: "stand", face: { brows: "worried", mouth: "frown" }, t });
      ctx.strokeStyle = "#9AA0A8"; ctx.lineWidth = 8; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(470 + k * 26, 1200, 13, 8, 0, 0, 6.29); ctx.stroke(); }
      callout("UN NUMÉRO", 400, 820, 790, 640, prog(t, tn - 0.3, tn + 0.1));
      callout("UNE BLOUSE", 420, 980, 800, 880, prog(t, tb - 0.3, tb + 0.1));
      callout("UNE CHAÎNE", 560, 1200, 820, 1110, prog(t, tc - 0.3, tc + 0.1));
    }
  },
  guards(s, t) {
    spotlightBg(t, "#2A2620");
    character(380, 1240, 1.45, "guard", { pose: "stand", face: { mouth: "neutral" }, props: { baton: true }, t });
    callout("UNIFORME", 380, 900, 790, 640, prog(t, wt("guards", "uniforme", 0.8) - 0.3, wt("guards", "uniforme", 0.8) + 0.1), COL.khaki);
    callout("MATRAQUE", 520, 1050, 810, 900, prog(t, wt("guards", "matraque", 1.6) - 0.3, wt("guards", "matraque", 1.6) + 0.1), COL.khaki);
    callout("LUNETTES MIROIR", 470, 600, 760, 470, prog(t, wt("guards", "lunettes", 2.4) - 0.3, wt("guards", "lunettes", 2.4) + 0.1), COL.khaki);
  },
  revolt(s, t) {
    const tr = wt("revolt", "révolte", 1.4), te = wt("revolt", "extincteurs", 3.2), tp = wt("revolt", "pompes", 4), tn = wt("revolt", "sommeil", 4.8);
    prisonCorridor(t, { sign: false });
    for (const cx of [210, 870]) { character(cx, FLOOR - 10, 0.8, "prisoner", { pose: "stand", override: t > tr ? { sh: [2.8, 0.1], el: [0.2, 0.2] } : {}, face: { brows: "angry", mouth: t > tr ? "o" : "frown" }, flip: cx > 540, t }); }
    // bars on top of the prisoners
    for (const cx of [210, 870]) { ctx.strokeStyle = "#8E949E"; ctx.lineWidth = 12; for (let k = 0; k < 7; k++) { const bx = cx - 120 + k * 40; ctx.beginPath(); ctx.moveTo(bx, 570); ctx.lineTo(bx, 1180); ctx.stroke(); } }
    if (t > te - 0.4) { character(560, FLOOR + 60, 1.0, "guard", { pose: "stand", face: { brows: "angry" }, t }); extinguisher(650, FLOOR - 120, 0.8, t, prog(t, te - 0.3, te + 0.2)); }
    label("JOUR 2 : RÉVOLTE", W / 2, 400, 44, "#fff", COL.accent, pop(t, tr - 0.3));
    if (t > tp - 0.3) label("POMPES", 300, 1300, 34, COL.ink, COL.gold, pop(t, tp - 0.3));
    if (t > tn - 0.3) label("NUITS SANS SOMMEIL", 740, 1300, 34, COL.ink, COL.gold, pop(t, tn - 0.3));
  },
  stop(s, t) {
    spotlightBg(t, "#1E2230");
    calendarDays(540, 760, 1.05, t, s.start + 0.05);
    label("ARRÊTÉE AU JOUR 6", W / 2, 1150, 46, "#fff", COL.accent, pop(t, wt("stop", "six", 3.4) - 0.2));
  },
  claim(s, t) {
    prisonCorridor(t, { sign: false });
    ctx.fillStyle = "rgba(10,12,20,.55)"; ctx.fillRect(0, 0, W, H);
    quoteCard(540, 760, 960, ["La situation suffit", "à créer des bourreaux."], prog(t, s.start + 0.1, s.start + 0.5), { author: "la conclusion de Zimbardo", size: 64 });
  },
  twist(s, t) {
    spotlightBg(t, "#2A1E22");
    const te = wt("twist", "encouragés", 2.4), ts = wt("twist", "simulé", 6);
    tapeRecorder(540, 600, 1.0, t);
    label("ARCHIVES AUDIO", W / 2, 400, 38, "#fff", "#3A3C44", pop(t, s.start + 0.1));
    label("GARDIENS ENCOURAGÉS À ÊTRE DURS", W / 2, 860, 34, COL.ink, COL.gold, pop(t, te - 0.3));
    if (t > ts - 1.4) {
      character(330, 1250, 0.95, "prisoner", { pose: "stand", face: { brows: "up", mouth: "smile", look: [1, -0.2] }, t });
      iconBubble(700, 1040, 460, 120, "J'ai fait semblant", { p: prog(t, ts - 1.2, ts - 0.9), size: 44 });
    }
  },
  today(s, t) {
    prisonCorridor(t, { sign: true });
    const tm = wt("today", "mise", 2.2);
    curtains(1 - 0.75 * easeInOut(prog(t, tm - 0.6, tm + 0.3)), t);
    stamp("MISE EN SCÈNE ?", W / 2, 760, 72, COL.gold, prog(t, tm - 0.1, tm + 0.3), -0.07);
    label("PLUS QU'UNE EXPÉRIENCE", W / 2, 960, 34, "#fff", "#5A0E0E", pop(t, tm + 0.6));
  },
  cta(s, t) {
    spotlightBg(t, "#22202E");
    ctaButtons(t, s, "LE POUVOIR CORROMPT", "BELLE HISTOIRE", COL.accent, COL.gold);
    sourceLine("Sources : Zimbardo (1971-73) · Le Texier (2019), American Psychologist");
  },
};

startStory({
  music: { style: "lofi", bpm: 88, drop: 0 }, bed: 0.22, duck: 0.55,
  keyRegex: /^(MISE|1971|PRISON|POLICE|RÉVOLTE|SIX|BOURREAUX|ENCOURAGÉS|SIMULÉ|DURS)/,
  hits: [["hook", "mise", 0.07], ["recruit", "tirés", 0.05], ["arrest", "police", 0.06], ["revolt", "révolte", 0.08], ["stop", "six", 0.07], ["twist", "encouragés", 0.08], ["twist", "simulé", 0.07], ["today", "mise", 0.06]],
  sfx() {
    sfx(SEG.arrest.start + 0.1, "rise", { dur: 1.0, gain: 0.4 });
    sfx(wt("revolt", "extincteurs", 3.2) - 0.3, "whoosh", { gain: 0.6, dur: 0.8 });
    sfx(wt("recruit", "tirés", 4.6) - 0.3, "ding", { gain: 0.5 });
    sfx(SEG.cta.start + 0.1, "pop"); sfx(SEG.cta.start + 0.3, "pop");
  },
});
