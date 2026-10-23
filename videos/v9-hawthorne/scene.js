// Hawthorne : l'effet d'être observé (Western Electric, années 1920-30) et sa remise en cause. Plans calés sur la voix off.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const CHAPTERS = { hook: "EXPÉRIENCE RÉELLE", setup: "L'USINE", light: "LA LUMIÈRE", weird: "L'ÉNIGME", relay: "LA SALLE À PART", name: "L'EFFET", twist: "LE REVERS", lesson: "LA LEÇON", cta: "ET TOI ?" };
const FLOOR = 1180;

function workshop(t, light = 0.7) {
  const k = 0.35 + 0.65 * light;
  ctx.fillStyle = `rgb(${Math.round(70 * k + 20)},${Math.round(62 * k + 18)},${Math.round(56 * k + 20)})`; ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = `rgba(255,255,255,${0.04 * k})`; for (let x = 0; x < W; x += 180) ctx.fillRect(x, 0, 6, FLOOR);
  ctx.fillStyle = "#3A342E"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
}
function sparkTrend(x, y, w, h, pts, p, color) { lineChart(x, y, w, h, [{ color, pts }], p, { yLabel: "PRODUCTION" }); }

const SHOT = {
  hook(s, t) {
    workshop(t, 0.8);
    const te = wt("hook", "regarde", 2.4);
    workbench(430, 1000, 520);
    character(380, FLOOR + 20, 1.1, "worker", { pose: "stand", override: { sh: [1.2 + Math.sin(t * 8) * 0.1, 0.6], el: [0.6, 0.6] }, face: { look: [1, 0.4], eyes: t > te ? "wide" : "open", brows: t > te ? "up" : "neutral" }, t });
    if (t > te - 0.4) { const p = pop(t, te - 0.4); ctx.save(); ctx.translate(820, 520); ctx.scale(p, p); eyeIcon(0, 0, 1.1, 1, COL.gold); ctx.restore(); }
    const g = t > te ? easeOutExpo(prog(t, te, te + 0.8)) : 0;
    ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.roundRect(700, 720, 70, 360, 20); ctx.fill();
    ctx.fillStyle = COL.green; ctx.beginPath(); ctx.roundRect(700, 1080 - (140 + 200 * g), 70, 140 + 200 * g, 20); ctx.fill();
    txt("RENDEMENT", 735, 1120, 26, "MontX", "#fff");
  },
  setup(s, t) {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, "#9DB8D2"); g.addColorStop(1, "#E7E0D2"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#6F6A63"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    factory(540, FLOOR, 0.8, t);
    headline("ANNÉES 20 · PRÈS DE CHICAGO", 380, 46, COL.ink, t, s.start + 0.05, { spacing: 2 });
    label("DES MILLIERS D'OUVRIERS", W / 2, 1290, 34, "#fff", COL.ink, pop(t, wt("setup", "milliers", 3.4) - 0.3));
    if (t > wt("setup", "téléphonique", 5.6) - 0.5) { const p = pop(t, wt("setup", "téléphonique", 5.6) - 0.5); ctx.save(); ctx.translate(200, 560); ctx.scale(p, p); oldPhone(0, 0, 1.6); ctx.restore(); }
  },
  light(s, t) {
    const tl = wt("light", "lumière", 2.2), tm = wt("light", "monte", 3.2);
    const lv = 0.35 + 0.65 * easeInOut(prog(t, tl - 0.4, tl + 0.4));
    workshop(t, lv);
    bulb(540, 520, 1.2, lv);
    label("PLUS DE LUMIÈRE", W / 2, 420, 38, COL.ink, COL.gold, pop(t, tl - 0.3));
    sparkTrend(540, 1020, 760, 260, [0.25, 0.28, 0.35, 0.48, 0.62], prog(t, tm - 0.6, tm + 0.6), COL.green);
  },
  weird(s, t) {
    const tg = wt("weird", "témoin", 1.4), ta = wt("weird", "aussi", 3.2), tb = wt("weird", "baisse", 5), tv = wt("weird", "presque", 7.4);
    if (t < tb - 0.5) {
      spotlightBg(t, "#1E2230");
      label("GROUPE TÉMOIN : LUMIÈRE INCHANGÉE", W / 2, 420, 32, "#fff", "#3A3F55", pop(t, tg - 0.3));
      bulb(540, 560, 0.7, 0.55);
      sparkTrend(540, 1010, 760, 260, [0.25, 0.3, 0.37, 0.47, 0.58], prog(t, ta - 1.0, ta + 0.4), COL.cyan);
      if (t > ta) stamp("ÇA MONTE AUSSI ?!", W / 2, 1200, 50, COL.gold, prog(t, ta, ta + 0.3), -0.05);
    } else {
      const lv = 0.9 - 0.85 * easeInOut(prog(t, tb - 0.4, tv + 0.2));
      workshop(t, lv);
      bulb(540, 520, 1.0, lv);
      label("ON BAISSE LA LUMIÈRE…", W / 2, 420, 36, COL.ink, COL.gold, pop(t, tb - 0.4));
      sparkTrend(540, 1020, 760, 260, [0.55, 0.56, 0.55, 0.56, 0.5, 0.25], prog(t, tb - 0.2, tv + 0.6), COL.green);
    }
  },
  relay(s, t) {
    const lt = t - s.start, ts = wt("relay", "six", 0.6), tp = wt("relay", "Pauses", 2.6), th = wt("relay", "horaires", 3.2), tc = wt("relay", "collations", 3.8), tg = wt("relay", "grimpe", 5.4);
    workshop(t, 0.85);
    workbench(540, 1000, 900);
    for (let k = 0; k < 6; k++) { const p = fade(t, ts - 0.3 + k * 0.08); if (p <= 0) continue; ctx.save(); ctx.globalAlpha = p; character(130 + k * 140, FLOOR - 40, 0.62, "worker", { pose: "stand", override: { sh: [1.1 + 0.1 * Math.sin(t * 7 + k), 0.6], el: [0.7, 0.6] }, face: { look: [1, 0.4] }, t, seed: k, shadow: false }); ctx.restore(); }
    character(985, FLOOR + 50, 0.8, "researcher", { pose: "stand", flip: true, face: { look: [-1, 0] }, props: { clipboard: true }, t });
    [["PAUSES", tp, 260], ["HORAIRES", th, 540], ["COLLATIONS", tc, 820]].forEach(([l, tt, x]) => label(l, x, 420, 32, COL.ink, COL.gold, pop(t, tt - 0.3)));
    sparkTrend(540, 620, 700, 180, [0.2, 0.3, 0.42, 0.55, 0.7], prog(t, tp - 0.3, tg + 0.4), COL.green);
  },
  name(s, t) {
    spotlightBg(t, "#1C2238");
    const tn = wt("name", "effet", 3), to = wt("name", "observé", 5.6);
    const blink = Math.max(0.15, 1 - Math.pow(Math.max(0, Math.sin(t * 1.3)), 40));
    ctx.save(); ctx.translate(540, 680); const p = pop(t, s.start + 0.1); ctx.scale(p, p); eyeIcon(0, 0, 2.2, blink, COL.gold); ctx.restore();
    headline("L'EFFET HAWTHORNE", 1000, 80, "#fff", t, tn - 0.3, { glow: "rgba(255,201,60,.5)" });
    label("ON CHANGE QUAND ON SE SAIT OBSERVÉ", W / 2, 1140, 32, COL.ink, COL.gold, pop(t, to - 0.6));
  },
  twist(s, t) {
    spotlightBg(t, "#2A1E22");
    const t11 = wt("twist", "2011", 0.6), td = wt("twist", "données", 2.8), tv = wt("twist", "faible", 5);
    headline("2011", 380, 110, "#fff", t, t11 - 0.3, { spacing: 8 });
    character(150, 1250, 0.75, "man1950", { pose: "stand", face: { look: [1, -0.2] }, props: { paper: true }, t });
    character(310, 1250, 0.75, "man1950b", { pose: "stand", face: { look: [1, -0.2] }, props: { paper: true }, t });
    lineChart(580, 760, 520, 300, [
      { color: COL.gold, pts: [0.2, 0.45, 0.7, 0.9], dash: [18, 12], label: "LÉGENDE" },
      { color: COL.cyan, pts: [0.4, 0.42, 0.45, 0.44], label: "DONNÉES" },
    ], prog(t, td - 0.4, td + 1.0), { yLabel: "EFFET" });
    stamp("TRÈS EXAGÉRÉ", 720, 1060, 54, COL.accent, prog(t, tv - 0.3, tv + 0.1), -0.06);
  },
  lesson(s, t) {
    spotlightBg(t, "#1C2238");
    const tm = wt("lesson", "mesuré", 3.4);
    character(330, 1230, 1.1, "researcher", { pose: "point", face: { look: [1, 0] }, props: { clipboard: true }, t });
    character(780, 1230, 1.1, "worker", { pose: "stand", flip: true, face: { look: [-1, 0], eyes: "wide", mouth: "smile" }, t });
    ctx.save(); ctx.translate(560, 600); const p = pop(t, tm - 0.6); ctx.scale(p, p); eyeIcon(0, 0, 0.8, 1, COL.gold); ctx.restore();
    label("MESURER SANS INFLUENCER ?", W / 2, 420, 38, "#fff", "#3A3F55", pop(t, s.start + 0.3));
  },
  cta(s, t) {
    spotlightBg(t, "#1E2230");
    ctaButtons(t, s, "OUI, CLAIREMENT", "PAS DU TOUT", COL.green, COL.accent);
    sourceLine("Sources : Roethlisberger & Dickson (1939) · Levitt & List (2011), AEJ: Applied");
  },
};

startStory({
  music: { style: "lofi", bpm: 92, drop: 0 }, bed: 0.22, duck: 0.55,
  keyRegex: /^(REGARDE|HAWTHORNE|LUMIÈRE|AUSSI|SIX|OBSERVÉ|2011|LÉGENDE|FAIBLE)/,
  hits: [["hook", "regarde", 0.06], ["light", "monte", 0.05], ["weird", "aussi", 0.08], ["relay", "grimpe", 0.06], ["name", "effet", 0.07], ["twist", "faible", 0.08]],
  sfx() {
    sfx(wt("light", "lumière", 2.2) - 0.3, "rise", { dur: 0.8, gain: 0.4 });
    sfx(wt("weird", "baisse", 5) - 0.3, "swish", { gain: 0.6 });
    sfx(wt("name", "effet", 3) - 0.3, "chime", { gain: 0.6 });
    sfx(SEG.cta.start + 0.1, "pop"); sfx(SEG.cta.start + 0.3, "pop");
  },
});
