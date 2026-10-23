// Bandura, immersive cut: one continuous set (the playroom where the adult models, the room with the nice toys, the
// test room with Bobo and its one-way mirror, the observers' room behind that mirror, and a living room at night).
// The camera glides through it on the voice; the protocol is chalked on the walls. Engine: lib/immersive.js.
const COL = { gold: "#FFC93C", accent: "#FF4D4D", cyan: "#4DD6FF", green: "#3DDC84", ink: "#151824", cream: "#F4EFE6" };
const BASE = 1050, GROUND = 1250, CEIL = 330;
const S = id => SEG[id].start;

// arm swing for hitting: k cycles 0..1 per strike
function strike(t, rate = 1.6, t0 = 0) {
  const k = ((t - t0) * rate) % 1;
  const down = k < 0.25 ? easeIn(k / 0.25) : 1 - easeOutCubic((k - 0.25) / 0.75);
  return { sh: [lerp(2.7, 0.9, down), 0.1], el: [lerp(0.4, 0.2, down), 0.2] };
}
function hitsBetween(t0, t1, rate, start = t0) { const out = []; for (let h = start + 0.25 / rate; h < t1; h += 1 / rate) out.push(h); return out; }

function room(x0, x1, wall, floor = "#5A4636") {
  ctx.fillStyle = "#1B1C1A"; ctx.fillRect(x0, -400, x1 - x0, CEIL + 400);
  ctx.fillStyle = wall; ctx.fillRect(x0, CEIL, x1 - x0, BASE - CEIL);
  ctx.fillStyle = "rgba(0,0,0,.12)"; for (let x = x0; x < x1; x += 120) ctx.fillRect(x, CEIL, 60, BASE - CEIL);
  ctx.fillStyle = floor; ctx.fillRect(x0, BASE, x1 - x0, 1400);
  ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 4;
  for (let x = x0 - 600; x < x1; x += 140) { ctx.beginPath(); ctx.moveTo(x + 300, BASE); ctx.lineTo(x, BASE + 1400); ctx.stroke(); }
}
function wallDoor(x) { roundRectFill(x, BASE - 520, 120, 520, 6, "#0E0F0E"); ctx.fillStyle = "#6A5038"; ctx.fillRect(x - 12, BASE - 532, 144, 14); }
function smallTable(x) { roundRectFill(x - 130, GROUND - 170, 260, 20, 6, "#B98A5E"); ctx.fillStyle = "#9A7048"; ctx.fillRect(x - 115, GROUND - 150, 14, 150); ctx.fillRect(x + 101, GROUND - 150, 14, 150); }
function tinker(x, y) { ctx.fillStyle = "#3DA5E0"; for (let k = 0; k < 5; k++) { ctx.fillRect(x + k * 22, y - 40 - (k % 2) * 30, 10, 60); ctx.beginPath(); ctx.arc(x + 5 + k * 22, y - 40 - (k % 2) * 30, 12, 0, 6.29); ctx.fill(); } }
function tv(x, y, t, on) {
  roundRectFill(x - 170, y - 130, 340, 250, 26, "#2A241E"); roundRectFill(x - 140, y - 105, 230, 190, 30, on ? "#9CC8E8" : "#1A1E22");
  if (on) {
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 140, y - 105, 230, 190, 30); ctx.clip();
    const st = strike(t, 1.5, 0), hits = hitsBetween(0, t + 0.01, 1.5, 0);
    bobo(x - 5, y + 80, 0.22, boboWobble(t, hits));
    character(x - 75, y + 80, 0.32, "man1950", { pose: "stand", override: { sh: st.sh, el: st.el }, face: { brows: "angry" }, props: { mallet: true }, t, shadow: false });
    ctx.fillStyle = "rgba(255,255,255,.08)"; for (let k = 0; k < 190; k += 6) ctx.fillRect(x - 140, y - 105 + k, 230, 2);
    ctx.restore();
  }
  ctx.fillStyle = "#4A3E32"; ctx.beginPath(); ctx.arc(x + 125, y - 50, 14, 0, 6.29); ctx.arc(x + 125, y, 14, 0, 6.29); ctx.fill();
}

function world(t) {
  insideAndToday(t);
  // ---- A: the playroom where the adult models
  room(-300, 1420, "#B79A73");
  light(700, 900, 1000, 1); hangingLamp(700, 380, 60, 1, t);
  const tm = S("model"), tcalm = wt("groups", "calme", 1.2), tnone = wt("groups", "personne", 3);
  const hitting = (t < S("setup") - 0.2) || (t > tm + 0.4 && t < tcalm - 0.3);
  const t0 = t < S("setup") ? 0.3 : tm + 0.4, st = strike(t, 1.5, t0);
  const hits = [...hitsBetween(0.3, S("setup") - 0.2, 1.5, 0.3), ...hitsBetween(tm + 0.4, tcalm - 0.3, 1.5, tm + 0.4)];
  bobo(1150, GROUND, 0.75, boboWobble(t, hits));
  const adultA = 1 - prog(t, tnone - 0.6, tnone);
  if (adultA > 0) {
    ctx.save(); ctx.globalAlpha = adultA;
    if (t > tcalm - 0.3 && t < S("tease")) { character(930, GROUND, 1.05, "man1950", { pose: "sit", face: { look: [-1, 0.3], mouth: "smile" }, t }); tinker(790, GROUND); }
    else character(940, GROUND, 1.1, "man1950", { pose: "stand", override: hitting ? { sh: st.sh, el: st.el, lean: 0.08 } : {}, face: hitting ? { brows: "angry", mouth: "o", look: [1, 0] } : { look: [-1, 0] }, props: { mallet: hitting }, t });
    ctx.restore();
  }
  smallTable(330);
  character(250, GROUND, 0.8, "boy", { pose: "sit", face: { look: [1, -0.2], eyes: hitting ? "wide" : "open", mouth: hitting ? "o" : "neutral" }, t });
  paper(360, GROUND - 182, 120, 16, { color: "#F4EEDF", shadow: false });
  // setup on the wall: 1961 · Stanford · 72 children
  const ts = S("setup");
  chalk("le but : les enfants copient-ils ?", 700, 430, prog(t, ts + 0.3, ts + 1.4) * (t < S("room") + 0.3 ? 1 : 0), { size: 60 });
  if (t > ts && t < S("room") + 0.5) {
    const t72 = wt("setup", "72", 5);
    for (let k = 0; k < 72; k++) {
      const x = 340 + (k % 12) * 62, y = 540 + Math.floor(k / 12) * 62, p = prog(t, t72 - 0.4 + k * 0.012, t72 - 0.2 + k * 0.012);
      sketchPath([[x, y + 22], [x, y], [x - 9, y + 14], [x, y], [x + 9, y + 14]], p, { width: 3 }); chalkCircle(x, y - 9, 7, 7, p, { width: 3 });
    }
    chalk("72 enfants · 3 à 6 ans", 700, 950, prog(t, t72, t72 + 0.8), { size: 48 });
  }
  // room: who sits where
  const tr = S("room");
  if (t > tr && t < S("model")) {
    chalk("l'enfant dessine", 330, 760, prog(t, tr + 0.2, tr + 1.0), { size: 48 });
    const ta = wt("room", "adulte", 3), tb = wt("room", "Bobo", 4.5);
    chalk("un adulte", 940, 700, prog(t, ta, ta + 0.5), { size: 48 });
    sketchPath([[1300, GROUND], [1300, GROUND - 560]], prog(t, tb + 0.6, tb + 1.2), { width: 4 });
    chalk("plus grand que l'enfant", 1230, 620, prog(t, tb + 0.8, tb + 1.6), { size: 38, rot: -0.04 });
  }
  if (t > tm && t < S("tease")) {
    chalk("10 minutes", 700, 460, prog(t, tm + 0.3, tm + 0.9), { size: 53 });
    const tp = wt("model", "poings", 3), tma = wt("model", "marteau", 4), ti = wt("model", "gros", 5.5);
    chalk("POW !", 1250, 640, prog(t, tp, tp + 0.2), { size: 84, color: "#FFB3A8", rot: 0.1 });
    chalk("coups de marteau", 1200, 760, prog(t, tma, tma + 0.5), { size: 43 });
    chalk("« Dans le nez ! »", 780, 600, prog(t, ti, ti + 0.6), { size: 53, color: "#FFB3A8" });
    chalk("certains : adulte méchant", 700, 530, prog(t, tm + 0.6, tm + 1.4), { size: 43 });
    chalk("d'autres : adulte calme", 700, 580, prog(t, tcalm, tcalm + 0.6), { size: 43, color: "#B9F5C8" });
    chalk("d'autres : personne", 700, 630, prog(t, tnone, tnone + 0.6), { size: 43, color: "#9FE7FF" });
  }
  wallDoor(1440);
  // ---- B: the nice toys, taken away
  room(1440, 2520, "#A3876A");
  light(2000, 900, 800, 1); hangingLamp(2000, 380, 60, 1, t);
  const tt = S("tease"), tret = wt("tease", "retire", 3);
  const gone = easeInOut(prog(t, tret - 0.2, tret + 0.8));
  roundRectFill(1600, 700, 520, 20, 4, "#7A5A3C"); roundRectFill(1600, 880, 520, 20, 4, "#7A5A3C");
  ctx.save(); ctx.translate(-gone * 700, 0);
  toys(1760, 700, 1.0); toys(1960, 880, 1.0);
  ctx.fillStyle = "#E2533F"; ctx.fillRect(1700, 820, 140, 60); ctx.fillStyle = "#1C1C24"; ctx.beginPath(); ctx.arc(1725, 885, 16, 0, 6.29); ctx.arc(1815, 885, 16, 0, 6.29); ctx.fill();
  ctx.restore();
  character(1880, GROUND, 0.8, "boy", { pose: "stand", override: t > tt + 0.4 && t < tret ? { sh: [2.2, 0.4], el: [0.3, 0.3] } : {}, face: { look: [1, -0.4], mouth: t > tret ? "frown" : "smile", brows: t > tret ? "angry" : "up" }, t });
  character(2300, GROUND, 1.05, "researcher", { pose: t > tret - 0.3 && t < tret + 1.2 ? "point" : "stand", flip: true, face: { look: [-1, 0] }, t });
  chalk("fâché !", 2000, 560, prog(t, tret + 0.4, tret + 1.0), { size: 62, color: "#FFB3A8" });
  wallDoor(2540);
  // ---- C: the test room, Bobo and the mirror
  room(2540, 3760, "#B39673");
  light(3150, 900, 900, 1); hangingLamp(3150, 380, 60, 1, t);
  const tte = S("test"), tob = wt("test", "regarde", 5), trs = S("result");
  const reveal = prog(t, wt("test", "miroir", 3.5) + 0.6, tob);
  oneWayMirror(3300, 560, 340, 300, t, reveal * (t < trs ? 1 : 0));
  const copy = t > trs - 0.2 && t < S("lesson");
  const cs = strike(t, 1.7, trs);
  const chits = copy ? hitsBetween(trs, Math.min(t, S("lesson")), 1.7, trs) : [];
  bobo(3250, GROUND, 0.75, boboWobble(t, chits));
  if (t > tte - 0.5 || t < S("tease")) {
    character(3010, GROUND, 0.8, "boy", { pose: "stand", override: copy ? { sh: cs.sh, el: cs.el, lean: 0.08 } : {}, face: copy ? { brows: "angry", mouth: "o", look: [1, 0] } : { look: [1, -0.2] }, props: { mallet: copy }, t });
  }
  if (!copy) { ctx.save(); ctx.translate(3080, GROUND - 6); ctx.rotate(-0.2); ctx.fillStyle = "#8A6A44"; ctx.fillRect(0, -6, 110, 12); ctx.fillStyle = "#C0392B"; ctx.fillRect(100, -24, 46, 48); ctx.restore(); }
  toys(2760, GROUND, 0.8);
  chalk("seul · 20 minutes", 3000, 470, prog(t, tte + 0.3, tte + 1.2) * (t < trs ? 1 : 0), { size: 50 });
  const tmo = wt("result", "mots", 5);
  if (copy) {
    chalk("les mêmes gestes", 2900, 650, prog(t, wt("result", "gestes", 2.5) - 0.2, wt("result", "gestes", 2.5) + 0.5), { size: 48 });
    chalk("« Pow ! »", 3330, 520, prog(t, tmo - 0.2, tmo + 0.2), { size: 77, color: "#FFB3A8" });
  }
  // nuance: Bobo is made to be hit
  if (t > S("nuance") - 0.2) {
    const tn = S("nuance"), tmom = wt("nuance", "moment", 4);
    chalkArrow(3500, 560, 3320, 760, prog(t, tn + 0.5, tn + 1.1), { bend: 0.2 });
    chalk("fait pour être tapé", 3480, 500, prog(t, tn + 0.6, tn + 1.5), { size: 50 });
    chalk("mesuré sur le moment… et après ?", 3150, 1360, prog(t, tmom - 0.3, tmom + 0.6), { size: 48, color: "#9FE7FF" });
  }
  // ---- D: behind the mirror, the observers and their notes
  ctx.fillStyle = "#121315"; ctx.fillRect(3760, -400, 90, 2400);
  room(3850, 5200, "#2E3236", "#1E2023");
  light(4330, 760, 700, 0.9, "180,210,255"); light(4950, 700, 600, 0.8);
  roundRectFill(4000, 520, 660, 440, 8, "#3A3F44");
  ctx.save(); ctx.beginPath(); ctx.rect(4020, 540, 620, 400); ctx.clip();
  ctx.fillStyle = "#8F7A60"; ctx.fillRect(4020, 540, 620, 400);
  const ws = strike(t, 1.7, trs), whits = copy ? hitsBetween(trs, Math.min(t, S("lesson")), 1.7, trs) : [];
  bobo(4420, 930, 0.45, boboWobble(t, whits));
  character(4280, 930, 0.48, "boy", { pose: "stand", override: copy ? { sh: ws.sh, el: ws.el, lean: 0.08 } : {}, face: { brows: copy ? "angry" : "neutral", look: [1, 0] }, props: { mallet: copy }, t, shadow: false });
  ctx.fillStyle = "rgba(20,30,45,.35)"; ctx.fillRect(4020, 540, 620, 400);
  ctx.restore();
  character(3960, GROUND, 1.05, "researcher", { pose: "stand", face: { look: [1, -0.2] }, props: { clipboard: true }, t });
  character(4720, GROUND, 1.0, "woman", { pose: "stand", flip: true, face: { look: [-1, -0.2] }, props: { clipboard: true }, t });
  chalk("miroir magique : on voit l'enfant, il ne nous voit pas", 4330, 470, prog(t, tob, tob + 1.0) * (t < S("boys") ? 1 : 0), { size: 41 });
  // the board: who copied, and what it means
  roundRectFill(4780, 420, 380, 520, 8, "#4A3A2A"); roundRectFill(4796, 436, 348, 488, 6, "#1F2A24");
  if (t > S("result") + 1) {
    const pr = prog(t, S("result") + 1.2, S("result") + 2.4);
    chalk("coups imités", 4970, 480, pr * (t < S("boys") ? 1 : 0), { size: 41 });
    [[0.85, "agressif", "#FFB3A8"], [0.08, "calme", "#B9F5C8"], [0.06, "aucun", "#9FE7FF"]].forEach(([v, l, c], k) => {
      const x = 4830 + k * 105, p = easeOutCubic(prog(t, S("result") + 1.4 + k * 0.3, S("result") + 2.2 + k * 0.3)) * (t < S("boys") ? 1 : 0);
      sketchPath([[x, 900], [x, 900 - 330 * v * p], [x + 70, 900 - 330 * v * p], [x + 70, 900]], p, { width: 5, color: c });
      chalk(l, x + 35, 920, p, { size: 29, color: c });
    });
  }
  if (t > S("boys") - 0.1 && t < S("lesson")) {
    const pb = easeOutCubic(prog(t, S("boys") + 0.2, S("boys") + 1.0));
    chalk("coups physiques imités", 4970, 480, pb, { size: 36 });
    sketchPath([[4860, 900], [4860, 900 - 330 * 0.85 * pb], [4950, 900 - 330 * 0.85 * pb], [4950, 900]], pb, { width: 5, color: "#9FE7FF" });
    chalk("garçons", 4905, 920, pb, { size: 31, color: "#9FE7FF" });
    sketchPath([[5000, 900], [5000, 900 - 330 * 0.42 * pb], [5090, 900 - 330 * 0.42 * pb], [5090, 900]], pb, { width: 5, color: "#FFB3A8" });
    chalk("filles", 5045, 920, pb, { size: 31, color: "#FFB3A8" });
  }
  if (false) {
    const tl = S("lesson"), tre = wt("lesson", "bonbon", 3), tpu = wt("lesson", "punition", 4.5);
    chalk("voir", 4880, 520, prog(t, tl + 0.3, tl + 0.8), { size: 53 });
    chalkArrow(4930, 540, 5040, 620, prog(t, tl + 0.6, tl + 1.1), { bend: -0.2 });
    chalk("refaire", 5060, 660, prog(t, tl + 0.9, tl + 1.4), { size: 53 });
    chalk("récompense", 4960, 770, prog(t, tre - 0.2, tre + 0.3), { size: 43 });
    sketchPath([[4860, 770], [5060, 770]], prog(t, tre + 0.2, tre + 0.5), { width: 5, color: "#FFB3A8" });
    chalk("punition", 4960, 850, prog(t, tpu - 0.2, tpu + 0.3), { size: 43 });
    sketchPath([[4890, 850], [5030, 850]], prog(t, tpu + 0.2, tpu + 0.5), { width: 5, color: "#FFB3A8" });
  }
  // ---- E: a living room at night, a child in front of a screen
  ctx.fillStyle = "#121315"; ctx.fillRect(5200, -400, 90, 2400);
  room(5290, 6400, "#2A2C33", "#1E1D22");
  const on = t > S("cta") - 1.2;
  if (on) light(5900, 920, 800, 1, "150,190,255");
  tv(5900, 960, t, on);
  roundRectFill(5720, 1090, 360, 160, 10, "#3A2E24");
  character(5620, GROUND + 40, 0.8, "boy", { pose: "sit", face: { look: [1, -0.1], eyes: "wide" }, t });
}


// ---------------------------------------------------------------- inside the child, and today
function insideAndToday(t) {
  mindWall(6450, 7950, -600, 2400);
  const tl = S("lesson"), tso = wt("lesson", "cerveau", 3.9), tob = wt("lesson", "observe", 5), tre = wt("lesson", "retient", 5.6), trp = wt("lesson", "refait", 6.4);
  const tres = wt("lesson", "ressemble", 8.7), tfo = wt("lesson", "fort", 10), trec = wt("lesson", "bonbon", 10.9), tpu = wt("lesson", "punition", 11.8), trg = wt("lesson", "regarder", 12.5);
  light(7200, 880, 1000, 0.8, "200,215,255");
  chalkHead(7150, 900, 1.2, prog(t, tl, tl + 1.4));
  chalk("on apprend en regardant", 7200, 250, prog(t, tso - 1.2, tso), { size: 64, color: "#FFE08A" });
  // observe -> remember -> do
  const steps = [["regarder", 6930, tob], ["retenir", 7180, tre], ["refaire", 7430, trp]];
  steps.forEach(([l, x, tt], k) => {
    const p = prog(t, tt - 0.3, tt + 0.2);
    if (k === 0) { ctx.save(); ctx.globalAlpha = p; eyeIcon(x, 640, 0.45, 1, CHALK); ctx.restore(); }
    if (k === 1) chalkCircle(x, 640, 50, 40, p);
    if (k === 2) sketchPath([[x - 30, 670], [x - 30, 610], [x, 590], [x + 30, 610], [x + 30, 670]], p, { width: 6 });
    chalk(l, x, 730, p, { size: 38 });
    if (k < 2) chalkArrow(x + 60, 640, x + 190, 640, prog(t, steps[k + 1][2] - 0.4, steps[k + 1][2]), { bend: 0, width: 5 });
  });
  // which models: one like me, one strong
  chalkFigure(6980, 1060, 0.7, prog(t, tres - 0.6, tres));
  chalk("il me ressemble", 6980, 1150, prog(t, tres - 0.3, tres + 0.4), { size: 36 });
  chalkFigure(7330, 1080, 1.1, prog(t, tfo - 0.6, tfo), "#FFE08A");
  chalk("il semble fort", 7330, 1170, prog(t, tfo - 0.3, tfo + 0.4), { size: 36, color: "#FFE08A" });
  chalk("bonbon", 6980, 1260, prog(t, trec - 0.3, trec + 0.2), { size: 38 });
  sketchPath([[6860, 1262], [7100, 1262]], prog(t, trec + 0.2, trec + 0.5), { width: 6, color: "#FFB3A8" });
  chalk("punition", 7330, 1260, prog(t, tpu - 0.3, tpu + 0.2), { size: 38 });
  sketchPath([[7240, 1262], [7420, 1262]], prog(t, tpu + 0.2, tpu + 0.5), { width: 6, color: "#FFB3A8" });
  chalk("regarder suffit à apprendre", 7200, 1370, prog(t, trg - 0.2, trg + 0.8), { size: 50, color: "#B9F5C8" });
  // today: screens, the playground, and the good example
  room(7950, 9900, "#3B4048", "#2E3036");
  const tn = S("now"), tec = wt("now", "écrans", 2.5), tin = wt("now", "influenceurs", 3.3), tdv = wt("now", "défis", 4.3), tcr = wt("now", "récré", 6.7), tai = wt("now", "aider", 11.5), tdav = wt("now", "souvent", 12.8);
  light(8400, 900, 700, 1, "200,220,255"); light(9000, 900, 700, 0.9); light(9500, 900, 700, 0.9);
  chalk("aujourd'hui", 8900, 330, prog(t, tn + 0.2, tn + 0.9), { size: 70, color: "#9FE7FF" });
  smartphone(8420, 900, 0.7, () => {
    ctx.fillStyle = "#1C1E26"; ctx.fillRect(0, 0, 344, 724);
    const k = Math.sin(t * 6), up = t > tdv ? 1 : 0;
    character(172, 600, 0.9, "student", { pose: "stand", override: up ? { sh: [2.25 + 0.2 * k, 1.95 - 0.2 * k], el: [0.6, 0.5] } : { sh: [0.6 + 0.3 * k, 0.4], el: [1.2, 1.0] }, face: { mouth: "smile", look: [1, 0] }, t, shadow: false, id: "screen-influencer" });
    if (t > tin) { txt("@influenceur", 172, 70, 26, "MontX", "#fff"); heart(300, 520, 1.2); heart(290, 450, 0.9); }
    if (t > tdv) txt("#défi", 172, 680, 34, "MontX", "#FFC93C");
  });
  character(8200, GROUND, 0.75, "boy", { pose: "sit", face: { look: [1, -0.3], eyes: "wide" }, t, id: "tablet-kid" });
  chalk("les modèles sont sur les écrans", 8420, 470, prog(t, tec - 0.3, tec + 0.6), { size: 40 });
  // the playground copies the move
  const copy = t > tcr - 1.0, k2 = Math.sin(t * 6 + 1);
  for (const [x, look] of [[8880, "boy"], [9060, "girl"]]) character(x, GROUND, 0.75, look, { pose: "stand", override: copy ? { sh: [2.25 + 0.2 * k2, 1.95 - 0.2 * k2], el: [0.6, 0.5] } : {}, face: { mouth: "smile", look: [1, 0] }, t, id: "copy-" + look });
  chalk("copié dans la cour", 8970, 760, prog(t, tcr - 0.6, tcr + 0.3), { size: 42 });
  // the good example
  const help = t > tai - 1.2, khelp = t > tdav - 0.6;
  character(9420, GROUND, 1.0, "man1950", { pose: help ? "kneel" : "stand", face: { look: [1, 0.3], mouth: "smile" }, t, id: "helper-adult" });
  character(9700, GROUND, 0.75, "boy", { pose: khelp ? "kneel" : "stand", flip: !khelp, face: { look: [khelp ? 1 : -1, 0.3], mouth: "smile" }, t, id: "helper-kid" });
  for (let i = 0; i < 4; i++) { const gone = (help ? prog(t, tai - 0.8 + i * 0.2, tai - 0.4 + i * 0.2) : 0); if (gone < 1) roundRectFill(9480 + i * 40 + (i % 2) * 20, GROUND - 20, 34, 14, 3, "#F2EEE4"); }
  chalk("il voit aider…", 9460, 700, prog(t, tai - 0.6, tai + 0.2), { size: 44, color: "#B9F5C8" });
  chalk("…il aide plus souvent", 9560, 790, prog(t, tdav - 0.3, tdav + 0.4), { size: 44, color: "#B9F5C8" });
}

startImmersive({
  world, keyRegex: /^(FRAPPE|72|BOBO|ACHARNE|MAILLET|CALME|PERSONNE|RETIRE|SEUL|MIROIR|COPIENT|MOTS|COUPS|REGARDANT|MOMENT)/,
  ambient: 0.62,
  camera: () => [
    { t: 0, x: 1050, y: 980, z: 1.6, d: 0.01 },
    { t: 1.8, x: 760, y: 1020, z: 1.1, d: 2.6 },
    { t: S("setup") - 0.1, x: 700, y: 720, z: 1.2, d: 1.8 },
    { t: S("room") - 0.1, x: 380, y: 1060, z: 1.7, d: 1.4 },
    { t: wt("room", "adulte", 3) - 0.4, x: 920, y: 1010, z: 1.4, d: 1.2 },
    { t: wt("room", "Bobo", 4.5) - 0.3, x: 1150, y: 980, z: 1.45, d: 1.2 },
    { t: S("model") - 0.1, x: 980, y: 930, z: 1.25, d: 1.4 },
    { t: S("groups") - 0.1, x: 800, y: 900, z: 1.1, d: 1.2 },
    { t: S("tease") - 0.3, x: 1980, y: 980, z: 1.3, d: 2.0 },
    { t: S("test") - 0.3, x: 3120, y: 980, z: 1.25, d: 2.0 },
    { t: wt("test", "miroir", 3.5) - 0.3, x: 3470, y: 720, z: 1.9, d: 1.6 },
    { t: S("result") - 0.6, x: 4330, y: 860, z: 1.25, d: 1.6 },
    { t: S("result") + 1.0, x: 4600, y: 820, z: 1.05, d: 1.6 },
    { t: S("boys") - 0.1, x: 4970, y: 690, z: 1.6, d: 1.0 },
    { t: S("lesson") - 0.2, x: 7180, y: 860, z: 0.98, d: 1.8 },
    { t: wt("lesson", "observe", 5) - 0.6, x: 7180, y: 700, z: 1.3, d: 1.0 },
    { t: wt("lesson", "ressemble", 8.7) - 0.8, x: 7160, y: 1100, z: 1.2, d: 1.2 },
    { t: S("nuance") - 0.05, x: 3250, y: 960, z: 1.3, d: 0.01 },
    { t: S("now") - 0.05, x: 8440, y: 860, z: 1.15, d: 0.01 },
    { t: wt("now", "récré", 6.7) - 1.6, x: 8970, y: 900, z: 1.15, d: 1.4 },
    { t: wt("now", "aider", 11.5) - 1.6, x: 9540, y: 900, z: 1.15, d: 1.4 },
    { t: S("cta") - 0.05, x: 5800, y: 1040, z: 1.45, d: 0.01 },
    { t: S("cta") + 0.1, x: 5800, y: 1040, z: 1.6, d: 4.0 },
  ],
  dips: () => [[S("result") - 0.3, 0.5], [S("nuance"), 0.6], [S("now"), 0.6], [S("cta"), 0.6]],
  music: () => ({ style: "dark", root: 40, room: true, musicbox: true, heart: [[S("test"), S("result") + 0.6, 64, 96]] }),
  sfx() {
    for (const h of hitsBetween(0.3, S("setup") - 0.2, 1.5, 0.3)) sfx(h, "hit", { gain: 0.35 });
    for (const h of hitsBetween(S("model") + 0.4, wt("groups", "calme", 1.2) - 0.3, 1.5, S("model") + 0.4)) sfx(h, "hit", { gain: 0.3 });
    sfx(S("room") + 0.2, "scribble", { dur: 1.2 });
    for (let k = 0; k < 4; k++) sfx(S("tease") - 0.2 + k * 0.4, "step", { gain: 0.4 });
    sfx(wt("tease", "retire", 3) - 0.1, "dark_whoosh", { gain: 0.5, dur: 0.6 });
    for (let k = 0; k < 4; k++) sfx(S("test") - 0.2 + k * 0.4, "step", { gain: 0.4 });
    for (const h of hitsBetween(S("result"), S("lesson"), 1.7, S("result"))) sfx(h, "hit", { gain: 0.3 });
    sfx(S("result") + 1.2, "scribble", { dur: 1.4 });
    sfx(S("lesson") + 0.2, "scribble", { dur: 1.4 });
    for (const w of ["observe", "retient", "reproduit"]) sfx(wt("lesson", w, 5) - 0.2, "pop", { gain: 0.35 });
    sfx(wt("now", "écrans", 2.5) - 0.3, "ding", { gain: 0.3 });
    sfx(wt("now", "aider", 11.5) - 0.8, "paper", { gain: 0.5 });
  },
});
