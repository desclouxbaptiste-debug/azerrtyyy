// La Troisième Vague (The Third Wave, Palo Alto, April 1967): a history teacher's classroom experiment told day by
// day, Monday to Friday. Clean dark motion design (lib/epure.js): deep black, off-white, one blood-red accent, one
// bold sans-serif, everything vector. Students are small pictograms; order is shown by their alignment. No Nazi
// symbol anywhere: the film of the last day is shown as rows of the same pictograms. Nobody speaks: the narrator
// tells what the teacher did (his own account, 1976). The heart beats faster from Monday to Friday and all sound
// stops at the two silences. Brief: nothing important in the bottom 250 px or the right 150 px, no text under 48 px.
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- shapes
/** A student: head and shoulders, filled. o.rouge (0..1) turns it red. */
function eleve(x, y, e = 1, o = {}) {
  if (e <= 0.001) return;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(e, e); ctx.globalAlpha *= o.alpha ?? 1;
  if (o.haut) { ctx.translate(0, 29); ctx.scale(1, o.haut); ctx.translate(0, -29); }
  const forme = () => { ctx.beginPath(); ctx.arc(0, -31, 15, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.roundRect(-26, -11, 52, 40, [22, 22, 7, 7]); ctx.fill(); };
  ctx.fillStyle = o.couleur || BLANC; forme();
  if (o.rouge > 0) { ctx.globalAlpha *= Math.min(1, o.rouge); ctx.fillStyle = ROUGE; forme(); }
  ctx.restore();
}
/** The teacher: the same figure, outline only. */
function prof(x, y, e = 1, o = {}) {
  if (e <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(e, e); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.couleur || BLANC; ctx.lineWidth = 6; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.arc(0, -31, 15, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-26, -11, 52, 40, [22, 22, 7, 7]); ctx.stroke();
  ctx.restore();
}
function rangs(n, cols, dx, dy) {
  const rows = Math.ceil(n / cols);
  return Array.from({ length: n }, (_, i) => { const c = i % cols, r = Math.floor(i / cols); return { i, c, r, x: (c - (cols - 1) / 2) * dx, y: (r - (rows - 1) / 2) * dy }; });
}
function desordre(liste, graine, amp = 16) { const r = rng(graine); return liste.map(p => ({ ...p, jx: (r() - 0.5) * 2 * amp, jy: (r() - 0.5) * 2 * amp, jr: (r() - 0.5) * 0.5 })); }
/** A line drawn progressively (p = 0..1) through the points. */
function tracer(pts, p, o = {}) {
  if (p <= 0) return;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let reste = seg.reduce((a, b) => a + b, 0) * Math.min(1, p);
  ctx.save(); ctx.strokeStyle = o.couleur || ROUGE; ctx.lineWidth = o.trait || 8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && reste > 0; i++) { const k = Math.min(1, reste / seg[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); reste -= seg[i - 1]; }
  ctx.stroke(); ctx.restore();
}
const coche = (x, y, s, p, o) => tracer([[x - 0.5 * s, y], [x - 0.12 * s, y + 0.38 * s], [x + 0.55 * s, y - 0.42 * s]], p, o);
function croix(x, y, s, p, o) { tracer([[x - s, y - s], [x + s, y + s]], Math.min(1, p * 2), o); tracer([[x + s, y - s], [x - s, y + s]], Math.max(0, p * 2 - 1), o); }
/** The wave of the movement: a sine line drawn progressively. */
function vague(x0, x1, y, amp, periode, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = o.couleur || ROUGE; ctx.lineWidth = o.trait || 10; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath();
  const fin = x0 + (x1 - x0) * Math.min(1, p);
  for (let x = x0; x <= fin; x += 3) { const yy = y + amp * Math.sin((x - x0) / periode * TAU + (o.phase || 0)); if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke(); ctx.restore();
}
function rect(x, y, w, h, r, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (o.plein) { ctx.fillStyle = o.plein; ctx.fill(); }
  if (o.trait) { ctx.strokeStyle = o.couleur || BLANC; ctx.lineWidth = o.trait; ctx.stroke(); }
  ctx.restore();
}

const CLASSE = desordre(rangs(30, 6, 118, 104), 7);

// ---------------------------------------------------------------- 1967: one day planned, five days
const FOULE = rangs(17 * 13, 17, 118, 104).filter(p => !(Math.abs(p.x) < 330 && Math.abs(p.y) < 250) && !(Math.abs(p.x) < 100 && p.y < -250 && p.y > -420)).map(p => ({ ...p, d: Math.hypot(p.x, p.y) }));
scene("hook", {
  dessin(t) {
    const tc = mot("hook", "professeur", 2.8) - 0.2, tr = EP.T.reveals[0], zoom = va(t, tr - 0.1, 1.3);
    ctx.save(); ctx.translate(CX, lerp(1060, 1010, zoom)); ctx.scale(lerp(1, 0.42, zoom), lerp(1, 0.42, zoom));
    // the movement outgrows the class: students all around, from the centre outwards
    for (const p of FOULE) eleve(p.x, p.y, easeOutBack(prog(t, tr + 0.25 + p.d * 0.0011, tr + 0.7 + p.d * 0.0011), 1.3), { alpha: 0.85 });
    CLASSE.forEach((p, i) => eleve(p.x + p.jx, p.y + p.jy, easeOutBack(prog(t, tc + i * 0.03, tc + 0.45 + i * 0.03), 1.4), { rot: p.jr }));
    prof(0, -335, 1.5 * sort(t, tc - 0.15, 0.5));
    ctx.restore();
    vague(CX - 300, CX + 300, 668, 16, 150, va(t, tr + 0.7, 0.9));
  },
  texte(t) {
    const tc = mot("hook", "professeur", 2.8) - 0.2, tr = EP.T.reveals[0];
    const m = va(t, tc - 0.3, 0.8), k = lerp(1.1, 1, sort(t, -0.6, 1.4)) * lerp(1, 0.5, m);
    ctx.save(); ctx.translate(CX, lerp(640, 420, m)); ctx.scale(k, k);
    ecrire("1967", 0, 0, 300, { alpha: sort(t, -0.5, 0.6) * (1 - va(t, tr - 0.25, 0.4)) });
    ctx.restore();
    texte("CALIFORNIE", CX, 860, 60, t, mot("hook", "Californie", 2) - 0.2, { espace: 16, fin: tc - 0.25, alpha: 0.75 });
    texte("PRÉVU : 1 JOUR", CX, 1410, 60, t, mot("hook", "devait", 6), { fin: tr - 0.3, alpha: 0.8 });
    texte("LA TROISIÈME", CX, 380, ajuste("LA TROISIÈME", 96), t, tr + 0.35);
    texte("VAGUE", CX, 540, 210, t, tr + 0.5, { monte: 40 });
    texte("5 JOURS", CX, 1410, 84, t, tr + 0.05, { couleur: ROUGE });
  },
});

// ---------------------------------------------------------------- a student's question; the teacher and his aim
scene("question", {
  dessin(t) {
    const t0 = S("question"), tq = mot("question", "question", 0.8), bas = vif(t, mot("question", "basculer", 12.8) - 0.15, 0.6);
    ctx.save(); ctx.translate(CX, 1275); ctx.scale(0.6, 0.6); ctx.rotate(-0.11 * bas);
    CLASSE.forEach((p, i) => {
      const leve = i === 14 ? sort(t, tq, 0.5) : 0;   // the one who asks
      eleve(p.x + p.jx * (1 - bas), p.y + p.jy * (1 - bas) - 26 * leve, sort(t, t0 + 0.1 + i * 0.015, 0.4), { rot: p.jr * (1 - bas), rouge: leve * (1 - bas) });
    });
    ctx.restore();
    prof(CX, 1030, 1.25 * sort(t, t0 + 0.2, 0.5));
  },
  texte(t) {
    const t0 = S("question"), t1 = mot("question", "Comment", 1.8), t2 = mot("question", "puis", 4.2), t3 = phrase("question", 3).start, t4 = mot("question", "but", 11) - 0.25;
    ecrire("?", CX, 450, 380, { alpha: sort(t, t0 + 0.1, 0.6) * (1 - va(t, t3 - 0.3, 0.4)) });
    texte("COMMENT ONT-ILS PU", CX, 730, ajuste("COMMENT ONT-ILS PU", 64), t, t1, { fin: t2 - 0.3 });
    texte("SUIVRE ?", CX, 815, 64, t, t1 + 0.6, { fin: t2 - 0.3 });
    texte("PUIS DIRE :", CX, 730, 56, t, t2, { fin: t3 - 0.3, alpha: 0.75 });
    texte("« ON NE SAVAIT RIEN »", CX, 815, ajuste("« ON NE SAVAIT RIEN »", 60), t, t2 + 0.35, { fin: t3 - 0.3 });
    texte("RON JONES", CX, 420, 110, t, t3);
    texte("PROFESSEUR D'HISTOIRE", CX, 535, ajuste("PROFESSEUR D'HISTOIRE", 58), t, t3 + 0.2);
    texte("PALO ALTO, CALIFORNIE", CX, 615, 48, t, t3 + 0.35, { alpha: 0.6 });
    texte("SON BUT", CX, 730, 60, t, t4, { couleur: ROUGE });
    texte("MONTRER COMMENT", CX, 812, 64, t, t4 + 0.25);
    texte("UN GROUPE BASCULE", CX, 892, ajuste("UN GROUPE BASCULE", 64), t, t4 + 0.45);
  },
});

// ---------------------------------------------------------------- Monday: discipline
scene("lundi", {
  dessin(t) {
    const t0 = S("lundi"), td = mot("lundi", "discipline", 2) - 0.15, ts = phrase("lundi", 2).start, tl = phrase("lundi", 3).start, tm = phrase("lundi", 4).start, te = phrase("lundi", 5).start;
    const pouls = 1 + 0.018 * Math.sin((t - te) * 5) * va(t, te, 0.6);
    ctx.save(); ctx.translate(CX, 900); ctx.scale(pouls, pouls);
    CLASSE.forEach((p, i) => {
      const o = 1 - vif(t, td + p.r * 0.06, 0.5), droit = va(t, ts + p.c * 0.04, 0.4);
      let leve = 0;
      [8, 16, 21].forEach((n, k) => { if (i === n) leve = Math.sin(Math.PI * easeInOut(prog(t, tl + k * 0.33, tl + k * 0.33 + 0.8))); });   // stands up to speak
      eleve(p.x + p.jx * o, p.y + p.jy * o - 30 * leve, sort(t, t0 - 0.2 + i * 0.012, 0.4), { rot: p.jr * o, haut: 1 + 0.1 * droit });
    });
    const q = CLASSE[9], fin = 1 - va(t, te - 0.2, 0.3);   // three words: three short bars over one student
    for (let k = 0; k < 3; k++) rect(q.x - 32 + k * 23, q.y - 78, 18, 7, 3, { plein: ROUGE, alpha: sort(t, tm + 0.15 + k * 0.22, 0.25) * fin });
    tracer([[-345, -255], [345, -255], [345, 255], [-345, 255], [-345, -255]], va(t, te + 0.1, 1.1), { couleur: BLANC, trait: 4, alpha: 0.5 });
    ctx.restore();
    [[ts, 1230], [tl, 1305], [tm, 1380]].forEach(([a, y]) => coche(112, y, 30, va(t, a + 0.2, 0.3)));
  },
  texte(t) {
    const t0 = S("lundi"), td = mot("lundi", "discipline", 2) - 0.15;
    texte("LUNDI", CX, 370, 150, t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, td - 0.5, { alpha: 0.7 });
    texte("LA DISCIPLINE", CX, 582, 76, t, td - 0.3, { couleur: ROUGE });
    texte("SE TENIR DROIT", 160, 1230, 52, t, phrase("lundi", 2).start, { align: "left" });
    texte("SE LEVER POUR PARLER", 160, 1305, 52, t, phrase("lundi", 3).start, { align: "left" });
    texte("RÉPONDRE EN 3 MOTS", 160, 1380, 52, t, phrase("lundi", 4).start, { align: "left" });
  },
});

// ---------------------------------------------------------------- Tuesday: community, a name, a salute, slogans
const RANGS3 = rangs(18, 6, 118, 100);
scene("mardi", {
  dessin(t) {
    const t0 = S("mardi"), tn = mot("mardi", "nom", 3.9) - 0.3, tsal = mot("mardi", "salut", 5.7) - 0.1, tslo = mot("mardi", "slogans", 8) - 0.1;
    const pc = va(t, tn, 0.8);
    if (pc > 0) { ctx.save(); ctx.strokeStyle = BLANC; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(CX, 800, 140, -Math.PI / 2, -Math.PI / 2 + TAU * pc); ctx.stroke(); ctx.restore(); }
    vague(CX - 96, CX + 96, 800, 34, 96, va(t, tn + 0.5, 0.7), { trait: 14 });
    ctx.save(); ctx.translate(CX, 1225);
    const ens = va(t, tslo, 0.3);
    for (let k = 0; k < 3; k++) {   // the slogans, said together: rings going out from the class
      const u = (((t - tslo) * 0.7 + k / 3) % 1 + 1) % 1, r = 330 + 110 * easeOutCubic(u);
      ctx.save(); ctx.globalAlpha = 0.4 * ens * (1 - u) * (1 - u); ctx.strokeStyle = BLANC; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (const a of [0, Math.PI]) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.5, 0, a - 0.5, a + 0.5); ctx.stroke(); }
      ctx.restore();
    }
    RANGS3.forEach(p => {
      const d = tsal + p.c * 0.14 + p.r * 0.05, leve = va(t, d, 0.4);   // the salute runs along the rows like a wave
      const houle = 12 * Math.sin(Math.PI * easeInOut(prog(t, d, d + 0.7))) + 6 * ens * Math.sin((t - tslo) * TAU * 1.1) ** 2;
      eleve(p.x, p.y - houle, sort(t, t0 + 0.1 + p.i * 0.015, 0.4));
      if (leve > 0) { ctx.save(); ctx.globalAlpha = leve; ctx.strokeStyle = ROUGE; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(p.x + 27, p.y - 18 - houle, 9, Math.PI * 0.85, Math.PI * 1.95); ctx.stroke(); ctx.restore(); }   // a cupped hand at the shoulder
    });
    ctx.restore();
  },
  texte(t) {
    const t0 = S("mardi"), tc = mot("mardi", "communauté", 2) - 0.15;
    texte("MARDI", CX, 370, 150, t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, tc - 0.5, { alpha: 0.7 });
    texte("LA COMMUNAUTÉ", CX, 582, 72, t, tc - 0.3, { couleur: ROUGE });
    texte("LA TROISIÈME VAGUE", CX, 1005, ajuste("LA TROISIÈME VAGUE", 62, 760), t, mot("mardi", "Troisième", 4.5) - 0.15);
    texte("TOUS ENSEMBLE", CX, 1420, 56, t, mot("mardi", "répétés", 8.6) - 0.1);
  },
});

// ---------------------------------------------------------------- Wednesday: cards, three informers… and twenty more
const CARTES30 = rangs(30, 6, 118, 88);
const NOUVELLES = [...Array.from({ length: 12 }, (_, i) => ({ x: (i % 6 - 2.5) * 118, y: (3 + Math.floor(i / 6)) * 88, cote: i % 2 ? 1 : -1 })), { x: -59, y: 5 * 88, cote: 1 }];
const TROIS = [4, 15, 26];
const VINGT = (() => { const r = rng(5), l = CARTES30.map(p => p.i).filter(i => !TROIS.includes(i)); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, 20); })();
function carteMembre(x, y, sx, o = {}) {
  if (sx <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx * (o.e || 1), o.e || 1);
  rect(-48, -31, 96, 62, 10, { plein: BLANC });
  vague(-30, 30, -8, 6, 30, 1, { couleur: NOIR, trait: 4, alpha: 0.55 });
  rect(-30, 10, 60, 6, 3, { plein: NOIR, alpha: 0.3 });
  ctx.restore();
}
scene("mercredi", {
  dessin(t) {
    const tcar = mot("mercredi", "carte", 2.5) - 0.35, t3 = mot("mercredi", "Trois", 3.7) - 0.1, t20 = mot("mercredi", "vingtaine", 10.4) - 0.25, ta = mot("mercredi", "autres", 13.6) - 0.5;
    const g = va(t, ta, 0.9), s = lerp(1, 0.86, g);
    ctx.save(); ctx.translate(CX, 673); ctx.scale(s, s); ctx.translate(0, 207);
    CARTES30.forEach(p => {
      const k = TROIS.indexOf(p.i), x3 = k >= 0 ? va(t, t3 + k * 0.18, 0.4) : 0;
      carteMembre(p.x, p.y, easeOutBack(prog(t, tcar + p.i * 0.025, tcar + 0.4 + p.i * 0.025), 1.3), { e: 1 + 0.1 * x3 });
      if (k >= 0) croix(p.x, p.y, 20, va(t, t3 + 0.1 + k * 0.18, 0.45), { trait: 9 });   // told to report on the others
      const n = VINGT.indexOf(p.i);
      if (n >= 0) { const a = easeOutBack(prog(t, t20 + n * 0.07, t20 + 0.3 + n * 0.07), 1.6); if (a > 0) { ctx.fillStyle = ROUGE; ctx.beginPath(); ctx.arc(p.x + 26, p.y + 13, 11 * a, 0, TAU); ctx.fill(); } }   // …did it unasked
    });
    NOUVELLES.forEach((p, i) => { const a = vif(t, ta + 0.15 + i * 0.05, 0.6); if (a > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, a * 3); carteMembre(p.x + p.cote * 760 * (1 - a), p.y, 1); ctx.restore(); } });   // students from other classes
    ctx.restore();
  },
  texte(t) {
    const t0 = S("mercredi"), tm = phrase("mercredi", 1).start, t3 = mot("mercredi", "Trois", 3.7) - 0.1, t20 = mot("mercredi", "vingtaine", 10.4) - 0.25, ta = mot("mercredi", "autres", 13.6) - 0.5;
    texte("MERCREDI", CX, 370, ajuste("MERCREDI", 150), t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, tm - 0.4, { alpha: 0.7 });
    texte("L'ACTION", CX, 582, 76, t, tm - 0.2, { couleur: ROUGE });
    texte("3 CHARGÉS DE SIGNALER", CX, 1200, ajuste("3 CHARGÉS DE SIGNALER", 56), t, t3 + 0.3, { fin: t20 - 0.2 });
    texte("UNE VINGTAINE LE FONT", CX, 1190, ajuste("UNE VINGTAINE LE FONT", 58), t, t20 + 0.25, { couleur: ROUGE, fin: ta - 0.2 });
    texte("SANS QU'ON LE DEMANDE", CX, 1272, ajuste("SANS QU'ON LE DEMANDE", 52), t, mot("mercredi", "sans", 11.3) - 0.1, { fin: ta - 0.2 });
    const n = Math.round(lerp(30, 43, va(t, ta + 0.3, 1.2)));
    texte(`${n} ÉLÈVES`, CX, 1365, 76, t, ta + 0.25);
    texte("AU LIEU DE 30", CX, 1440, 48, t, ta + 0.7, { alpha: 0.6 });
  },
});

// ---------------------------------------------------------------- Thursday: it slips away; he announces a national leader
const ANNEAUX = [[150, 10], [232, 16], [314, 22], [395, 28]];
scene("jeudi", {
  dessin(t) {
    const t0 = S("jeudi"), tv = mot("jeudi", "chef", 7) - 0.5, serre = va(t, t0 + 0.6, 2.4), derive = va(t, t0, 3.2);
    ctx.save(); ctx.translate(CX, 1190);
    const pts = [];
    ANNEAUX.forEach(([r, n], k) => {
      const a0 = sort(t, t0 + 0.25 + k * 0.4, 0.6), rr = r * lerp(1.04, 0.92, serre), rot = (k % 2 ? -1 : 1) * 0.3 * derive + k * 0.3;
      if (a0 > 0) for (let i = 0; i < n; i++) { const a = i / n * TAU + rot; pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.62, a0]); }
    });
    pts.sort((a, b) => a[1] - b[1]).forEach(([x, y, a]) => eleve(x, y, 0.6 * a));   // they close in around him
    prof(0, 0, lerp(1.3, 0.95, serre) * sort(t, t0 + 0.05, 0.4));
    ctx.restore();
    const p = va(t, tv, 0.7);   // the television set
    if (p > 0) {
      ctx.save(); ctx.translate(CX, 775); ctx.scale(lerp(1.08, 1, p), lerp(1.08, 1, p));
      rect(-210, -120, 420, 240, 26, { trait: 8, alpha: p, plein: "#0C0C0E" });
      tracer([[-70, 142], [70, 142]], p, { couleur: BLANC, trait: 8 });
      ctx.restore();
    }
  },
  texte(t) {
    const t0 = S("jeudi"), ta = mot("jeudi", "annonce", 3.6) - 0.3, tv = mot("jeudi", "chef", 7) - 0.5;
    texte("JEUDI", CX, 370, 150, t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, t0 + 0.5, { alpha: 0.7, fin: ta - 0.2 });
    texte("LA FIERTÉ", CX, 582, 76, t, t0 + 0.7, { couleur: ROUGE, fin: ta - 0.2 });
    texte("IL ANNONCE :", CX, 500, 52, t, ta + 0.15, { alpha: 0.7 });
    texte("UN MOUVEMENT NATIONAL", CX, 582, ajuste("UN MOUVEMENT NATIONAL", 60), t, mot("jeudi", "mouvement", 5.7) - 0.3);
    texte("DEMAIN", CX, 728, 56, t, mot("jeudi", "demain", 7.9) - 0.2);
    texte("MIDI", CX, 815, 104, t, mot("jeudi", "midi", 8.4) - 0.2, { couleur: ROUGE });
  },
});

// ---------------------------------------------------------------- Friday noon: the screen stays empty; then the film
const PUBLIC = desordre(rangs(200, 20, 42, 40), 11, 9);
const ECRAN = { x: CX - 320, y: 450, w: 640, h: 380 };
const FILM = rangs(72, 12, 46, 46);
scene("vendredi", {
  dessin(t) {
    const tenv = mot("vendredi", "Environ", 1.4) - 0.2, ton = mot("vendredi", "allume", 5) + 0.25, tr = EP.T.reveals[1], tj = mot("vendredi", "jamais", 12.4);
    const tfilm = mot("film", "film", 1.8) - 0.5, trang = mot("film", "foules", 4.1), tslo = mot("film", "slogans", 5.4), tfier = mot("film", "fierté", 6.1), tcomme = mot("film", "Exactement", 6.9);
    const lum = va(t, ton, 0.9) * (1 - va(t, tr - 0.1, 0.9)), cadre = (1 - va(t, tr + 0.1, 0.7)) + va(t, S("film") + 0.1, 0.6), f = va(t, tfilm, 0.8);
    const pouls = 1 + 0.02 * Math.sin((t - tcomme) * 5) * va(t, tcomme + 0.6, 0.6);
    // the screen: dark, then a soft light with nothing on it; later the film
    if (lum > 0) { const g = ctx.createRadialGradient(CX, 640, 150, CX, 640, 620); g.addColorStop(0, `rgba(237,231,218,${0.1 * lum})`); g.addColorStop(1, "rgba(237,231,218,0)"); ctx.fillStyle = g; ctx.fillRect(0, 200, W, 900); }
    rect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, 28, { plein: "#0C0C0E", alpha: Math.min(1, cadre) });
    rect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, 28, { plein: BLANC, alpha: 0.92 * lum });
    if (f > 0) {
      rect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, 28, { plein: "#19191C", alpha: f });
      ctx.save(); ctx.beginPath(); ctx.roundRect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, 28); ctx.clip();
      ctx.translate(CX, 650); ctx.scale(pouls, pouls);
      FILM.forEach(p => {   // crowds in rows, slogans, pride: the same pictograms
        const a = sort(t, trang - 0.2 + p.r * 0.12, 0.4);
        eleve(p.x, p.y - 6 * va(t, tfier, 0.5), 0.5 * a, { alpha: 0.9 });
        if (p.r === 0 && p.c % 2 === 0) rect(p.x - 9, p.y - 44, 18, 6, 3, { plein: BLANC, alpha: 0.8 * sort(t, tslo + p.c * 0.03, 0.3) });
      });
      ctx.restore();
      for (let k = 0; k < 6; k++) for (const x of [ECRAN.x - 36, ECRAN.x + ECRAN.w + 18]) rect(x, ECRAN.y + 24 + k * 60, 18, 30, 5, { plein: BLANC, alpha: 0.5 * f });   // film perforations
    }
    rect(ECRAN.x, ECRAN.y, ECRAN.w, ECRAN.h, 28, { trait: 8, alpha: Math.min(1, cadre) });
    // the two hundred, in rows; the order comes undone at the truth, and forms again in front of the film
    const defait = va(t, tj, 1.2) - vif(t, tcomme, 0.6);
    ctx.save(); ctx.translate(CX, 1150); ctx.scale(pouls, pouls);
    PUBLIC.forEach(p => eleve(p.x + p.jx * 0.9 * defait, p.y + p.jy * 0.9 * defait, 0.5 * sort(t, tenv + p.r * 0.07 + p.c * 0.006, 0.35), { rot: p.jr * 0.7 * defait }));
    ctx.restore();
  },
  texte(t) {
    const t0 = S("vendredi"), trien = mot("vendredi", "Rien", 8), tr = EP.T.reveals[1], tj = mot("vendredi", "jamais", 12.4), tf = S("film");
    const tfilm = mot("film", "film", 1.8) - 0.5, tcomme = mot("film", "Exactement", 6.9);
    texte("VENDREDI", CX, 300, 120, t, t0 + 0.05, { fin: tfilm - 0.3 });
    texte("12:00", CX, 392, 72, t, mot("vendredi", "midi", 0.8) - 0.2, { couleur: ROUGE, fin: tfilm - 0.3 });
    ecrire("RIEN.", CX, 644, 130, { couleur: NOIR, contour: false, alpha: sort(t, trien - 0.05, 0.3) * (1 - va(t, tr - 0.35, 0.3)) });
    texte("IL N'Y A", CX, 560, 72, t, tr, { fin: tf + 0.1 });
    texte("PAS DE CHEF.", CX, 668, ajuste("PAS DE CHEF.", 104), t, tr + 0.15, { couleur: ROUGE, fin: tf + 0.1 });
    texte("PAS DE MOUVEMENT.", CX, 775, ajuste("PAS DE MOUVEMENT.", 64), t, tj - 0.1, { fin: tf + 0.1 });
    texte("ALLEMAGNE,", CX, 292, 72, t, mot("film", "Allemagne", 2.2) - 0.3);
    texte("ANNÉES 30", CX, 376, 72, t, mot("film", "années", 3.1) - 0.2);
    texte("=", CX, 892, 120, t, tcomme + 0.25, { couleur: ROUGE });
  },
});

// ---------------------------------------------------------------- the lesson
const GRAPPE = [[0, 0], [-34, -18], [34, -18], [-52, 16], [52, 16], [-18, 30], [20, 32]];
function grappe(x, y, a, e = 0.5) { GRAPPE.forEach(([dx, dy], i) => eleve(x + dx, y + dy + 12, e * easeOutBack(prog(a, i * 0.08, 0.5 + i * 0.08), 1.4))); }
scene("lecon", {
  dessin(t) {
    const tg = mot("lecon", "groupe", 3.3) - 0.2, tc = mot("lecon", "chef", 4) - 0.2, te = mot("lecon", "envie", 4.5) - 0.2;
    grappe(170, 850, prog(t, tg, tg + 0.8));
    prof(170, 1035, 1.3 * sort(t, tc, 0.5));
    grappe(160, 1200, prog(t, te, te + 0.8));
    const j = va(t, te + 0.35, 0.9);   // the wish to belong: one more joins
    eleve(lerp(170, 214, j), lerp(1345, 1268, j), 0.5 * sort(t, te + 0.3, 0.3), { rouge: 1 });
  },
  texte(t) {
    const tp = mot("lecon", "Personne", 0.8) - 0.2;
    texte("LA LEÇON ?", CX, 290, 60, t, S("lecon") + 0.05, { alpha: 0.7 });
    texte("PERSONNE", CX, 420, 140, t, tp);
    texte("N'EST À L'ABRI.", CX, 545, ajuste("N'EST À L'ABRI.", 84), t, tp + 0.3);
    texte("UN GROUPE", 280, 850, 72, t, mot("lecon", "groupe", 3.3) - 0.2, { align: "left" });
    texte("UN CHEF", 280, 1025, 72, t, mot("lecon", "chef", 4) - 0.2, { align: "left" });
    texte("L'ENVIE D'EN", 280, 1175, 60, t, mot("lecon", "envie", 4.5) - 0.2, { align: "left" });
    texte("FAIRE PARTIE", 280, 1247, 60, t, mot("lecon", "envie", 4.5), { align: "left" });
  },
});

// ---------------------------------------------------------------- where the story comes from
scene("nuance", {
  dessin(t) {
    prof(150, 660, 1.3 * sort(t, mot("nuance", "professeur", 1.5) - 0.5, 0.5));
    coche(150, 1180, 56, va(t, mot("nuance", "anciens", 4.8) - 0.1, 0.4), { trait: 12 });
  },
  texte(t) {
    const t1 = mot("nuance", "professeur", 1.5) - 0.5, t2 = mot("nuance", "détails", 3.2) - 0.3, t3 = mot("nuance", "anciens", 4.8) - 0.3;
    texte("D'OÙ VIENT CE RÉCIT ?", CX, 380, ajuste("D'OÙ VIENT CE RÉCIT ?", 64), t, S("nuance") + 0.05);
    texte("SON PROPRE RÉCIT", 250, 625, 56, t, t1, { align: "left" });
    texte("ÉCRIT EN 1976", 250, 695, 48, t, t1 + 0.25, { align: "left", alpha: 0.6 });
    texte("?", 150, 905, 130, t, t2, { couleur: ROUGE });
    texte("DES DÉTAILS", 250, 870, 56, t, t2, { align: "left" });
    texte("DISCUTÉS", 250, 940, 56, t, t2 + 0.15, { align: "left" });
    texte("CONFIRMÉ PAR", 250, 1140, 56, t, t3, { align: "left" });
    texte("D'ANCIENS ÉLÈVES", 250, 1210, 56, t, t3 + 0.15, { align: "left" });
    texte("DOCUMENTAIRE, 2010", 250, 1285, 48, t, mot("nuance", "confirmé", 6.3), { align: "left", alpha: 0.6 });
  },
});

// ---------------------------------------------------------------- and you?
const RANGS4 = rangs(24, 6, 118, 104);
scene("cta", {
  dessin(t) {
    const t0 = S("cta"), ts = mot("cta", "suivi", 1) - 0.2, tn = mot("cta", "non", 2.1) - 0.35, td = mot("cta", "Dis-le", 2.5) - 0.2;
    const suit = Math.sin(Math.PI * easeInOut(prog(t, ts, ts + 0.9))), sort1 = va(t, tn, 0.8);
    ctx.save(); ctx.translate(CX, 1010);
    RANGS4.forEach(p => {
      const lui = p.i === 20;   // one of them steps out of the rows
      eleve(p.x + 12 * suit * (lui ? 1 - sort1 : 1), p.y + (lui ? 92 * sort1 : 0), sort(t, t0 + 0.05 + p.i * 0.012, 0.4), { rouge: lui ? sort1 : 0 });
    });
    ctx.restore();
    const p = va(t, td, 0.6);
    if (p > 0) { ctx.save(); ctx.translate(CX, 1400 + (1 - p) * 20); rect(-400, -50, 800, 100, 50, { plein: BLANC, alpha: p }); ctx.restore(); }
  },
  texte(t) {
    const t0 = S("cta"), td = mot("cta", "Dis-le", 2.5) - 0.2;
    texte("ET TOI ?", CX, 380, 150, t, t0 + 0.05);
    texte("TU AURAIS SUIVI ?", CX, 560, ajuste("TU AURAIS SUIVI ?", 72), t, mot("cta", "suivi", 1) - 0.5);
    texte("OU DIT NON ?", CX, 670, ajuste("OU DIT NON ?", 84), t, mot("cta", "ou", 1.4) - 0.1, { couleur: ROUGE });
    texte("DIS-LE EN COMMENTAIRE", CX, 1404, 52, t, td + 0.1, { couleur: NOIR, contour: false, monte: 20 });
  },
});

// ---------------------------------------------------------------- sound: the heart, faster every day, and the silences
const JOURS = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, film: 5 };
function battements() {
  const out = [], plage = (a, b, b0, b1) => { let x = a; while (x < b) { out.push(+x.toFixed(3)); x += 60 / (b0 + (b1 - b0) * (x - a) / Math.max(b - a, 0.001)); } };
  plage(S("lundi") + 0.2, E("lundi") - 0.3, 52, 58);
  plage(S("mardi"), E("mardi") - 0.3, 62, 70);
  plage(S("mercredi"), phrase("mercredi", 2).end - 0.3, 76, 84);
  plage(phrase("mercredi", 3).start + 0.15, E("mercredi") - 0.3, 86, 90);
  plage(S("jeudi"), E("jeudi") - 0.3, 94, 104);
  plage(S("vendredi"), phrase("vendredi", 2).end - 0.35, 110, 128);
  return out;
}
lancer({
  jours: JOURS,
  decors: { film: "vendredi" },
  mentions: Object.fromEntries(["hook", "question", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "film", "lecon", "nuance", "cta"].map(id => [id, JOURS[id] && id !== "film" ? "RECONSTITUTION" : "ILLUSTRATION"])),
  sources: { titre: "SOURCES", duree: 5.5, lignes: ["Ron Jones, « The Third Wave », 1976.", "Documentaire « Lesson Plan », 2010.", "Wikipédia, « La Troisième Vague ».", "Voix de synthèse, images d'illustration."] },
  musique: () => ({ style: "dark", root: 36 }),
  battements, coeur: 1.5,
  // total silence: the pause after the informers are named; from the television being switched on to "no leader"
  silences: () => [[phrase("mercredi", 2).end + 0.05, phrase("mercredi", 3).start - 0.05, 0.6], [phrase("vendredi", 2).end + 0.05, phrase("vendredi", 5).end + 0.1, 2.5]],
  sons() { EP.ORDRE.forEach((id, i) => { if (i && decorDe(id) !== decorDe(EP.ORDRE[i - 1])) sfx(S(id) - 0.25, "swish", { gain: 0.14 }); }); },
  voix: { bed: 0.19, duck: 0.65 },
});
