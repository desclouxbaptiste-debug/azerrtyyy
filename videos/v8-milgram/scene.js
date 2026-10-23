// Milgram : l'obéissance à l'autorité (Yale, 1961-1963). Plans calés sur la voix off (timings.json).
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6", grey: "#9EA3A8" };
const CHAPTERS = { hook: "EXPÉRIENCE RÉELLE", setup: "L'ANNONCE", roles: "LE PIÈGE", machine: "LA MACHINE", fake: "LE SECRET", protest: "L'ESCALADE", prod: "L'AUTORITÉ", predict: "LES PRONOSTICS", result: "LE RÉSULTAT", nuance: "LA NUANCE", cta: "ET TOI ?" };
const FLOOR = 1180;

function lab(t) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, "#DCD8CC"); g.addColorStop(1, "#C9C3B4");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = "#8E8676"; ctx.fillRect(0, FLOOR - 140, W, 10);
  ctx.fillStyle = "#6E6A62"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
}
// two rooms split by a wall: teacher + generator left, learner strapped right
function twoRooms(t, { level = 0, knock = -1, silence = false } = {}) {
  lab(t);
  ctx.fillStyle = "#B8B1A1"; ctx.fillRect(640, 300, 440, FLOOR - 300);
  ctx.fillStyle = "#7C7466"; ctx.fillRect(610, 300, 34, FLOOR - 300);
  strapChair(850, FLOOR, 1.0);
  character(860, FLOOR, 0.85, "learner", { pose: "sit", face: { brows: "worried", mouth: silence ? "neutral" : "grimace", eyes: silence ? "closed" : "open", look: [-1, 0] }, flip: true, t });
  straps(860, FLOOR, -0.85);
  shockGenerator(300, 860, 0.5, level, t);
  character(250, FLOOR + 30, 0.95, "man1950", { pose: "stand", face: { brows: "worried", look: [1, 0] }, t });
  if (knock >= 0) { // knocks on the wall
    const k = t - knock;
    if (k > 0 && k < 1.6) for (let n = 0; n < 3; n++) { const p = prog(k, n * 0.35, n * 0.35 + 0.4); if (p > 0 && p < 1) { ctx.strokeStyle = `rgba(255,77,77,${1 - p})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(612, 760, 40 + p * 120, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); } }
  }
}

const SHOT = {
  hook(s, t) {
    spotlightBg(t, "#2A1E22");
    const lvl = 30 * easeInOut(prog(t, s.start + 0.2, wt("hook", "volts", 1.6) + 0.3));
    shockGenerator(540, 760, 1.0, lvl, t);
    if (t > wt("hook", "blouse", 4.3) - 0.5) character(860, 1320, 0.8, "experimenter", { pose: "point", flip: true, face: { look: [-1, 0] }, t });
    label("450 VOLTS", W / 2, 420, 52, "#fff", COL.accent, pop(t, wt("hook", "volts", 1.6) - 0.2));
  },
  setup(s, t) {
    spotlightBg(t, "#1E2230");
    headline("1961", 380, 110, "#fff", t, s.start + 0.05, { spacing: 8 });
    headline("UNIVERSITÉ YALE", 490, 46, COL.gold, t, s.start + 0.35, { spacing: 4 });
    const looks = ["man1950", "man1950b", "passerby", "man1950", "learner"];
    looks.forEach((l, i) => { const p = fade(t, wt("setup", "ordinaires", 3.4) - 0.6 + i * 0.12); if (p <= 0) return; ctx.save(); ctx.globalAlpha = p; character(150 + i * 195, 1180, 0.72, l, { pose: "stand", face: { look: [1, 0] }, t, seed: i }); ctx.restore(); });
    label("« ÉTUDE SUR LA MÉMOIRE »", W / 2, 640, 38, COL.ink, COL.cream, pop(t, wt("setup", "mémoire", 5.4) - 0.3));
  },
  roles(s, t) {
    const tt = wt("roles", "truqué", 1), te = wt("roles", "élève", 2.6);
    if (t < te - 0.4) {
      spotlightBg(t, "#22202E");
      [["PROFESSEUR", -0.08, 360], ["PROFESSEUR", 0.06, 720]].forEach(([l, r, x], i) => {
        const p = pop(t, s.start + 0.1 + i * 0.15); if (p <= 0) return;
        ctx.save(); ctx.translate(x, 760); ctx.rotate(r); ctx.scale(p, p); paper(0, 0, 320, 180, { color: "#F3EAD3" }); txt(l, 0, 6, 40, "Caveat", "#1E2A6E"); ctx.restore();
      });
      label("LES DEUX PAPIERS DISENT…", W / 2, 470, 36, "#fff", "#3A3C44", pop(t, s.start + 0.2));
      stamp("TRUQUÉ", W / 2, 1020, 80, COL.accent, prog(t, tt - 0.2, tt + 0.2));
    } else {
      twoRooms(t, {});
      label("L'ÉLÈVE : UN COMPLICE", 860, 420, 32, "#fff", COL.accent, pop(t, te - 0.2));
      label("TOI", 250, 560, 34, COL.ink, COL.gold, pop(t, te));
    }
  },
  machine(s, t) {
    spotlightBg(t, "#1E2230");
    const t15 = wt("machine", "15", 1.4), tc = wt("machine", "cran", 4);
    const lvl = t < tc - 0.4 ? 30 * easeInOut(prog(t, t15 - 0.2, t15 + 1.6)) * (t < t15 + 1.8 ? 1 : 1) : 30;
    const shown = t < tc - 0.4 ? lvl : Math.min(30, 1 + Math.floor((t - (tc - 0.4)) * 3));
    shockGenerator(540, 760, 1.0, t < t15 - 0.2 ? 0 : t < tc - 0.4 ? lvl : shown, t);
    label("DE 15 À 450 VOLTS", W / 2, 420, 44, "#fff", COL.accent, pop(t, t15 - 0.2));
    if (t > tc - 0.4) label("+15 V À CHAQUE ERREUR", W / 2, 1110, 38, COL.ink, COL.gold, pop(t, tc - 0.4));
  },
  fake(s, t) {
    twoRooms(t, { level: 8 });
    const tf = wt("fake", "faux", 0.8), ts = wt("fake", "sais", 2);
    stamp("CHOCS FACTICES", W / 2, 420, 64, COL.green, prog(t, tf - 0.2, tf + 0.2), -0.06);
    if (t > ts - 0.3) label("MAIS TOI, TU L'IGNORES", 300, 560, 32, COL.ink, COL.gold, pop(t, ts - 0.3));
  },
  protest(s, t) {
    const t3 = wt("protest", "300", 0.6), tk = wt("protest", "tape", 1.6), tr = wt("protest", "rien", 3.4);
    twoRooms(t, { level: 20, knock: tk - 0.2, silence: t > tr - 0.3 });
    label("300 VOLTS", 300, 420, 44, "#fff", COL.accent, pop(t, t3 - 0.2));
    if (t > tk - 0.2 && t < tr - 0.4) txt("BAM ! BAM !", 820, 560, 64, "MontX", COL.accent, { alpha: fade(t, tk - 0.2) });
    if (t > tr - 0.3) { ctx.fillStyle = `rgba(0,0,0,${0.35 * fade(t, tr - 0.3)})`; ctx.fillRect(644, 300, 436, FLOOR - 300); txt("…", 860, 600, 120, "MontX", "#fff", { alpha: fade(t, tr - 0.2) }); }
  },
  prod(s, t) {
    spotlightBg(t, "#26232A");
    const th = wt("prod", "hésites", 0.6), tc = wt("prod", "exige", 2.6);
    character(300, 1250, 1.2, "man1950", { pose: "stand", face: { brows: "worried", mouth: "grimace", look: [1, -0.2] }, t });
    character(800, 1250, 1.25, "experimenter", { pose: t > tc - 0.6 ? "talk" : "stand", phase: t * 4, flip: true, face: { mouth: t > tc - 0.6 && Math.sin(t * 11) > 0 ? "o" : "neutral", look: [-1, 0] }, props: { clipboard: true }, t });
    iconBubble(330, 520, 300, 110, "Je ne veux plus…", { p: prog(t, th - 0.2, th + 0.1), size: 40 });
    iconBubble(640, 760, 820, 150, "L'expérience exige que vous continuiez.", { p: prog(t, tc - 0.7, tc - 0.4), size: 40, bg: COL.cream, tail: "right" });
  },
  predict(s, t) {
    spotlightBg(t, "#1E2230");
    const tm = wt("predict", "mille", 3.2);
    headline("PRONOSTIC DES PSYCHIATRES", 400, 44, "#fff", t, s.start + 0.05);
    // 1000 dots, a single one lights up
    const p = prog(t, s.start + 0.2, s.start + 1.4);
    for (let i = 0; i < 1000; i++) {
      if (i / 1000 > p) break;
      const x = 112 + (i % 40) * 22, y = 560 + Math.floor(i / 40) * 22;
      const hot = i === 517 && t > tm - 0.3;
      ctx.fillStyle = hot ? COL.accent : "rgba(255,255,255,.28)"; ctx.beginPath(); ctx.arc(x, y, hot ? 10 + 3 * Math.sin(t * 8) : 7, 0, 6.29); ctx.fill();
    }
    label("À PEINE 1 SUR 1000", W / 2, 1200, 42, "#fff", COL.accent, pop(t, tm - 0.3));
  },
  result(s, t) {
    spotlightBg(t, "#2A1E22");
    const t26 = wt("result", "26", 1), t65 = wt("result", "65", 5);
    for (let i = 0; i < 40; i++) {
      const p = pop(t, s.start + 0.1 + i * 0.012, 0.25); if (p <= 0) continue;
      const lit = prog(t, t26 - 0.2 + i * 0.03, t26 + i * 0.03) > 0 && i < 26;
      ctx.save(); ctx.translate(150 + (i % 8) * 112, 520 + Math.floor(i / 8) * 128); ctx.scale(p, p); iconPerson(0, 0, 66, lit ? COL.accent : "rgba(255,255,255,.28)"); ctx.restore();
    }
    label("26 SUR 40 → 450 V", W / 2, 420, 42, "#fff", COL.accent, pop(t, t26 - 0.2));
    bigStat(65, " %", "ONT OBÉI JUSQU'AU BOUT", W / 2, 1210, 130, COL.accent, t, t65 - 0.4);
  },
  nuance(s, t) {
    spotlightBg(t, "#1E2230");
    const tv = wt("nuance", "variantes", 1), tt = wt("nuance", "téléphone", 4.4);
    headline("SELON LA SITUATION", 400, 46, "#fff", t, tv - 0.3);
    const pa = easeOutExpo(prog(t, tv - 0.2, tv + 0.6)), pb = easeOutExpo(prog(t, tt - 0.2, tt + 0.6));
    ctx.fillStyle = COL.accent; ctx.beginPath(); ctx.roundRect(200, 1040 - 460 * pa, 260, 460 * pa, 20); ctx.fill();
    ctx.fillStyle = COL.cyan; ctx.beginPath(); ctx.roundRect(620, 1040 - 150 * pb, 260, 150 * pb, 20); ctx.fill();
    character(330, 560, 0.45, "experimenter", { pose: "stand", face: {}, t, shadow: false });
    txt("CHERCHEUR", 330, 1100, 32, "MontX", COL.accent); txt("DANS LA PIÈCE", 330, 1140, 28, "MontX", "rgba(255,255,255,.7)");
    if (pb > 0) { oldPhone(750, 790, 0.9); txt("ORDRES PAR", 750, 1100, 32, "MontX", COL.cyan); txt("TÉLÉPHONE", 750, 1140, 28, "MontX", "rgba(255,255,255,.7)"); }
  },
  cta(s, t) {
    spotlightBg(t, "#2A1E22");
    ctaButtons(t, s, "J'AURAIS REFUSÉ", "J'AURAIS OBÉI", COL.green, COL.accent);
    sourceLine("Sources : Milgram (1963), Journal of Abnormal and Social Psychology · Milgram (1974)");
  },
};

startStory({
  music: { style: "lofi", bpm: 88, drop: 0 }, bed: 0.2, duck: 0.55,
  keyRegex: /^(450|TRUQUÉ|COMPLICE|FAUX|300|RIEN|EXIGE|MILLE|26|65)/,
  hits: [["hook", "volts", 0.06], ["roles", "truqué", 0.07], ["fake", "faux", 0.06], ["protest", "rien", 0.05], ["prod", "exige", 0.06], ["result", "26", 0.08], ["result", "65", 0.08], ["nuance", "téléphone", 0.05]],
  sfx() {
    const tk = wt("protest", "tape", 1.6) - 0.2; for (let n = 0; n < 3; n++) sfx(tk + n * 0.35, "hit", { gain: 0.6 });
    sfx(wt("hook", "volts", 1.6) - 0.2, "impact_small", { gain: 0.5 });
    sfx(SEG.cta.start + 0.1, "pop"); sfx(SEG.cta.start + 0.3, "pop");
  },
});
