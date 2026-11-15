// Clean dark motion design for narrated videos (classic script, load after core.js and narration.js).
// Everything is vector, drawn at full size: shapes, one bold sans-serif (Montserrat 800, "MontX"), no enlarged
// picture. Palette: deep black, off-white, one blood-red accent. Every move is eased (never linear) and the picture
// is averaged over a short shutter, so fast moves get a light motion blur; grain and vignette go under the text,
// which is drawn last and stays sharp. Nothing important is drawn in the bottom 250 px or the right 150 px (ZONE),
// no text is under 48 px: window.__audit(t) lists what breaks either rule.
//   scene(id, { dessin(t), texte(t) })   one scene per voice segment (or shared, see decors)
//   lancer({ jours, mentions, decors, sources, musique, sons, silences, voix })
const NOIR = "#050506", BLANC = "#EDE7DA", ROUGE = "#B5121E";
const ZONE = { x0: 70, x1: 930, y0: 130, y1: 1670 }, CX = (ZONE.x0 + ZONE.x1) / 2;
const FPS = 30, TAILLE_MIN = 48;
const EP = { scenes: {}, decors: {}, T: null, SEG: null, ORDRE: [], CARTES: [], DUREE: 0, o: null, audit: null, grains: [], acc: null, battements: [] };

function scene(id, def) { EP.scenes[id] = def; }
const decorDe = id => EP.decors[id] || id;
const S = id => EP.SEG[id].start, E = id => EP.SEG[id].next;
const mot = (id, w, fb = 0) => wordTime(EP.SEG[id], w, fb);
const phrase = (id, n) => EP.SEG[id].sentences[n];
// easing shorthands: never a linear move
const sort = (t, a, d = 0.5) => easeOutCubic(prog(t, a, a + d));      // arrives and settles
const va = (t, a, d = 0.6) => easeInOut(prog(t, a, a + d));            // goes from one state to another
const vif = (t, a, d = 0.45) => easeInOutExpo(prog(t, a, a + d));      // snaps: fast in the middle (motion blur)

// ---------------------------------------------------------------- text (the only way to write: checked by the audit)
function ecrire(str, x, y, taille, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0.004) return;
  ctx.save();
  ctx.font = `${taille}px MontX`; ctx.textAlign = o.align || "center"; ctx.textBaseline = "middle";
  if (o.espace) ctx.letterSpacing = o.espace + "px";
  ctx.globalAlpha *= a;
  if (o.contour !== false) { ctx.lineJoin = "round"; ctx.lineWidth = taille * 0.14; ctx.strokeStyle = o.contour || "rgba(0,0,0,.92)"; ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.couleur || BLANC; ctx.fillText(str, x, y);
  if (EP.audit && ctx.globalAlpha > 0.12) {
    const m = ctx.measureText(str), tr = ctx.getTransform(), k = Math.sqrt(Math.abs(tr.a * tr.d - tr.b * tr.c));
    const coins = [[x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent]].map(([px, py]) => [tr.a * px + tr.c * py + tr.e, tr.b * px + tr.d * py + tr.f]);
    EP.audit.push({ s: str, x0: Math.min(coins[0][0], coins[1][0]), x1: Math.max(coins[0][0], coins[1][0]), y0: Math.min(coins[0][1], coins[1][1]), y1: Math.max(coins[0][1], coins[1][1]), px: taille * k });
  }
  ctx.restore();
}
/** Text that rises and fades in at t0 (and fades out at o.fin): the standard entrance. */
function texte(str, x, y, taille, t, t0, o = {}) {
  const p = sort(t, t0, o.duree ?? 0.5), q = o.fin != null ? va(t, o.fin, 0.35) : 0;
  ecrire(str, x, y + (1 - p) * (o.monte ?? 26) - q * 12, taille, { ...o, alpha: (o.alpha ?? 1) * p * (1 - q) });
}
/** Largest size up to `max` at which str fits the width (never under the minimum size: shorten the text instead). */
function ajuste(str, max, largeur = ZONE.x1 - ZONE.x0 - 20) {
  const s = Math.floor(fitSize(str, "MontX", largeur, max));
  if (s < TAILLE_MIN) console.warn(`texte trop long pour ${TAILLE_MIN} px : ${str}`);
  return s;
}

// ---------------------------------------------------------------- frame
function fondNoir() {
  const g = ctx.createRadialGradient(CX, H * 0.45, 100, CX, H * 0.45, H * 0.8);
  g.addColorStop(0, "#111113"); g.addColorStop(1, "#030304");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// film grain at full size (no enlarged noise picture), added in the blacks, under the text
function grainFin(image) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = EP.o.grain ?? 0.03;
  ctx.drawImage(EP.grains[image % EP.grains.length], 0, 0); ctx.restore();
}
function creerGrains(n = 4) {
  for (let k = 0; k < n; k++) {
    const g = document.createElement("canvas"); g.width = W; g.height = H;
    const gc = g.getContext("2d"), img = gc.createImageData(W, H), r = rng(97 + k * 13);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gc.putImageData(img, 0, 0); EP.grains.push(g);
  }
}
// the scene on screen at t; between two different sets, a dip through black with a slight push-in (eased)
function passe(t, quoi) {
  let i = EP.ORDRE.findIndex(id => t < EP.SEG[id].next);
  if (i < 0) i = EP.ORDRE.length - 1;
  const D = 0.32, j = EP.ORDRE.findIndex((id, n) => n > 0 && decorDe(id) !== decorDe(EP.ORDRE[n - 1]) && Math.abs(t - S(id)) < D);
  let id = decorDe(EP.ORDRE[i]), a = 1, z = 1;
  if (j > 0) {
    const u = (t - S(EP.ORDRE[j])) / D;
    if (u < 0) { id = decorDe(EP.ORDRE[j - 1]); const k = easeInOut(1 + u); a = 1 - k; z = 1 + 0.04 * k; }
    else { id = decorDe(EP.ORDRE[j]); const k = easeInOut(u); a = k; z = 1.04 - 0.04 * k; }
  }
  const sc = EP.scenes[id];
  ctx.save();
  if (quoi === "dessin") {
    ctx.translate(CX, H * 0.45); ctx.scale(z, z); ctx.translate(-CX, -H * 0.45);
    if (sc.dessin) sc.dessin(t);
    ctx.restore();
    if (a < 1) { ctx.fillStyle = `rgba(4,4,5,${(1 - a).toFixed(4)})`; ctx.fillRect(0, 0, W, H); }
  } else {
    ctx.globalAlpha = a;
    if (sc.texte) sc.texte(t);
    ctx.restore();
  }
  return EP.ORDRE[i];
}
function rendre(t) {
  const N = EP.o.flou ?? 4, obturateur = 0.5 / FPS, acc = EP.acc.getContext("2d");
  // shapes: N pictures spread over the shutter, averaged (light motion blur on what moves fast)
  for (let k = 0; k < N; k++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    fondNoir(); passe(t + ((k + 0.5) / N - 0.5) * obturateur, "dessin");
    acc.globalAlpha = 1 / (k + 1); acc.drawImage(cv, 0, 0);
  }
  ctx.drawImage(EP.acc, 0, 0);
  vignette(EP.o.vignette ?? 0.55, 0.34);
  grainFin(Math.round(t * FPS));
  // text and interface: drawn once, sharp, over the grain
  const id = passe(t, "texte");
  habillage(t, id);
  if (window.__zone) { ctx.strokeStyle = "rgba(0,255,160,.7)"; ctx.lineWidth = 2; ctx.strokeRect(ZONE.x0, ZONE.y0, ZONE.x1 - ZONE.x0, ZONE.y1 - ZONE.y0); }
}

// ---------------------------------------------------------------- interface: day counter, mention, subtitles, sources
function habillage(t, id) {
  const o = EP.o, jours = o.jours || {}, ids = EP.ORDRE.filter(x => jours[x]);
  // discreet counter, top left: "JOUR 2/5", five small bars, a dot beating with the heart
  if (ids.length) {
    const total = Math.max(...ids.map(x => jours[x])), a = sort(t, S(ids[0]), 0.5) * (1 - va(t, E(ids[ids.length - 1]) - 0.35, 0.35));
    if (a > 0) {
      const courant = [...ids].reverse().find(x => t >= S(x)) || ids[0], n = jours[courant], avant = jours[ids[ids.indexOf(courant) - 1]];
      const p = avant && avant !== n ? sort(t, S(courant), 0.45) : 1, y = 176, x = ZONE.x0;
      ctx.save(); ctx.font = `${TAILLE_MIN}px MontX`; const wj = ctx.measureText("JOUR ").width, wn = ctx.measureText("0").width; ctx.restore();
      ecrire("JOUR", x, y, TAILLE_MIN, { align: "left", alpha: 0.6 * a });
      if (p < 1) ecrire(String(avant), x + wj + wn / 2, y - 22 * p, TAILLE_MIN, { alpha: 0.6 * a * (1 - p) });
      ecrire(String(n), x + wj + wn / 2, y + 22 * (1 - p), TAILLE_MIN, { alpha: 0.6 * a * p });
      ecrire(`/${total}`, x + wj + wn + 4, y, TAILLE_MIN, { align: "left", alpha: 0.6 * a });
      for (let k = 1; k <= total; k++) {
        const plein = k < n ? 1 : k === n ? p : 0;
        ctx.save(); ctx.globalAlpha = a * (0.22 + 0.5 * plein); ctx.fillStyle = k === n ? ROUGE : BLANC;
        ctx.beginPath(); ctx.roundRect(x + (k - 1) * 48, y + 42, 38, 6, 3); ctx.fill(); ctx.restore();
      }
      const dernier = [...EP.battements].reverse().find(b => b <= t);
      if (dernier != null) {
        const pouls = Math.exp(-(t - dernier) * 7);
        ctx.save(); ctx.globalAlpha = a * (0.35 + 0.65 * pouls); ctx.fillStyle = ROUGE;
        ctx.beginPath(); ctx.arc(x + total * 48 + 16, y + 45, 7 + 4 * pouls, 0, 6.2832); ctx.fill(); ctx.restore();
      }
    }
  }
  // small fixed mention, top right of the safe zone: nothing passes for real footage
  const m = (o.mentions || {})[id];
  if (m) {
    const k = EP.ORDRE.indexOf(id), prec = k > 0 ? (o.mentions || {})[EP.ORDRE[k - 1]] : null;
    const a = prec === m ? 1 : sort(t, S(id), 0.5);
    ecrire(m, ZONE.x1, 176, TAILLE_MIN, { align: "right", alpha: 0.4 * a });
  }
  sousTitres(t);
  if (o.sources) cartonSources(t, o.sources);
  const fin = va(t, EP.DUREE - 0.6, 0.6);
  if (fin > 0) { ctx.fillStyle = `rgba(0,0,0,${fin})`; ctx.fillRect(0, 0, W, H); }
}
// subtitles, word by word on the audio: off-white with a sharp outline and shadow, the spoken word on the red accent
function sousTitres(t) {
  const c = EP.CARTES.find(c => t >= c.start - 0.05 && t < c.until);
  if (!c) return;
  const taille0 = 72, y0 = 1560, p = sort(t, c.start - 0.05, 0.16);
  ctx.save(); ctx.font = `${taille0}px MontX`;
  const mots = c.words.map(w => ({ ...w, txt: w.w.toUpperCase().replace(/[,.;:…]+$/, "") }));
  const esp = taille0 * 0.5, larg = mots.map(w => ctx.measureText(w.txt).width), tot = larg.reduce((a, b) => a + b, 0) + esp * (mots.length - 1);
  ctx.restore();
  const k = Math.min(1, (ZONE.x1 - ZONE.x0 - 40) / tot), taille = taille0 * k, y = y0 + (1 - p) * 10;
  let x = CX - tot * k / 2;
  mots.forEach((w, i) => {
    const actif = t >= w.s - 0.03 && (i === mots.length - 1 || t < mots[i + 1].s - 0.03), l = larg[i] * k, cx = x + l / 2;
    if (actif) {
      const pop = 1 + 0.07 * (1 - sort(t, w.s - 0.03, 0.2)), bw = (l + taille * 0.42) * pop, bh = taille * 1.22 * pop;
      ctx.save(); ctx.globalAlpha = p;
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.beginPath(); ctx.roundRect(cx - bw / 2 + 5, y - bh / 2 + 7, bw, bh, taille * 0.2); ctx.fill();   // sharp shadow
      ctx.fillStyle = ROUGE; ctx.beginPath(); ctx.roundRect(cx - bw / 2, y - bh / 2, bw, bh, taille * 0.2); ctx.fill();
      ctx.restore();
      ecrire(w.txt, cx, y + taille * 0.04, taille * pop, { alpha: p, contour: false });
    } else {
      ecrire(w.txt, cx + 4, y + 6, taille, { alpha: p * 0.8, couleur: "#000000", contour: "#000000" });   // sharp shadow
      ecrire(w.txt, cx, y, taille, { alpha: p });
    }
    x += l + esp * k;
  });
}
// sources, over the last seconds after the voice
function cartonSources(t, src) {
  const t0 = EP.DUREE - src.duree, p = va(t, t0, 0.7);
  if (p <= 0) return;
  ctx.fillStyle = `rgba(4,4,5,${0.985 * p})`; ctx.fillRect(0, 0, W, H);
  const lignes = [];
  for (const l of src.lignes) { lignes.push(...wrap(l, TAILLE_MIN, "MontX", ZONE.x1 - ZONE.x0 - 40).map((s, i) => [s, i === 0])); }
  const pas = 66, haut = 150 + lignes.length * pas + (src.lignes.length - 1) * 26, y0 = 870 - haut / 2;
  ecrire(src.titre || "SOURCES", CX, y0 + 40, 76, { couleur: ROUGE, alpha: sort(t, t0 + 0.1, 0.5), espace: 6 });
  let y = y0 + 170, n = -1;
  for (const [s, debut] of lignes) {
    if (debut) { n++; if (n) y += 26; }
    texte(s, CX, y, TAILLE_MIN, t, t0 + 0.25 + n * 0.12, { monte: 18 });
    y += pas;
  }
}

/** Rule check at time t: every text drawn that is under 48 px or leaves the safe zone. */
window.__audit = t => {
  EP.audit = []; rendre(t);
  const out = EP.audit.filter(e => e.px < TAILLE_MIN - 0.01 || e.x0 < ZONE.x0 - 22 || e.x1 > ZONE.x1 + 1 || e.y0 < ZONE.y0 || e.y1 > ZONE.y1 + 1)
    .map(e => ({ s: e.s, px: +e.px.toFixed(1), x0: Math.round(e.x0), x1: Math.round(e.x1), y0: Math.round(e.y0), y1: Math.round(e.y1) }));
  const min = EP.audit.reduce((a, e) => Math.min(a, e.px), 999);
  EP.audit = null;
  return { hors: out, min };
};

/** { jours: {segId: n} (day counter), mentions: {segId: label}, decors: {segId: sceneId}, sources: {titre, lignes, duree},
 *    musique: () => music options, sons: () => void, silences: () => [[t0, t1, retour]], battements: () => [times],
 *    voix: {bed, duck} } */
function lancer(o) {
  EP.o = o; EP.decors = o.decors || {};
  window.ready = (async () => {
    await document.fonts.load("100px MontX");
    EP.T = await (await fetch("timings.json")).json();
    EP.SEG = segmentIndex(EP.T);
    EP.ORDRE = EP.T.segments.map(s => s.id);
    EP.CARTES = buildCaptions(EP.T, { maxChars: 14, maxWords: 3 });
    EP.DUREE = Math.ceil((EP.T.duration + 0.9 + (o.sources ? o.sources.duree : 0)) * 10) / 10;
    EP.SEG[EP.ORDRE[EP.ORDRE.length - 1]].next = EP.DUREE;
    EP.acc = document.createElement("canvas"); EP.acc.width = W; EP.acc.height = H;
    creerGrains();
    if (o.battements) { EP.battements = o.battements(); for (const b of EP.battements) sfx(b, "coeur", { gain: o.coeur ?? 0.5 }); }
    for (const [a, b, retour] of (o.silences ? o.silences() : [])) sfx(a, "silence", { dur: b - a, retour: retour ?? 0.6 });
    if (o.sons) o.sons();
    window.TIMELINE = {
      FPS, DURATION: EP.DUREE, LOUDNESS: -14, MUSIC: o.musique ? o.musique() : { style: "dark" },
      VOICE: { path: "voice.wav", bed: o.voix?.bed ?? 0.22, duck: o.voix?.duck ?? 0.65 },
      EXPORT: { crf: 16, jpeg: 1, rec709: true, audio: { rate: 48000, bitrate: "320k" } },
    };
    return true;
  })();
  window.render = rendre;
}
