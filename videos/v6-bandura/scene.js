// Bandura : la poupée Bobo (Bandura, Ross & Ross, 1961). Plans calés sur la voix off (timings.json).
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6", violet: "#B48CFF" };
const CHAPTERS = { hook: "EXPÉRIENCE RÉELLE", setup: "L'EXPÉRIENCE", groups: "3 GROUPES", tease: "L'EXPÉRIENCE", room: "LE TEST", result: "LE RÉSULTAT", boys: "LE RÉSULTAT", lesson: "LA LEÇON", nuance: "LA NUANCE", cta: "ET TOI ?" };
const FLOOR = 1180;

function playroom(t, { tint = null } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, "#F3E3C6"); g.addColorStop(1, "#E7CFA6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = "rgba(180,120,80,.12)"; for (let x = 0; x < W; x += 120) ctx.fillRect(x, 0, 60, FLOOR);
  ctx.fillStyle = "#C79A6B"; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillStyle = "#B4875A"; ctx.fillRect(0, FLOOR, W, 14);
  ctx.fillStyle = "rgba(0,0,0,.06)"; for (let x = -200; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, FLOOR + 14); ctx.lineTo(x - 120, H); ctx.lineTo(x - 100, H); ctx.lineTo(x + 20, FLOOR + 14); ctx.fill(); }
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
}
// arm swing for hitting: k cycles 0..1 per strike, returns {sh, el}
function strike(t, rate = 1.6, t0 = 0) {
  const k = ((t - t0) * rate) % 1;
  const down = k < 0.25 ? easeIn(k / 0.25) : 1 - easeOutCubic((k - 0.25) / 0.75);
  return { sh: [lerp(2.7, 0.9, down), 0.1], el: [lerp(0.4, 0.2, down), 0.2], hitAt: Math.floor((t - t0) * rate) / rate + t0 + 0.25 / rate };
}
function hitsBetween(t0, t1, rate, start = t0) { const out = []; for (let h = start + 0.25 / rate; h < t1; h += 1 / rate) out.push(h); return out; }

const SHOT = {
  hook(s, t) {
    const lt = t - s.start;
    playroom(t);
    const st = strike(t, 1.5, s.start);
    const hits = hitsBetween(s.start, s.next, 1.5, s.start);
    bobo(690, FLOOR, 0.85, boboWobble(t, hits));
    character(470, FLOOR, 1.15, "man1950", { pose: "stand", override: { sh: st.sh, el: st.el, lean: 0.08 }, face: { brows: "angry", mouth: "o", look: [1, 0] }, props: { mallet: true }, t });
    // children watching from the corner
    const tw = wt("hook", "regardent", 1.6);
    if (t > tw - 0.3) {
      const p = fade(t, tw - 0.3);
      ctx.save(); ctx.globalAlpha = p;
      character(120, FLOOR + 60, 0.75, "boy", { pose: "stand", face: { eyes: "wide", mouth: "o", look: [1, -0.2] }, t });
      character(230, FLOOR + 80, 0.72, "girl", { pose: "stand", face: { eyes: "wide", mouth: "o", look: [1, -0.2] }, t });
      ctx.restore();
    }
    const td = wt("hook", "devine", 4.5);
    if (t > td - 0.2) txt("?", 880, 420, 260 * pop(t, td - 0.2), "MontX", COL.accent, { glow: "rgba(255,77,77,.5)", blur: 40 });
    for (const h of hits) if (t > h && t < h + 0.35) txt("POW !", 760, 560 - (t - h) * 200, 80, "MontX", COL.accent, { alpha: 1 - (t - h) / 0.35 });
  },
  setup(s, t) {
    spotlightBg(t, "#2A2140");
    headline("DÉBUT DES ANNÉES 60", 380, 64, "#fff", t, s.start + 0.05, { spacing: 3 });
    headline("STANFORD", 470, 50, COL.gold, t, s.start + 0.3, { spacing: 8 });
    const t72 = wt("setup", "72", 3.2);
    for (let i = 0; i < 72; i++) {
      const p = pop(t, t72 - 0.25 + i * 0.012, 0.3); if (p <= 0) continue;
      const cx = 105 + (i % 12) * 79, cy = 640 + Math.floor(i / 12) * 92;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); iconPerson(0, 0, 44, i % 2 ? COL.violet : COL.cyan, { head: "#F2C9A0" }); ctx.restore();
    }
    label("72 ENFANTS · 3 À 6 ANS", W / 2, 1230, 40, COL.ink, COL.gold, pop(t, t72 + 0.5));
  },
  groups(s, t) {
    spotlightBg(t, "#1F1B33");
    const cues = [wt("groups", "tiers", 0.2), wt("groups", "calme", 3.2) - 1.0, wt("groups", "dernier", 5.4)];
    const rows = [{ c: COL.accent, l: "MODÈLE AGRESSIF" }, { c: COL.cyan, l: "MODÈLE CALME" }, { c: "#9AA3B5", l: "AUCUN MODÈLE" }];
    rows.forEach((r, i) => {
      const p = pop(t, cues[i] - 0.15); if (p <= 0) return;
      const y = 330 + i * 305;
      ctx.save(); ctx.translate(540, y + 140); ctx.scale(p, p); ctx.translate(-540, -(y + 140));
      ctx.save(); ctx.beginPath(); ctx.roundRect(70, y, 940, 280, 30); ctx.clip();
      ctx.translate(0, y - 150); ctx.scale(1, 1);
      // mini room
      ctx.fillStyle = "#EAD6B3"; ctx.fillRect(70, 150, 940, 280); ctx.fillStyle = "#C79A6B"; ctx.fillRect(70, 380, 940, 50);
      ctx.save(); ctx.translate(0, 0);
      if (i === 0) { const st = strike(t, 1.8, cues[0]); bobo(760, 400, 0.4, boboWobble(t, hitsBetween(cues[0], t + 1, 1.8, cues[0]))); character(640, 400, 0.5, "man1950", { pose: "stand", override: { sh: st.sh, el: st.el }, face: { brows: "angry", mouth: "o" }, props: { mallet: true }, t, shadow: false }); }
      if (i === 1) { bobo(820, 400, 0.4, 0); toys(560, 400, 0.6); character(680, 400, 0.5, "woman", { pose: "kneel", face: { mouth: "smile" }, t, shadow: false }); }
      if (i === 2) { bobo(760, 400, 0.4, 0); }
      character(200, 420, 0.45, i === 1 ? "girl" : "boy", { pose: "stand", face: { eyes: i === 0 ? "wide" : "open", look: [1, 0] }, t, shadow: false });
      ctx.restore();
      ctx.restore();
      ctx.strokeStyle = r.c; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(70, y, 940, 280, 30); ctx.stroke();
      label(r.l, 330, y + 50, 30, i === 2 ? COL.ink : "#fff", r.c, 1);
      txt("1/3", 940, y + 52, 40, "MontX", r.c);
      ctx.restore();
    });
  },
  tease(s, t) {
    playroom(t);
    const tr = wt("tease", "réservés", 2);
    toys(640, FLOOR - 40, 1.6);
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(420, 600, 560, 580); ctx.strokeStyle = "#9AA3B5"; ctx.lineWidth = 10; ctx.strokeRect(420, 600, 560, 580);
    character(220, FLOOR + 40, 1.1, "girl", { pose: t > tr ? "stand" : "point", face: { brows: t > tr + 0.2 ? "angry" : "up", mouth: t > tr + 0.2 ? "frown" : "smile", look: [1, 0] }, t });
    stamp("RÉSERVÉ", 700, 700, 70, COL.accent, prog(t, tr - 0.2, tr + 0.2), -0.12);
    label("UN PEU DE FRUSTRATION", W / 2, 420, 38, "#fff", COL.violet, pop(t, wt("tease", "agacer", 3.4) - 0.3));
  },
  room(s, t) {
    playroom(t);
    const to = wt("room", "miroir", 3);
    oneWayMirror(120, 380, 420, 300, t, easeInOut(prog(t, to - 0.2, to + 0.6)));
    bobo(780, FLOOR, 0.7, Math.sin(t * 2) * 0.05);
    character(520, FLOOR + 30, 0.9, "boy", { pose: "walk", phase: gaitPhase(Math.min(t - s.start, 1.2) * 180, "walk", 0.9), face: { look: [1, -0.3] }, t });
    label("20 MINUTES", 800, 420, 40, COL.ink, COL.gold, pop(t, wt("room", "vingt", 1.6) - 0.2));
    label("MIROIR SANS TAIN", 330, 740, 30, "#fff", COL.ink, pop(t, to));
  },
  result(s, t) {
    playroom(t, { tint: "rgba(255,60,60,.06)" });
    const tm = wt("result", "mêmes", 2.4), tw = wt("result", "mots", 4);
    const st = strike(t, 1.7, s.start + 0.3);
    const hits = hitsBetween(s.start + 0.3, s.next, 1.7, s.start + 0.3);
    bobo(700, FLOOR, 0.75, boboWobble(t, hits));
    character(470, FLOOR + 20, 0.95, "boy", { pose: "stand", override: { sh: st.sh, el: st.el, lean: 0.1 }, face: { brows: "angry", mouth: "o", look: [1, 0] }, props: { mallet: true }, t });
    // ghost of the adult behind: same gesture
    ctx.save(); ctx.globalAlpha = 0.25 * fade(t, s.start, 0.6);
    character(330, FLOOR - 30, 1.15, "man1950", { pose: "stand", override: { sh: st.sh, el: st.el, lean: 0.1 }, face: { brows: "angry" }, props: { mallet: true }, t, shadow: false });
    ctx.restore();
    label("IMITATION", W / 2, 400, 52, "#fff", COL.accent, pop(t, s.start + 0.2));
    if (t > tw - 0.3) iconBubble(820, 640, 300, 120, "« POW ! »", { p: prog(t, tw - 0.3, tw), size: 56, bg: COL.gold });
    if (t > tm - 0.2) label("MÊMES GESTES", 300, 560, 30, COL.ink, COL.cream, pop(t, tm - 0.2));
  },
  boys(s, t) {
    spotlightBg(t, "#2A2140");
    const p = prog(t, s.start + 0.1, s.next - 0.2);
    character(330, 1150, 1.0, "boy", { pose: "stand", override: (() => { const st = strike(t, 2, s.start); return { sh: st.sh, el: st.el }; })(), face: { brows: "angry", mouth: "o" }, t });
    character(760, 1150, 1.0, "girl", { pose: "stand", flip: true, face: { mouth: "neutral", look: [-1, 0] }, t });
    ctx.fillStyle = COL.cyan; ctx.beginPath(); ctx.roundRect(230, 470 + 260 * (1 - easeOutExpo(p)), 200, 260 * easeOutExpo(p), 18); ctx.fill();
    ctx.fillStyle = COL.violet; ctx.beginPath(); ctx.roundRect(660, 470 + 260 * (1 - 0.45 * easeOutExpo(p)), 200, 260 * 0.45 * easeOutExpo(p), 18); ctx.fill();
    txt("COUPS IMITÉS", W / 2, 400, 40, "MontX", "#fff", { spacing: 2 });
    txt("GARÇONS", 330, 780, 32, "MontX", COL.cyan); txt("FILLES", 760, 780, 32, "MontX", COL.violet);
  },
  lesson(s, t) {
    spotlightBg(t, "#1C2238");
    const tr = wt("lesson", "récompense", 3.6), tp = wt("lesson", "punition", 4.4), tg = wt("lesson", "regardant", 2.8);
    eyeIcon(300, 640, 1.3, 1);
    drawPath([[460, 640], [640, 640]], prog(t, tg - 0.4, tg), { color: COL.gold, width: 14, dash: [26, 16], offset: -t * 60 });
    character(800, 900, 0.85, "boy", { pose: "point", face: { mouth: "smile" }, t });
    label("ON APPREND EN REGARDANT", W / 2, 420, 40, COL.ink, COL.gold, pop(t, tg - 0.3));
    if (t > tr - 0.3) { label("RÉCOMPENSE", 330, 1050, 34, "#fff", "#3A3F55", pop(t, tr - 0.3)); iconCross(520, 1050, 80, prog(t, tr - 0.1, tr + 0.5)); }
    if (t > tp - 0.3) { label("PUNITION", 760, 1150, 34, "#fff", "#3A3F55", pop(t, tp - 0.3)); iconCross(920, 1150, 80, prog(t, tp - 0.1, tp + 0.5)); }
  },
  nuance(s, t) {
    playroom(t, { tint: "rgba(20,24,40,.55)" });
    const tf = wt("nuance", "frappé", 2.2), tc = wt("nuance", "court", 4.4);
    bobo(540, FLOOR, 0.95, Math.sin(t * 3) * 0.08);
    stamp("FAIT POUR ÊTRE FRAPPÉ", W / 2, 460, 50, COL.gold, prog(t, tf - 0.3, tf + 0.1), -0.05);
    if (t > tc - 0.4) { label("EFFET À COURT TERME", W / 2, 640, 40, "#fff", COL.accent, pop(t, tc - 0.4)); iconClock(880, 820, 120, t * 300, { ring: COL.accent }); }
  },
  cta(s, t) {
    spotlightBg(t, "#2A2140");
    ctaButtons(t, s, "TROP DE VIOLENCE", "ÇA VA", COL.accent, COL.green);
    sourceLine("Source : Bandura, Ross & Ross (1961), Journal of Abnormal and Social Psychology");
  },
};

startStory({
  music: { style: "lofi", bpm: 92, drop: 0 }, bed: 0.22, duck: 0.55,
  keyRegex: /^(72|BOBO|VIOLENT|COUPS|MOTS|REGARDANT|FRAPPÉ|COURT)/,
  hits: [["hook", "devine", 0.06], ["setup", "72", 0.06], ["groups", "frapper", 0.05], ["tease", "réservés", 0.07], ["result", "reproduisent", 0.08], ["boys", "coups", 0.06], ["lesson", "regardant", 0.05], ["nuance", "frappé", 0.05]],
  sfx() {
    for (const h of hitsBetween(SEG.hook.start, SEG.hook.next, 1.5, SEG.hook.start)) sfx(h, "hit", { gain: 0.35 });
    for (const h of hitsBetween(SEG.result.start + 0.3, SEG.result.next, 1.7, SEG.result.start + 0.3)) sfx(h, "hit", { gain: 0.3 });
    sfx(wt("room", "miroir", 3) - 0.2, "swish");
    sfx(SEG.cta.start + 0.1, "pop"); sfx(SEG.cta.start + 0.3, "pop");
  },
});
