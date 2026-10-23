// Asch : la pression du groupe (années 1950). Plans calés sur la voix off (timings.json).
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const CHAPTERS = { hook: "EXPÉRIENCE RÉELLE", setup: "LE TEST", task: "LE TEST", twist: "LE PIÈGE", result: "LE RÉSULTAT", why: "POURQUOI ?", ally: "L'ANTIDOTE", nuance: "LA NUANCE", cta: "ET TOI ?" };
const SEATS = 8, YOU = 6; // seven accomplices, the real participant answers second to last

// row of people seated at a long table, facing the card on the right
function aschTable(t, { bubbles = [], youFace = {}, z = 1, focus = null, allyIdx = -1 } = {}) {
  const gY = 1090, x0 = 92, step = 128;
  ctx.fillStyle = "#2A2F45"; ctx.fillRect(0, gY, W, H - gY);
  ctx.fillStyle = "rgba(255,255,255,.04)"; for (let k = 0; k < 6; k++) ctx.fillRect(0, gY + 40 + k * 70, W, 3);
  ctx.save();
  if (focus !== null) { const fx = x0 + focus * step; ctx.translate(fx, gY - 200); ctx.scale(z, z); ctx.translate(-fx, -(gY - 200)); }
  for (let i = 0; i < SEATS; i++) {
    const x = x0 + i * step, you = i === YOU;
    ctx.fillStyle = "#4A3A2E"; ctx.fillRect(x - 46, gY - 128, 92, 15); ctx.fillRect(x - 42, gY - 113, 11, 113); ctx.fillRect(x - 50, gY - 300, 12, 190);
    character(x, gY, 0.6, you ? "student" : i % 2 ? "man1950" : "man1950b", { pose: "sit", face: you ? youFace : { look: [1, -0.2] }, t, seed: i });
  }
  ctx.fillStyle = "#6E4C34"; ctx.fillRect(30, gY - 80, W - 60, 24); ctx.fillStyle = "#5A3E2B"; ctx.fillRect(30, gY - 56, W - 60, 12);
  label("TOI", x0 + YOU * step + 6, gY + 70, 34, COL.ink, COL.gold, 1);
  for (const b of bubbles) {
    const x = x0 + b.i * step;
    iconBubble(x + 12, gY - 430 - (b.i % 2) * 64, 112, 96, b.text, { p: b.p, size: 56, bg: b.bg || COL.cream, fg: b.fg || COL.ink });
  }
  ctx.restore();
}

const SHOT = {
  hook(s, t) {
    spotlightBg(t, "#1B2140");
    lineCard(540, 700, 1.0, { p: pop(t, s.start + 0.1, 0.5, 1.6) });
    const t3 = wt("hook", "trois", 2.2);
    const r = prog(t, wt("hook", "quatre", 3.4) - 0.3, wt("hook", "quatre", 3.4) + 0.6);
    if (t > t3 + 0.6) {
      for (let k = 0; k < 4; k++) {
        const p = pop(t, t3 + 0.5 + k * 0.08); if (p <= 0) continue;
        ctx.save(); ctx.translate(270 + k * 180, 1150); ctx.scale(p, p);
        iconPerson(0, 0, 150, k < 3 && r > (k + 1) / 4 ? COL.accent : "rgba(255,255,255,.85)"); ctx.restore();
      }
      label("3 SUR 4 SE TROMPENT", W / 2, 1310, 40, "#fff", COL.accent, pop(t, wt("hook", "fois", 4.3) - 0.2));
    }
  },
  setup(s, t) {
    spotlightBg(t, "#1A2038");
    headline("ANNÉES 50", 380, 96, "#fff", t, s.start + 0.05, { spacing: 6 });
    headline("UN « TEST DE VISION »", 480, 46, COL.gold, t, wt("setup", "test", 2.5) - 0.3, { spacing: 3 });
    aschTable(t, { youFace: { look: [1, 0] } });
    const tc = wt("setup", "complices", 5.5);
    for (let i = 0; i < SEATS; i++) if (i !== YOU) label("COMPLICE", 92 + i * 128 + 8, 640 + (i % 2) * 56, 21, "#fff", COL.accent, pop(t, tc - 0.3 + i * 0.07), { spacing: 1 });
  },
  task(s, t) {
    spotlightBg(t, "#1B2140");
    const tq = wt("task", "Laquelle", 1.6), ts = wt("task", "Seul", 3.2);
    lineCard(540, 760, 1.05, { p: pop(t, s.start, 0.45, 1.6), hi: t > tq + 0.9 ? 0 : -1 });
    if (t > tq - 0.2) label("MÊME LONGUEUR QUE X ?", W / 2, 400, 40, COL.ink, COL.gold, pop(t, tq - 0.2));
    if (t > ts - 0.2) label("SEUL : MOINS DE 1 % D'ERREURS", W / 2, 1180, 36, "#fff", COL.green, pop(t, ts - 0.2));
  },
  twist(s, t) {
    spotlightBg(t, "#22172E");
    const tm = wt("twist", "mauvaise", 2.4), ty = wt("twist", "toi", 4.2);
    const bubbles = [];
    for (let i = 0; i < SEATS; i++) if (i !== YOU) bubbles.push({ i, text: "B", p: prog(t, tm - 0.6 + i * 0.16, tm - 0.35 + i * 0.16), bg: COL.accent, fg: "#fff" });
    bubbles.push({ i: YOU, text: "?", p: prog(t, ty, ty + 0.25) });
    aschTable(t, { bubbles, youFace: { eyes: t > ty ? "wide" : "open", brows: "worried", mouth: t > ty ? "o" : "neutral", look: [-1, -0.3] }, z: 1 + 0.25 * easeInOut(prog(t, ty - 0.2, ty + 0.8)), focus: YOU });
    lineCard(540, 410, 0.44, { p: 1, wrong: t > tm ? 1 : -1 });
  },
  result(s, t) {
    spotlightBg(t, "#1A2038");
    const tt = wt("result", "tiers", 1.6), t75 = wt("result", "75", 4);
    headline("RÉPONSES QUI SUIVENT LE GROUPE", 380, 40, "rgba(255,255,255,.9)", t, s.start + 0.1);
    // one third pie
    const p = prog(t, tt - 0.5, tt + 0.5);
    if (p > 0) {
      ctx.save(); ctx.translate(540, 640);
      ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.beginPath(); ctx.arc(0, 0, 170, 0, 6.29); ctx.fill();
      ctx.fillStyle = COL.accent; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 170, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI / 3 * easeOutExpo(p)); ctx.closePath(); ctx.fill();
      ctx.restore();
      txt("≈ 1 / 3", 540, 870, 70, "MontX", "#fff");
    }
    if (t > t75 - 0.4) {
      headline("ONT CÉDÉ AU MOINS UNE FOIS", 1000, 38, "rgba(255,255,255,.9)", t, t75 - 0.4);
      peopleRow(250, 1150, 120, 0.75, prog(t, t75 - 0.3, t75 + 0.8), COL.gold, { n: 4, gap: 1.6 });
      bigStat(75, " %", "", 540, 1280, 80, COL.gold, t, t75);
    }
  },
  why(s, t) {
    spotlightBg(t, "#1F1A33");
    const tp = wt("why", "peur", 0.8), td = wt("why", "doute", 2.4);
    ctx.fillStyle = "#4A3A2E"; ctx.fillRect(225, 1090, 190, 20); ctx.fillRect(232, 1110, 16, 140); ctx.fillRect(392, 1110, 16, 140); ctx.fillRect(220, 800, 18, 300);
    character(330, 1250, 1.25, "student", { pose: "sit", face: { brows: "worried", eyes: t > td ? "wide" : "open", mouth: "grimace", look: [1, -0.4] }, t });
    ctx.fillStyle = "#2A2F45"; ctx.fillRect(0, 1250, W, H - 1250);
    iconBubble(660, 560, 520, 130, "Peur d'être rejeté", { p: prog(t, tp - 0.1, tp + 0.2), size: 48 });
    iconBubble(640, 860, 600, 130, "Et si je voyais mal ?", { p: prog(t, td + 0.2, td + 0.5), size: 48, bg: COL.gold });
  },
  ally(s, t) {
    spotlightBg(t, "#16263A");
    const ta = wt("ally", "allié", 1.4), te = wt("ally", "effondre", 3.4);
    const bubbles = [];
    for (let i = 0; i < SEATS; i++) if (i !== YOU) bubbles.push({ i, text: i === 3 ? "A" : "B", p: 1, bg: i === 3 ? COL.green : COL.accent, fg: "#fff" });
    bubbles.push({ i: YOU, text: "A", p: prog(t, te - 0.4, te - 0.1), bg: COL.green, fg: "#fff" });
    aschTable(t, { bubbles, youFace: { brows: t > ta + 0.3 ? "up" : "worried", mouth: t > te - 0.4 ? "smile" : "neutral", look: [-1, -0.3] } });
    label("UN SEUL ALLIÉ", 92 + 3 * 128 + 12, 520, 34, COL.ink, COL.green, pop(t, ta - 0.2));
    // pressure gauge
    const g = 1 - 0.85 * easeOutExpo(prog(t, te - 0.3, te + 0.6));
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.roundRect(140, 360, 800, 44, 22); ctx.fill();
    ctx.fillStyle = g > 0.5 ? COL.accent : COL.green; ctx.beginPath(); ctx.roundRect(140, 360, 800 * g, 44, 22); ctx.fill();
    txt("PRESSION DU GROUPE", 540, 330, 30, "MontX", "rgba(255,255,255,.85)", { spacing: 2 });
  },
  nuance(s, t) {
    spotlightBg(t, "#1A2038");
    const tq = wt("nuance", "quart", 0.6), tm = wt("nuance", "moutons", 3);
    peopleRow(250, 640, 150, 0.25, prog(t, tq - 0.3, tq + 0.6), COL.green, { n: 4, gap: 1.55 });
    label("N'ONT JAMAIS CÉDÉ", W / 2, 840, 40, COL.ink, COL.green, pop(t, tq + 0.3));
    stamp("PAS DES MOUTONS", W / 2, 1060, 66, COL.gold, prog(t, tm - 0.3, tm + 0.1), -0.06);
  },
  cta(s, t) {
    spotlightBg(t, "#1B2140");
    ctaButtons(t, s, "J'AURAIS TENU BON", "J'AURAIS CÉDÉ", COL.green, COL.accent);
    sourceLine("Source : Asch (1951, 1956), expériences sur la conformité");
  },
};

startStory({
  music: { style: "lofi", bpm: 92, drop: 0 }, bed: 0.22, duck: 0.55,
  keyRegex: /^(TROIS|QUATRE|COMPLICES|MAUVAISE|TIERS|75|ALLIÉ|QUART|MOUTONS)/,
  hits: [["hook", "évidente", 0.05], ["hook", "quatre", 0.07], ["setup", "complices", 0.08], ["twist", "mauvaise", 0.07], ["result", "tiers", 0.06], ["result", "75", 0.08], ["ally", "effondre", 0.07], ["nuance", "moutons", 0.06]],
  sfx() {
    sfx(wt("task", "Laquelle", 1.6) - 0.2, "pop");
    for (let i = 0; i < 7; i++) sfx(wt("twist", "mauvaise", 2.4) - 0.6 + i * 0.16 + (i >= YOU ? 0.16 : 0), "pop", { gain: 0.5 });
    sfx(wt("ally", "allié", 1.4) - 0.2, "ding");
    sfx(SEG.cta.start + 0.1, "pop"); sfx(SEG.cta.start + 0.3, "pop");
  },
});
