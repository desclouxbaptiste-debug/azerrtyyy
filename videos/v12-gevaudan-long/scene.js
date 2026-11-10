// La Bête du Gévaudan, long version (about 3 min): the same true story told through 24 different sets — night
// forest, mountains and stone villages, a wash-house, a farm, an inn, a printing shop, a Paris café, Versailles,
// snow, a river, an autumn wood, a museum… Imagined villagers talk to each other (library voices, labelled
// "Dialogue imaginé"); real people never speak, the narrator tells what they did. TikTok rules of the brief
// (lib/recit3d.js): no flash or sudden sound, no violence shown, every scene labelled, sources at the end.
// Nobody walks through anybody: lib/collisions.mjs checks every set.
import * as THREE from "three";
import { plateau, figure, auDessus, tourneVers, chemin, plans, glisse, revele, encre, tampon, st, S, E, wt, INK, R, demarrer } from "../lib/recit3d.js";
import { creerFoule, creerChaise, fenetre, VITESSE_MARCHE } from "../lib/quidams.js";
import * as D from "../lib/decors3d.js";
import { habiller, TENUES } from "../lib/costumes.js";

const VERT = "#2E9E5B", ROUGE = "#C8322B", OR = "#FFE08A";

// ---------------------------------------------------------------- skies and light
function hexa(c) { return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
function melange(a, b, k) { const x = hexa(a), y = hexa(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`; }
const CIELS = {
  jour: ["#9DB4C4", "#E6DFCF"], gris: ["#8D969D", "#D2CEC5"], crepuscule: ["#34405E", "#C98E66"], nuit: ["#0B1019", "#1C2330"],
  aube: ["#56648A", "#F2C6A6"], couchant: ["#46558A", "#F4A35C"], hiver: ["#AEB9C2", "#EEF0F1"],
};
/** Sky gradient, blended from one kind to another (k = 0..1); a moon at night, a low sun at sunset. */
function ciel(a, b = a, k = 0) {
  const [h1, b1] = CIELS[a], [h2, b2] = CIELS[b];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, melange(h1, h2, k)); g.addColorStop(0.55, melange(b1, b2, k)); g.addColorStop(1, melange(b1, b2, k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lune = (a === "nuit" ? 1 - k : 0) + (b === "nuit" ? k : 0);
  if (lune > 0) {
    const l = ctx.createRadialGradient(800, 360, 30, 800, 360, 150);
    l.addColorStop(0, `rgba(236,232,214,${0.9 * lune})`); l.addColorStop(0.3, `rgba(236,232,214,${0.18 * lune})`); l.addColorStop(1, "rgba(236,232,214,0)");
    ctx.fillStyle = l; ctx.beginPath(); ctx.arc(800, 360, 150, 0, 6.29); ctx.fill();
  }
  const soleil = (a === "couchant" ? 1 - k : 0) + (b === "couchant" ? k : 0);
  if (soleil > 0) {
    const s = ctx.createRadialGradient(330, 860, 40, 330, 860, 260);
    s.addColorStop(0, `rgba(255,214,150,${soleil})`); s.addColorStop(0.35, `rgba(255,190,120,${0.35 * soleil})`); s.addColorStop(1, "rgba(255,180,110,0)");
    ctx.fillStyle = s; ctx.beginPath(); ctx.arc(330, 860, 260, 0, 6.29); ctx.fill();
  }
}
// background of a room (seen above and around the walls)
const salle = c => () => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };
// lights of the studio for each kind of place (the sets return lumieres: true and set them every frame)
const LUM = {
  jour: [1.7, 2.3, 1.5, "#FFF3E2", "#FFFFFF", "#B9B2A5"], gris: [1.55, 1.15, 1.2, "#E9EDF1", "#F1F3F5", "#A9A49B"],
  crepuscule: [0.75, 1.15, 1.5, "#F2A66E", "#B9C2E0", "#6E6458"], nuit: [0.1, 0.3, 1.1, "#AFC4E8", "#9FB2D6", "#30343C"],
  aube: [0.9, 1.4, 1.3, "#F6BE98", "#D9C8E0", "#8C7F74"], couchant: [1.0, 2.1, 1.6, "#FFB070", "#FFD9B0", "#8C6E58"],
  hiver: [1.85, 1.5, 1.2, "#EEF3F8", "#FFFFFF", "#D6DCE0"], dedans: [1.35, 1.6, 0.9, "#FFE6C4", "#FFF3E2", "#8C7A66"],
  soir: [0.62, 0.95, 0.7, "#FFC88E", "#E8C8A0", "#4A3E34"], musee: [1.75, 1.7, 1.0, "#FFF6EA", "#FFFFFF", "#C8C0B4"],
};
const ca = new THREE.Color(), cb = new THREE.Color();
function eclaire(a, b = a, k = 0) {
  const x = LUM[a], y = LUM[b];
  st.ciel.intensity = lerp(x[0], y[0], k); st.key.intensity = lerp(x[1], y[1], k); st.contre.intensity = lerp(x[2], y[2], k);
  st.key.color.copy(ca.set(x[3]).lerp(cb.set(y[3]), k));
  st.ciel.color.copy(ca.set(x[4]).lerp(cb.set(y[4]), k)); st.ciel.groundColor.copy(ca.set(x[5]).lerp(cb.set(y[5]), k));
}
// a soft band of mist low over the picture
function brume(a = 0.2, y = 1150) {
  const g = ctx.createLinearGradient(0, y - 300, 0, y + 300);
  g.addColorStop(0, "rgba(200,210,220,0)"); g.addColorStop(0.5, `rgba(200,210,220,${a})`); g.addColorStop(1, "rgba(200,210,220,0)");
  ctx.fillStyle = g; ctx.fillRect(0, y - 300, W, 600);
}

// ---------------------------------------------------------------- countryside
function campagne(g, arbres = [], { collines = true, sol = "#8C9566", relief = ["#8E9C93", "#99A6A0", "#8A988F", "#93A097"], sapin = D.sapin } = {}) {
  g.add(D.pre(60, sol));
  if (collines) [[-14, -34, 1.2], [6, -40, 1.5], [22, -30, 1.0], [-30, -28, 1.1]].forEach(([x, z, s], i) => {
    const h = D.colline(relief[i % relief.length]); h.position.set(x, 0, z); h.scale.multiplyScalar(s); g.add(h);
  });
  for (const [x, z, h] of arbres) { const a = sapin(h); a.position.set(x, 0, z); g.add(a); }
}
const foret = (cx, cz, n, r, seed = 1) => Array.from({ length: n }, (_, i) => {
  const a = i * 2.39996 + seed, d = r * Math.sqrt((i + 0.5) / n);
  return [cx + Math.cos(a) * d, cz + Math.sin(a) * d, 2.4 + ((i * 37 + seed * 11) % 10) / 10];
});
const poser = (g, o, x, z, ry = 0) => { o.position.x = x; o.position.z = z; if (ry) o.rotation.y = ry; g.add(o); return o; };
// the Beast as a 2D shadow (on the sky, or cast on a wall), eyes lit
function ombreBete(x, y, s, alpha, yeux = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha; ctx.fillStyle = "#06080C";
  ctx.beginPath(); ctx.ellipse(0, 0, 230, 105, 0, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.ellipse(220, -70, 95, 80, -0.3, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.moveTo(290, -60); ctx.lineTo(400, -30); ctx.lineTo(300, 0); ctx.fill();
  for (const ex of [185, 245]) { ctx.beginPath(); ctx.moveTo(ex - 28, -130); ctx.lineTo(ex, -215); ctx.lineTo(ex + 28, -130); ctx.fill(); }
  for (const lx of [-160, -90, 90, 160]) ctx.fillRect(lx - 22, 60, 44, 190);
  ctx.beginPath(); ctx.moveTo(-210, -30); ctx.quadraticCurveTo(-380, -60, -420, 60); ctx.quadraticCurveTo(-330, 10, -215, 30); ctx.fill();
  if (yeux > 0) for (const ex of [235, 285]) {
    const gl = ctx.createRadialGradient(ex, -85, 0, ex, -85, 26);
    gl.addColorStop(0, `rgba(255,214,120,${yeux})`); gl.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ex, -85, 26, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the wolf
function bete(g, x, z, { taille = 0.85, ...o } = {}) {
  const b = D.loup({ tete: 1.12, ...o });
  b.scale.setScalar(taille); b.position.set(x, 0, z); g.add(b);
  return b;
}
const regard = (b, k) => { b.lueur.emissiveIntensity = 2.6 * k; };
const lisse = x => x * x * (3 - 2 * x);
const longueur = pts => pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
function sur(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az);
    if (s <= l || i === pts.length - 1) return [ax + (bx - ax) * s / l, az + (bz - az) * s / l];
    s -= l;
  }
}
const cap = (pts, s, L) => { const [x0, z0] = sur(pts, Math.max(0, s - 0.25)), [x1, z1] = sur(pts, Math.min(L, s + 0.25)); return Math.atan2(-(z1 - z0), x1 - x0); };
const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
// walking a path: sets off at t0 at about v m/s, stops smoothly; the paws follow the ground
function marcher(b, t, t0, pts, { v = 1, cap0 = null, tete } = {}) {
  const L = longueur(pts), T = 1.5 * L / v, d = u => L * lisse(clamp((u - t0) / T));
  const s = d(t), vit = (d(t + 0.04) - d(t - 0.04)) / 0.08;
  const [x, z] = sur(pts, s);
  let c = cap(pts, s, L);
  if (cap0 !== null) c = cap0 + angle(c - cap0) * lisse(clamp(s / 0.5));
  b.position.x = x; b.position.z = z; b.rotation.y = c;
  b.animer(t, clamp(vit / 0.35), { d: s, tete });
  return b;
}
const versLui = (b, x, z) => clamp(angle(Math.atan2(-(z - b.position.z), x - b.position.x) - b.rotation.y), -1.2, 1.2);
function parcours(t, t0, t1, v = VITESSE_MARCHE, stop = 0.7) {
  const F = t1 - stop;
  if (t < t0) return 0;
  if (t < F) return v * (t - t0);
  const x = Math.min(1, (t - F) / stop);
  return v * (F - t0 + stop * (x - x ** 3 + x ** 4 / 2));
}
const oeil = new THREE.Vector3();
function yeux(b, k, r = 16) {
  if (k <= 0) return;
  for (const e of b.yeux) { e.getWorldPosition(oeil); lueurs(st.projeter(oeil), k, r); }
}
function lueurs(s, k, r) {
  const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
  g.addColorStop(0, `rgba(255,226,140,${k})`); g.addColorStop(0.35, `rgba(255,200,90,${0.7 * k})`); g.addColorStop(1, "rgba(255,190,80,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.29); ctx.fill();
}

// ---------------------------------------------------------------- people
function note(s, x, y, p, { size = 56, color = INK, align = "center" } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.font = `${size}px Caveat`;
  const w = ctx.measureText(s).width, x0 = align === "left" ? x - 22 : x - w / 2 - 22;
  ctx.globalAlpha = 0.86 * clamp(p * 2); ctx.fillStyle = "#FBF8F1";
  ctx.beginPath(); ctx.roundRect(x0, y - size * 0.72, w + 44, size * 1.44, size * 0.45); ctx.fill();
  ctx.restore();
  encre(s, x, y, p, { size, color, align });
}
const vetu = (q, tenue) => habiller(q, TENUES[tenue]);
const gens = (g, role, x, z, graine, tenue, o = {}) => vetu(figure(g, role, x, z, { graine, ...o }), tenue);
const enfant = (g, role, x, z, graine, tenue) => gens(g, role, x, z, graine, tenue, { taille: 0.62 });
/** While its lines are said, a figure talks: the head nods with the words and the right hand moves (call after animer). */
function parle(q, t, ids) {
  let mot = 0, phrase = 0;
  for (const id of [].concat(ids)) {
    const s = R.SEG[id];
    if (!s) continue;
    for (const se of s.sentences) {
      phrase = Math.max(phrase, clamp(Math.min(t - se.start + 0.25, se.end + 0.25 - t) / 0.25));
      for (const w of se.words) mot = Math.max(mot, clamp(Math.min(t - w.s + 0.08, w.e + 0.08 - t) / 0.08));
    }
  }
  const a = q.articulations;
  a.tete.rotation.x += mot * 0.06 * Math.sin(t * 8.5);
  a.tete.rotation.z += phrase * 0.04 * Math.sin(t * 3.1);
  const geste = phrase * (0.55 + 0.45 * Math.sin(t * 2.3));   // the hand goes forward while the sentence lasts
  a.epauleD.rotation.x -= 0.5 * geste; a.coudeD.rotation.x -= 0.6 * geste;
}
const regarde = (q, autre) => tourneVers(q, autre.objet.position.x, autre.objet.position.z);
// turned towards someone, but partly towards us, as on a stage: both faces can be seen
function face(q, autre, k = 0.5) { regarde(q, autre); q.objet.rotation.y = angle(q.objet.rotation.y) * (1 - k); }

// ---------------------------------------------------------------- 1764: something in the woods (night, moon, mist)
plateau("hook", g => {
  campagne(g, [[-1.6, -1.2, 2.8], [1.9, -1.0, 2.6], [-0.8, -3.4, 3], [1.6, -4.0, 2.7], [-2.6, -2.6, 2.9], [2.9, -2.9, 3.1], [-0.9, -5.7, 3.2], [-3.6, -0.4, 2.5], [3.6, -0.6, 2.4], [-2.4, -6.6, 2.8], [2.2, -6.2, 3]], { collines: false });
  const b = bete(g, 0.45, -6.2);
  const k = t => fenetre(t, -1, 0.5);
  return {
    fond: () => ciel("nuit"),
    update(t) {
      const tr = revele("hook", 3);
      eclaire("nuit"); regard(b, k(t));
      marcher(b, t, 0.5, [[0.45, -6.2], [0.45, -2.4]], { v: 0.85, tete: [0, 0.1 * fenetre(t, tr - 0.7, 0.7)] });
      const zt = b.position.z + 0.55;
      const c = plans(t, [
        [-1, glisse({ pos: [0.3, 1.3, 6.6], cible: [0.45, 0.8, -2.6] }, { pos: [0.35, 1.22, 5.9], cible: [0.45, 0.8, -2.6] })],
        [wt("hook", "mystérieuse", 2.4) - 0.1, () => ({ fov: 28, pos: [0.95, 0.8, zt + 3.0], cible: [0.45, 0.78, zt - 0.2] })],
        [wt("hook", "Et", 5.2), glisse({ pos: [0.4, 1.15, 5.3], cible: [0.45, 0.8, -2.6] }, { pos: [0.45, 1.05, 4.4], cible: [0.45, 0.8, -2.6] })],
      ]);
      return { ...c, sombre: 0.9, lumieres: true, focus: [0.45, -2.6] };
    },
    over(t) {
      const tr = revele("hook", 3);
      brume(0.14, 1250);
      yeux(b, k(t), 20);
      chalk("1764", W / 2, 420, prog(t, 0, 0.7) * (1 - prog(t, tr - 0.4, tr)), { size: 110 });
      tampon("LA BÊTE", 400, prog(t, tr + 0.1, tr + 0.9), { size: 150 });
      tampon("DU GÉVAUDAN", 540, prog(t, tr + 0.4, tr + 1.2), { size: 90, color: OR });
    },
  };
});

// ---------------------------------------------------------------- the Gévaudan: mountains, stone villages, children with the flocks
plateau("lieu", g => {
  campagne(g, [...foret(-4.5, -6, 14, 3, 5), ...foret(5, -8, 10, 2.5, 9)]);
  [[-9.5, -25, 0.5], [-5.2, -26.5, -0.2], [-1.0, -25.6, 0.3], [3.2, -27.2, -0.4]].forEach(([x, z, r], i) => poser(g, D.maison({ etage: i % 2 === 0 }), x, z, r));
  poser(g, D.eglise(), -3.2, -32, 0.2);
  [[3.6, -3.6, 0.7, 2], [-3.0, -2.8, 0.6, 5], [4.6, 0.6, 0.5, 7]].forEach(([x, z, s, n]) => poser(g, D.rocher(s, n), x, z));
  const moutons = [[-0.4, -1.2], [0.5, -1.6], [1.4, -0.9], [-1.3, -2.1], [2.1, -2.4], [0.2, -3]].map(([x, z], i) => poser(g, D.mouton(), x, z, i * 1.3));
  const p1 = enfant(g, "sujet", -1.1, 0.4, 3, "berger"), p2 = enfant(g, "foule", 2.4, -0.4, 4, "bergere");
  for (const p of [p1, p2]) p.articulations.mainD.add(D.baton(1.0));
  tourneVers(p2, 0.6, -1.6);
  return {
    fond: () => ciel("jour"),
    update(t) {
      eclaire("jour");
      moutons.forEach((m, i) => (m.rotation.y = i * 1.3 + 0.15 * Math.sin(t * 0.5 + i)));
      p1.regarder(0.4, -0.2).animer(t); p2.animer(t);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.6, 5.5, 13], cible: [0.4, 0.6, -2], fov: 32 }, { pos: [0.2, 5.0, 11.6], cible: [0.3, 0.8, -3], fov: 32 })],
        [wt("lieu", "montagnes", 3) - 0.25, glisse({ pos: [1.2, 2.5, 8.2], cible: [-4, 2.3, -20], fov: 34 }, { pos: [0.2, 2.4, 7.8], cible: [-5, 2.3, -20], fov: 34 })],
        [wt("lieu", "enfants", 5.6) - 0.25, glisse({ pos: [-0.3, 1.3, -2.4], cible: [2.3, 0.85, -0.45] }, { pos: [-0.1, 1.28, -2.3], cible: [2.3, 0.85, -0.45] })],
        [wt("lieu", "souvent", 7.6) - 0.3, glisse({ pos: [-0.55, 1.3, 3.7], cible: [-1.0, 0.78, 0.2] }, { pos: [-0.7, 1.2, 3.1], cible: [-1.0, 0.75, 0.2] })],
      ]), lumieres: true };
    },
    over(t) {
      const tl = wt("lieu", "Lozère", 2.5), tm = wt("lieu", "montagnes", 4), tf = wt("lieu", "forêts", 5), tv = wt("lieu", "villages", 5.6), ts = wt("lieu", "seuls", 8);
      const fin = 1 - prog(t, ts - 2.2, ts - 1.9);
      note("Gévaudan = l'actuelle Lozère", W / 2, 400, prog(t, tl - 0.6, tl + 0.4) * fin, { size: 62 });
      note("montagnes", 250, 540, prog(t, tm, tm + 0.4) * fin, { size: 54 });
      note("forêts", 800, 580, prog(t, tf, tf + 0.4) * fin, { size: 54 });
      note("villages de pierre", 330, 680, prog(t, tv, tv + 0.4) * fin, { size: 54 });
      const a = auDessus(p1, 0.1);
      note("souvent seul", a.x + 120, a.y - 180, prog(t, ts - 0.2, ts + 0.4), { size: 62, align: "left" });
    },
  };
});

// ---------------------------------------------------------------- the question (dusk at the edge of the wood)
plateau("question", g => {
  campagne(g, [[-1.4, -0.9, 2.7], [1.9, -0.7, 2.6], [0.2, -3.4, 3], [-2.4, -2.9, 2.9], [2.9, -3.3, 3.1], [-0.9, -4.8, 3.2], [1.6, -5.2, 2.8]], { collines: false });
  const b = bete(g, 2.4, -2.1);
  const k = t => 0.75 * fenetre(t, S("question") + 0.4, 1);
  return {
    fond: () => ciel("crepuscule"),
    update(t) {
      eclaire("crepuscule"); regard(b, k(t));
      const tq = wt("question", "quoi", 1.5), p = easeInOut(prog(t, S("question") - 0.2, E("question")));
      const cam = [lerp(-0.4, -0.1, p), 1.4, lerp(6.4, 5.4, p)];
      marcher(b, t, S("question") + 0.1, [[2.4, -2.1], [0.5, -2.0]], { v: 1.0, tete: [versLui(b, cam[0], cam[2]) * fenetre(t, tq - 0.3, 0.7), 0] });
      return { fov: 30, pos: cam, cible: [0.4, 1.0, -1.6], sombre: 0.5, lumieres: true };
    },
    over(t) {
      const tq = wt("question", "quoi", 1.5);
      yeux(b, k(t), 16);
      note("c'était quoi,", W / 2, 400, prog(t, tq - 0.4, tq + 0.3), { size: 78 });
      note("vraiment, la Bête ?", W / 2, 510, prog(t, tq + 0.2, tq + 1.0), { size: 78, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- 30 June 1764: a hamlet among the fields
plateau("attaques", g => {
  campagne(g, foret(-4.5, -9, 10, 2.5, 2), { sol: "#8E9364" });
  const ch = D.champs(16, 6); ch.position.set(1, 0, -6.5); g.add(ch);
  poser(g, D.maison({ etage: true }), 3.6, -3.6, -0.35); poser(g, D.maison(), -4.2, -4.0, 0.3);
  poser(g, D.muret(3.0), -0.4, -1.9); poser(g, D.bande(20, 1.2), 0, 1.9);
  const vill = [[-1.0, -0.3, "foule", 1], [0, 0, "foule", 1], [1.0, -0.3, "foule", 1], [-0.5, 0.8, "foule", 0.62], [0.5, 0.8, "sujet", 0.62]]
    .map(([x, z, r, s], i) => gens(g, r, x, z, 21 + i, s < 1 ? (i % 2 ? "bergere" : "berger") : (i % 2 ? "paysanne" : "paysan"), { taille: s }));
  return {
    fond: () => ciel("gris"),
    update(t) {
      eclaire("gris");
      vill.forEach((q, i) => q.transitionPose("debout", "teteBaissee", fenetre(t, S("attaques") + 0.6 + i * 0.1, 0.8)).expression("tristesse", fenetre(t, S("attaques") + 1 + i * 0.1, 0.8)).animer(t));
      return { ...plans(t, [
        [-1, glisse({ pos: [0.4, 1.5, 8.8], cible: [0, 1.05, 0] }, { pos: [0.25, 1.48, 8.3], cible: [0, 1.05, 0] })],
        [wt("attaques", "jeune", 2.7) - 0.3, glisse({ pos: [0.4, 1.45, 3.9], cible: [0, 1.42, 0] }, { pos: [0.33, 1.45, 3.5], cible: [0, 1.42, 0] })],
        [wt("attaques", "Puis", 6.8) - 0.1, glisse({ pos: [1.8, 3.6, 6.5], cible: [0, 0.8, 0] }, { pos: [1.2, 3.4, 6.0], cible: [0, 0.8, 0] })],
      ]), sombre: 0.3, lumieres: true, focus: [0, 0.2] };
    },
    over(t) {
      const tj = wt("attaques", "juin", 1), to = wt("attaques", "officielle", 4), tm = wt("attaques", "multiplient", 7.5);
      note("30 juin 1764", W / 2, 390, prog(t, tj - 0.4, tj + 0.4), { size: 74 });
      note("1re victime officielle", W / 2, 490, prog(t, to - 0.4, to + 0.5), { size: 56 });
      note("les attaques se multiplient", W / 2, 590, prog(t, tm - 0.3, tm + 0.5), { size: 54, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- at the wash-house, two women talk
plateau("lavoir", g => {
  campagne(g, foret(7, -12, 8, 2.5, 3), { sol: "#8F9868" });
  poser(g, D.lavoir(), 0, -0.6);
  poser(g, D.maison({ etage: true }), -4.6, -4.8, 0.35); poser(g, D.maison(), 4.4, -5.2, -0.3); poser(g, D.fontaine(), -3.2, -1.2);
  poser(g, D.feuillu(4.2, "#6E8F4A", 2), 5.4, -0.6);
  const A = gens(g, "foule", -0.75, 1.05, 101, "paysanne"), B = gens(g, "sujet", 0.7, 1.15, 102, "bergere");
  face(A, B); face(B, A);
  return {
    fond: () => ciel("jour"),
    update(t) {
      eclaire("jour");
      const peur = fenetre(t, S("lavoir2") - 0.2, 0.6);
      A.expression("peur", fenetre(t, S("lavoir1") + 0.4, 0.6) * (1 - fenetre(t, S("lavoir3"), 0.5)) + 0).animer(t); parle(A, t, ["lavoir1", "lavoir3"]);
      B.expression("peur", peur).animer(t + 1.3); parle(B, t, "lavoir2");
      return { ...plans(t, [
        [-1, glisse({ pos: [0.05, 1.7, 8.4], cible: [0, 1.3, 0.3] }, { pos: [0.0, 1.68, 7.8], cible: [0, 1.3, 0.3] })],
        [S("lavoir2") - 0.1, glisse({ pos: [0.15, 1.6, 4.1], cible: [0.7, 1.45, 1.15] }, { pos: [0.2, 1.6, 3.8], cible: [0.7, 1.45, 1.15] })],
        [S("lavoir3") - 0.1, glisse({ pos: [-0.2, 1.6, 4.1], cible: [-0.75, 1.45, 1.05] }, { pos: [-0.25, 1.6, 3.8], cible: [-0.75, 1.45, 1.05] })],
      ]), lumieres: true, focus: [0, 0.4] };
    },
  };
});

// ---------------------------------------------------------------- the toll, in front of the church
plateau("bilan", g => {
  campagne(g, [], { sol: "#8A8E70", collines: true });
  poser(g, D.eglise(), 0, -5.2);
  poser(g, D.maison({ etage: true }), -5.4, -3.6, 0.45); poser(g, D.maison(), 5.2, -3.2, -0.45);
  poser(g, D.bande(14, 2.2, "#9A9284"), 0, -1.0).rotation.z = Math.PI / 2;
  const vill = [[-1.5, 0.2, "foule", 1, "paysan"], [-0.5, -0.1, "foule", 1, "paysanne"], [0.5, 0.2, "foule", 1, "paysan"], [1.5, -0.1, "foule", 1, "paysanne"], [-0.95, 1.1, "foule", 0.62, "bergere"], [0.05, 1.2, "sujet", 0.62, "berger"], [1.05, 1.1, "foule", 0.62, "bergere"]]
    .map(([x, z, r, s, tenue], i) => gens(g, r, x, z, 111 + i, tenue, { taille: s }));
  return {
    fond: () => ciel("gris", "crepuscule", 0.35),
    update(t) {
      eclaire("gris", "crepuscule", 0.35);
      vill.forEach((q, i) => q.pose("teteBaissee").expression("tristesse").animer(t + i));
      return { ...plans(t, [
        [-1, glisse({ pos: [0, 1.8, 9.6], cible: [0, 2.4, -2] }, { pos: [0, 1.75, 9.0], cible: [0, 2.3, -2] })],
        [wt("bilan", "surtout", 3.2) - 0.25, glisse({ fov: 34, pos: [0, 1.1, 5.6], cible: [0, 0.85, 1.1] }, { fov: 34, pos: [0, 1.05, 5.2], cible: [0, 0.85, 1.1] })],
      ]), sombre: 0.3, lumieres: true, focus: [0, 0] };
    },
    over(t) {
      const tq = wt("bilan", "quatre-vingts", 1.2), te = wt("bilan", "enfants", 3.6);
      tampon("+ DE 80", 420, prog(t, tq - 0.1, tq + 0.7), { size: 140 });
      note("personnes tuées en 3 ans", W / 2, 540, prog(t, tq + 0.4, tq + 1.2), { size: 56 });
      note("surtout des enfants et des femmes", W / 2, 630, prog(t, te - 0.5, te + 0.6), { size: 50 });
    },
  };
});

// ---------------------------------------------------------------- a farm: a shepherd who saw it
plateau("temoins", g => {
  g.add(D.piece({ w: 6.5, d: 5, h: 3.2, fenetres: [["fond", -1.7, 1.1, 0.9, 1.0], ["gauche", -0.4, 1.1, 0.9, 1.0]] }));
  const t0 = D.table(1.6, 0.8, 0.74, "#7A5A3E"); t0.position.set(0.6, 0, -0.8); g.add(t0);
  poser(g, D.banc(1.4), 0.6, -1.5); poser(g, D.tonneau(), -2.75, -1.75); poser(g, D.tonneau(), -1.95, -2.15);
  const pierres = D.muret(1.6); pierres.scale.set(1, 2, 1.1); pierres.position.set(2.2, 0, -2.25); g.add(pierres);   // the hearth (no fire)
  const ouverture = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: "#1C1A18" })); ouverture.position.set(2.2, 0.45, -1.99); g.add(ouverture);
  const berger = gens(g, "sujet", -0.7, 0.4, 121, "berger"), femme = gens(g, "foule", 0.95, 0.6, 122, "paysanne"), homme = gens(g, "foule", 0.25, -2.05, 123, "paysan");
  face(berger, femme); face(femme, berger); tourneVers(homme, -0.7, 0.4);
  return {
    fond: salle("#2E2924"),
    update(t) {
      eclaire("dedans");
      berger.expression("peur", fenetre(t, S("temoin1"), 0.5)).animer(t); parle(berger, t, "temoin1");
      femme.expression("choc", fenetre(t, wt("temoin1", "énorme", 2) - 0.2, 0.5)).animer(t + 2); homme.animer(t + 4);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.15, 1.8, 7.8], cible: [0.1, 1.3, -0.6] }, { pos: [0.1, 1.75, 7.2], cible: [0.1, 1.3, -0.6] })],
        [S("temoin1") - 0.1, glisse({ pos: [-0.15, 1.6, 3.4], cible: [-0.7, 1.5, 0.4] }, { pos: [-0.2, 1.6, 3.1], cible: [-0.7, 1.5, 0.4] })],
      ]), sombre: 0.15, lumieres: true, focus: [0.2, -0.4] };
    },
  };
});

// ---------------------------------------------------------------- the portrait, drawn from what the witnesses said
plateau("portrait", g => {
  const b = bete(g, 0, 0, { taille: 1 });
  const ici = new THREE.Vector3();
  const pt = r => { b.reperes[r].getWorldPosition(ici); return st.projeter(ici); };
  return {
    fond: () => {
      ctx.fillStyle = "#EFE3C8"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(90,70,40,.5)"; ctx.lineWidth = 6; ctx.strokeRect(50, 300, W - 100, 1260); ctx.lineWidth = 2; ctx.strokeRect(66, 316, W - 132, 1228);
    },
    update(t) {
      eclaire("jour");
      const p = easeInOut(prog(t, S("temoin2") - 0.2, E("temoin2")));
      b.rotation.y = lerp(-1.0, -0.72, p);
      b.animer(t, 0, { tete: [-0.1, 0.04] }); regard(b, 0);
      return { fov: 30, pos: [lerp(0.45, 0.3, p), lerp(1.75, 1.65, p), lerp(6.1, 5.7, p)], cible: [0.1, 0.62, 0], lumieres: true };
    },
    over(t) {
      const tt = wt("temoin2", "tête", 0.4), tp = wt("temoin2", "poitrail", 1.3), tv = wt("temoin2", "ventre", 2), tr = wt("temoin2", "raie", 2.8);
      chalk("LA BÊTE, d'après les témoins", W / 2, 400, prog(t, S("temoin2"), S("temoin2") + 0.8), { size: 60, color: INK });
      const trait = (r, s, x, y, t0, o = {}) => {
        const a = pt(r), q = prog(t, t0 - 0.2, t0 + 0.4);
        if (q <= 0) return;
        chalkArrow(x, y + (a.y > y ? 40 : -40), a.x, a.y, q, { bend: o.bend ?? 0.2, width: 6, color: INK });
        note(s, x, y, q, { size: 52, color: o.color || INK });
      };
      trait("tete", "grosse tête", 900, 590, tt, { bend: 0.3 });
      trait("poitrail", "large poitrail", 820, 1180, tp, { bend: -0.2 });
      trait("ventre", "ventre clair", 380, 1300, tv);
      trait("dos", "raie noire sur le dos", 330, 650, tr, { color: ROUGE, bend: -0.25 });
    },
  };
});

// ---------------------------------------------------------------- the inn, at night: the rumours (a shadow grows on the wall)
const RUMEURS = ["rumeur1", "rumeur2", "rumeur3", "rumeur4"];
plateau("auberge", g => {
  g.add(D.piece({ w: 7, d: 5.5, h: 3.3, mur: "#B39F82", sol: "#6A5442", fenetres: [["fond", -2.3, 1.2, 0.8, 0.9], ["fond", 2.3, 1.2, 0.8, 0.9]], nuit: true }));
  const tb = D.table(2.4, 0.9, 0.76, "#6B4A33"); tb.position.set(0, 0, -0.6); g.add(tb);
  poser(g, D.banc(2.0), 0, -1.35); poser(g, D.tonneau(), -2.95, -2.1); poser(g, D.tonneau(), -2.15, -2.35); poser(g, D.tonneau(), 2.9, -2.2);
  const aubergiste = gens(g, "autre", -1.3, 0.35, 131, "paysan"), client = gens(g, "sujet", 1.3, 0.3, 132, "berger"),
    cliente = gens(g, "foule", 0.45, -1.95, 133, "paysanne"), voisin = gens(g, "foule", -0.65, -2.0, 134, "paysan");
  [cliente, voisin].forEach(q => tourneVers(q, 0, -0.6)); face(aubergiste, client, 0.45); face(client, aubergiste, 0.45);
  // the shadow on the wall grows with every rumour
  const taille = t => 0.42 + 0.14 * RUMEURS.reduce((a, id) => a + fenetre(t, S(id) + 0.3, 0.8), 0);
  return {
    fond: salle("#1E1A16"),
    update(t) {
      eclaire("soir");
      aubergiste.animer(t); parle(aubergiste, t, ["rumeur1", "rumeur4"]);
      client.animer(t + 1); parle(client, t, "rumeur2");
      cliente.expression("doute", fenetre(t, S("rumeur3") - 0.2, 0.5)).animer(t + 2); parle(cliente, t, "rumeur3");
      voisin.expression("peur", fenetre(t, S("rumeur1") + 0.5, 0.6)).animer(t + 3);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.3, 1.9, 6.6], cible: [0, 1.3, -0.8] }, { pos: [0.25, 1.85, 6.0], cible: [0, 1.3, -0.8] })],
        [S("rumeur1") - 0.1, glisse({ pos: [-0.35, 1.6, 3.3], cible: [-1.3, 1.5, 0.35] }, { pos: [-0.4, 1.6, 3.05], cible: [-1.3, 1.5, 0.35] })],
        [S("rumeur2") - 0.1, glisse({ pos: [0.35, 1.6, 3.3], cible: [1.3, 1.5, 0.3] }, { pos: [0.4, 1.6, 3.05], cible: [1.3, 1.5, 0.3] })],
        [S("rumeur3") - 0.1, glisse({ pos: [0.6, 1.7, 2.7], cible: [0.45, 1.45, -1.95] }, { pos: [0.55, 1.7, 2.45], cible: [0.45, 1.45, -1.95] })],
        [S("rumeur4") - 0.1, glisse({ pos: [0, 1.6, 6.0], cible: [0, 1.7, -1.5] }, { pos: [0, 1.6, 5.4], cible: [0, 1.7, -1.5] })],
      ]), sombre: 0.35, lumieres: true, focus: [0, -0.8] };
    },
    over(t) {
      // the shadow is on the wall: seen in the wide shots only, never over a face in a close-up
      const large = 1 - fenetre(t, S("rumeur1") - 0.25, 0.3) + fenetre(t, S("rumeur4") - 0.25, 0.3);
      ombreBete(W / 2 + 40, 640, taille(t), 0.46 * fenetre(t, S("auberge") + 0.8, 1.2) * large, 0.75);
      const lignes = [["rumeur1", "plus rapide qu'un cheval", INK], ["rumeur2", "les balles ne lui font rien", INK], ["rumeur3", "une hyène ?", ROUGE], ["rumeur4", "un sorcier ?", ROUGE]];
      lignes.forEach(([id, s, c], i) => note(s, i % 2 ? 760 : 320, 400 + i * 95, prog(t, S(id) + 0.3, S(id) + 0.9), { size: 46, color: c }));
    },
  };
});

// ---------------------------------------------------------------- a printing shop: the serial
function journal(x, y, s, rot, p, titre) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * easeOutBack(clamp(p), 1.6), s * easeOutBack(clamp(p), 1.6)); ctx.globalAlpha = clamp(p * 2);
  ctx.fillStyle = "#F5F0E4"; ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 18; ctx.fillRect(-150, -200, 300, 400); ctx.shadowColor = "transparent";
  ctx.fillStyle = "#2A2C33"; ctx.fillRect(-130, -180, 260, 8);
  txt(titre, 0, -120, titre.length > 9 ? 34 : 44, "MontX", "#2A2C33");
  ctx.fillStyle = "rgba(42,44,51,.35)";
  for (let k = 0; k < 9; k++) ctx.fillRect(-120, -60 + k * 26, k % 3 === 2 ? 150 : 240, 9);
  ctx.restore();
}
plateau("journaux", g => {
  g.add(D.piece({ w: 7, d: 5.5, h: 3.4, mur: "#C2B59C", fenetres: [["gauche", -0.6, 1.1, 1.0, 1.2], ["fond", 2.0, 1.1, 1.0, 1.2]] }));
  poser(g, D.presse(), 0, -1.1);
  [[-2.4, -2.55], [-0.4, -2.55]].forEach(([x, z], i) => poser(g, D.etagere(1.7, 2.2, 7 + i), x, z));
  const s1 = D.sechoir(-3.2, 3.2, 2.75, 12); s1.position.z = 0.2; g.add(s1);
  const s2 = D.sechoir(-3.2, 3.2, 2.75, 12); s2.position.z = -1.9; g.add(s2);
  const imprimeur = gens(g, "sujet", -1.2, -0.1, 141, "imprimeur"), aide = gens(g, "foule", 1.7, -0.6, 142, "imprimeur");
  tourneVers(imprimeur, 0, -1.0); tourneVers(aide, 0.2, 0.6);
  return {
    fond: salle("#2E2924"),
    update(t) {
      eclaire("dedans");
      imprimeur.pose("pointer", 0.6 + 0.4 * Math.sin(t * 2)).animer(t);
      aide.pose("mainLevee", 0.7).animer(t + 1);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.6, 1.75, 6.4], cible: [0, 1.5, -1] }, { pos: [0.5, 1.8, 5.9], cible: [0, 1.5, -1] })],
        [wt("journaux", "Courrier", 2.6) - 0.5, glisse({ pos: [0.9, 1.6, 2.4], cible: [-0.5, 1.2, -0.6] }, { pos: [0.8, 1.6, 2.2], cible: [-0.5, 1.2, -0.6] })],
        [wt("journaux", "exagère", 5.2) - 0.5, glisse({ pos: [0.2, 1.9, 6.8], cible: [0, 1.6, -0.8] }, { pos: [0.1, 1.95, 7.2], cible: [0, 1.6, -0.8] })],
      ]), sombre: 0.15, lumieres: true, focus: [0, -0.6] };
    },
    over(t) {
      const tc = wt("journaux", "Courrier", 2.6), tf = wt("journaux", "feuilleton", 4.4), tx = wt("journaux", "exagère", 5.4), tr = wt("journaux", "recopient", 7);
      note("Courrier d'Avignon", W / 2, 1380, prog(t, tc - 0.2, tc + 0.6) * (1 - prog(t, tf - 0.5, tf - 0.2)), { size: 60 });
      note("un feuilleton, qui exagère tout", W / 2, 1380, prog(t, tf - 0.2, tf + 0.6), { size: 56 });
      journal(W / 2, 520, 0.6, 0.06, prog(t, tx - 0.3, tx + 0.3) * (1 - prog(t, tr - 0.3, tr)), "LA BÊTE !");
      for (let k = 0; k < 8; k++) journal(150 + (k % 4) * 260, 420 + Math.floor(k / 4) * 230, 0.36, (k % 3 - 1) * 0.12, prog(t, tr - 0.3 + k * 0.12, tr + k * 0.12), k % 2 ? "LE MONSTRE" : "LA BÊTE !");
    },
  };
});

// ---------------------------------------------------------------- a Paris café: two readers
plateau("cafe", g => {
  g.add(D.piece({ w: 6.5, d: 5, h: 3.6, mur: "#7E8E7A", sol: "#5C4234", poutres: "#E8E0CF", fenetres: [["gauche", -0.3, 0.9, 1.0, 1.9]] }));
  [[-1.6, 1.4, 0.9, 0.7, "#8C6A4A"], [0.2, 1.3, 1.2, 0.9, "#6E7F96"], [1.9, 1.5, 0.7, 0.9, "#9A5A4A"]].forEach(([x, y, w, h, c]) => { const k = D.cadre(w, h, c); k.position.set(x, y, -2.4); g.add(k); });
  const m = D.cadre(1.0, 1.9, "miroir"); m.rotation.y = -Math.PI / 2; m.position.set(3.15, 0.8, -0.6); g.add(m);
  poser(g, D.gueridon(0.42), 0, -0.3); poser(g, D.gueridon(0.42), -2.3, -1.6); poser(g, D.gueridon(0.42), 2.2, -1.8);
  const feuille = D.gazette(); feuille.position.set(0, 0.76, -0.3); feuille.rotation.y = 0.3; g.add(feuille);
  const ca_ = creerChaise({ couleur: "#6B4A33" }), cb_ = creerChaise({ couleur: "#6B4A33" });
  ca_.position.set(-1.05, 0, -0.15); ca_.rotation.y = Math.PI / 2 - 0.5; cb_.position.set(1.05, 0, -0.15); cb_.rotation.y = -Math.PI / 2 + 0.5; g.add(ca_, cb_);
  const lectrice = gens(g, "sujet", -1.05, -0.15, 151, "dame"), lecteur = gens(g, "autre", 1.05, -0.15, 152, "courtisan");
  lectrice.objet.rotation.y = Math.PI / 2 - 0.5; lecteur.objet.rotation.y = -Math.PI / 2 + 0.5;
  const garcon = gens(g, "foule", -2.0, -0.4, 153, "imprimeur"); tourneVers(garcon, 0, -0.3);
  return {
    fond: salle("#2A2622"),
    update(t) {
      eclaire("dedans");
      lectrice.pose("assis").expression("choc", fenetre(t, S("paris1") + 0.3, 0.5)).animer(t); parle(lectrice, t, "paris1");
      lecteur.pose("assis").expression("colere", fenetre(t, S("paris2") + 0.3, 0.5)).animer(t + 1); parle(lecteur, t, "paris2");
      garcon.animer(t + 2);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.2, 1.85, 7.8], cible: [0, 1.0, -0.4] }, { pos: [0.15, 1.8, 7.2], cible: [0, 1.0, -0.4] })],
        [S("paris1") + 0.9, glisse({ pos: [0.9, 1.35, 2.5], cible: [-1.05, 1.15, -0.15] }, { pos: [0.8, 1.35, 2.3], cible: [-1.05, 1.15, -0.15] })],
        [S("paris2") - 0.1, glisse({ pos: [-0.9, 1.35, 2.5], cible: [1.05, 1.15, -0.15] }, { pos: [-0.8, 1.35, 2.3], cible: [1.05, 1.15, -0.15] })],
      ]), sombre: 0.15, lumieres: true, focus: [0, -0.3] };
    },
    over(t) { note("Paris", 220, 400, prog(t, S("paris1"), S("paris1") + 0.6), { size: 60 }); },
  };
});

// ---------------------------------------------------------------- a mountain road: the dragoons search for months
plateau("soldats", g => {
  campagne(g, [...foret(-3, -6, 10, 2.6, 3), ...foret(7, -6.5, 10, 2.6, 8)], { sol: "#8A9064" });
  poser(g, D.bande(40, 2.2, "#A08C6C"), 2, 0);
  [[-2.5, -2.2, 0.8, 3], [1.5, -2.6, 0.6, 4], [5.2, -2.0, 0.9, 6], [8.6, 2.2, 0.7, 2], [-1.0, 2.6, 0.5, 9], [3.6, 2.4, 0.6, 8]].forEach(([x, z, s, n]) => poser(g, D.rocher(s, n), x, z));
  const soldats = [0, 1, 2, 3, 4, 5].map(i => gens(g, "foule", -3.4 + i * 1.0, i % 2 ? -0.42 : 0.42, 161 + i, "soldat"));
  soldats.forEach(q => (q.objet.rotation.y = Math.PI / 2));
  return {
    fond: () => ciel("jour", "gris", 0.4),
    update(t) {
      eclaire("jour", "gris", 0.4);
      const halte = wt("soldats", "Sans", 5) - 0.1, xs = parcours(t, S("soldats") - 0.3, halte);
      soldats.forEach((q, i) => {
        q.objet.position.x = -3.4 + i * 1.0 + xs;
        q.transitionPose("marche", "debout", fenetre(t, halte - 0.7, 0.7)).expression("doute", fenetre(t, halte + 0.2, 0.5)).animer(t + i * 0.3);
      });
      const xc = -0.9 + xs;
      return { ...plans(t, [
        [-1, () => ({ pos: [xc + 0.3, 1.6, 6.2], cible: [xc, 1.0, 0] })],
        [wt("soldats", "montagnes", 3.5) - 0.3, () => ({ fov: 34, pos: [xc + 3, 6.5, 15], cible: [xc + 1, 0.5, -3] })],
        [halte - 0.2, () => ({ pos: [xc + 4.2, 1.5, 3.6], cible: [xc + 1.5, 1.35, 0] })],
      ]), lumieres: true, focus: [xc + 1, 0] };
    },
    over(t) {
      const td = wt("soldats", "dragons", 2.2), ts = wt("soldats", "Sans", 5);
      note("des dragons du roi", W / 2, 420, prog(t, td - 0.3, td + 0.4) * (1 - prog(t, ts - 0.6, ts - 0.3)), { size: 62 });
      note("des mois de battues…", W / 2, 520, prog(t, wt("soldats", "mois", 4.5) - 0.3, wt("soldats", "mois", 4.5) + 0.4) * (1 - prog(t, ts - 0.6, ts - 0.3)), { size: 54 });
      note("sans succès", W / 2, 420, prog(t, ts - 0.1, ts + 0.5), { size: 70, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- Versailles, the throne room: the king sends his hunters
plateau("roi", g => {
  g.add(D.piece({ w: 9, d: 7.5, h: 5, mur: "#7A2A2E", sol: "#D9CBB0", poutres: "#C9A23E", plancher: false }));
  [[-3.4, -3.0], [3.4, -3.0], [-3.4, 0.2], [3.4, 0.2]].forEach(([x, z]) => poser(g, D.colonne(4.8), x, z));
  for (const [x, ry] of [[-4.38, Math.PI / 2], [4.38, -Math.PI / 2]]) for (const z of [-1.4, 1.6]) { const f = D.cadre(1.2, 2.8, "fenetre"); f.rotation.y = ry; f.position.set(x, 1.0, z); g.add(f); }
  const tableau = D.cadre(1.6, 1.1, "#6E5A3A"); tableau.position.set(-2.0, 2.4, -3.6); g.add(tableau);
  const tableau2 = D.cadre(1.6, 1.1, "#4E6A5A"); tableau2.position.set(2.0, 2.4, -3.6); g.add(tableau2);
  poser(g, D.trone(), 0, -2.6);
  const roi = gens(g, "autorite", 0, -0.9, 171, "roi", { accessoires: [] });
  roi.articulations.tete.add(D.couronne());
  const chasseurs = [[-1.2, 1.3], [1.2, 1.4]].map(([x, z], i) => gens(g, "autre", x, z, 172 + i, "chasseur"));
  const courtisan = gens(g, "foule", 2.5, -1.4, 174, "courtisan");
  chasseurs.forEach(c => tourneVers(c, 0, -0.9)); tourneVers(courtisan, 0, -0.9); tourneVers(roi, 0, 1.4);
  return {
    fond: salle("#3A1A1C"),
    update(t) {
      eclaire("dedans");
      roi.pose("pointer", fenetre(t, wt("roi", "envoie", 1.2) + 0.2, 0.6)).animer(t);
      chasseurs.forEach((c, i) => c.animer(t + i)); courtisan.animer(t + 2);
      return { ...plans(t, [
        [-1, glisse({ pos: [0, 2.3, 8.6], cible: [0, 1.7, -1.8] }, { pos: [0, 2.2, 8.0], cible: [0, 1.7, -1.8] })],
        [wt("roi", "Louis", 0.3) - 0.2, glisse({ pos: [0.8, 1.85, 3.0], cible: [0, 1.75, -0.9] }, { pos: [0.75, 1.85, 2.75], cible: [0, 1.75, -0.9] })],
        [wt("roi", "chasseurs", 2) - 0.4, glisse({ pos: [0.2, 1.65, 5.4], cible: [0, 1.35, 1.2] }, { pos: [0.15, 1.65, 5.0], cible: [0, 1.35, 1.2] })],
        [wt("roi", "promet", 2.7) - 0.2, glisse({ pos: [0, 2.2, 8.0], cible: [0, 1.6, -1.2] }, { pos: [0, 2.1, 7.4], cible: [0, 1.6, -1.2] })],
      ]), sombre: 0.1, lumieres: true, focus: [0, -0.2] };
    },
    over(t) {
      const tl = wt("roi", "Louis", 0.3), tp = wt("roi", "récompense", 3.8);
      const a = auDessus(roi, 0.75);
      note("Louis XV", clamp(a.x, 200, W - 200), Math.max(a.y, 420), prog(t, tl + 0.2, tl + 0.7), { size: 62 });
      const pp = prog(t, tp - 0.2, tp + 0.4);
      if (pp > 0) {
        for (let k = 0; k < 6; k++) {
          const c = easeOutBack(prog(t, tp + k * 0.08, tp + 0.3 + k * 0.08), 2);
          if (c <= 0) continue;
          ctx.fillStyle = "#E2B53E"; ctx.strokeStyle = "#9A7420"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(W / 2 + 250, 640 - k * 18, 54 * c, 18 * c, 0, 0, 6.29); ctx.fill(); ctx.stroke();
        }
        note("récompense : 6 000 livres", W / 2 - 80, 540, pp, { size: 60, color: "#7A5A14" });
      }
    },
  };
});

// ---------------------------------------------------------------- January 1765, in the snow: Jacques Portefaix
plateau("heros", g => {
  campagne(g, foret(1.4, -6.6, 12, 2.4, 8), { sol: "#ECEFF1", relief: ["#D9DEE2", "#E4E8EB", "#D3D9DE", "#DDE2E6"], sapin: D.sapinNeige });
  [[-2.8, -2.4, 0.6, 3], [3.6, -1.6, 0.5, 6]].forEach(([x, z, s, n]) => poser(g, D.rocher(s, n), x, z));
  const amis = [[-0.6, -1.0], [0.2, -1.65], [-0.6, 0.05], [0.9, -1.05]].map(([x, z], i) => enfant(g, "foule", x, z, 61 + i, i === 1 ? "bergere" : "berger"));
  const jacques = enfant(g, "sujet", 0.25, -0.55, 3, "berger");
  jacques.articulations.mainD.add(D.baton(1.1));
  amis.slice(0, 3).forEach(a => a.articulations.mainD.add(D.baton(1.0)));
  const b = bete(g, 3.4, 1.3);
  const VIENT = [[3.4, 1.3], [1.05, 0.55]], PART = [[1.05, 0.55], [1.8, 0.95], [3.3, 1.35], [5.8, 1.7]];
  const finVient = cap(VIENT, longueur(VIENT), longueur(VIENT)), NOUS = [0.95, 1.2, 2.7];
  return {
    fond: () => ciel("hiver"),
    update(t) {
      eclaire("hiver");
      const tf = wt("heros", "fuir", 5.7), td = wt("heros", "défend", 6.2), te = wt("heros", "études", 11.4), part = td + 0.5;
      if (t < part) marcher(b, t, wt("heros", "janvier", 1.6), VIENT, { v: 1.3, tete: [0, -0.12 * fenetre(t, tf - 0.5, 0.6)] });
      else marcher(b, t, part, PART, { v: 1.2, cap0: finVient });
      const ensemble = fenetre(t, td - 0.1, 0.6) * (1 - fenetre(t, te - 0.8, 0.6));
      amis.forEach((a, i) => {
        tourneVers(a, b.position.x, b.position.z);
        a.transitionPose("debout", i < 3 ? "mainLevee" : "debout", ensemble)
          .expression("peur", fenetre(t, wt("heros", "janvier", 1.6) + 0.8, 0.6) * (1 - fenetre(t, td + 0.4 + i * 0.1, 0.6))).animer(t + i * 0.7);
      });
      const face = fenetre(t, te - 0.7, 0.7), aLoup = Math.atan2(b.position.x - 0.25, b.position.z + 0.55), aNous = Math.atan2(NOUS[0] - 0.25, NOUS[2] + 0.55);
      jacques.objet.rotation.y = aLoup + angle(aNous - aLoup) * face;
      jacques.transitionPose("debout", "mainLevee", fenetre(t, tf - 0.2, 0.6) * (1 - face)).expression("joie", fenetre(t, te, 0.5)).animer(t);
      const large = glisse({ pos: [1.75, 2.0, 7.3], cible: [0.4, 0.6, -0.4] }, { pos: [1.6, 1.95, 6.9], cible: [0.4, 0.6, -0.4] });
      return { ...plans(t, [
        [-1, large],
        [wt("heros", "Jacques", 3.5) - 0.2, glisse({ pos: [0.75, 1.05, 1.6], cible: [0.25, 0.98, -0.55] }, { pos: [0.72, 1.05, 1.45], cible: [0.25, 0.98, -0.55] })],
        [wt("heros", "refuse", 5.2) - 0.15, glisse({ pos: [-1.4, 0.95, 1.15], cible: [0.5, 0.8, 0.38] }, { pos: [-1.3, 0.95, 1.08], cible: [0.5, 0.8, 0.38] })],
        [td - 0.1, large],
        [wt("heros", "Bête", 8.1) - 0.3, glisse({ fov: 32, pos: [-1.6, 2.1, -3.0], cible: [2.4, 0.5, 0.9] }, { fov: 32, pos: [-1.5, 2.05, -2.85], cible: [2.7, 0.5, 1.0] })],
        [te - 0.8, glisse({ pos: NOUS, cible: [0.25, 0.9, -0.55] }, { pos: [0.9, 1.15, 2.4], cible: [0.25, 0.92, -0.55] })],
      ]), lumieres: true, focus: [0.4, -0.4] };
    },
    over(t) {
      const tj = wt("heros", "Portefaix", 4), td = wt("heros", "défend", 6.2), te = wt("heros", "études", 11.4), tn = wt("heros", "janvier", 1.6);
      note("janvier 1765", W / 2, 400, prog(t, tn - 0.2, tn + 0.5) * (1 - prog(t, tj - 0.8, tj - 0.5)), { size: 64 });
      note("Jacques Portefaix, 12 ans", W / 2, 400, prog(t, tj - 0.2, tj + 0.6) * (1 - prog(t, te - 0.9, te - 0.6)), { size: 60 });
      note("ensemble, les enfants font face", W / 2, 500, prog(t, td - 0.1, td + 0.6) * (1 - prog(t, te - 0.9, te - 0.6)), { size: 52 });
      note("études payées par le roi", W / 2, 420, prog(t, te - 0.3, te + 0.6), { size: 56, color: VERT });
    },
  };
});

// ---------------------------------------------------------------- August 1765, by a river: Marie-Jeanne Valet
plateau("valet", g => {
  campagne(g, [], { sol: "#86985E" });
  const eau = D.bande(40, 2.4, "#6F98AC", { roughness: 0.12, metalness: 0.25 }); eau.position.set(0, 0.008, -2.2); g.add(eau);
  const berge = D.bande(40, 0.5, "#8A7A5E"); berge.position.set(0, 0.007, -0.85); g.add(berge);
  [[-3.2, -4.6, "#5E8A44", 1], [-0.6, -5.2, "#6E9A4E", 2], [2.4, -4.8, "#56803E", 3], [5.0, -5.4, "#6A8F48", 4], [-5.4, -1.0, "#5E8A44", 5]].forEach(([x, z, c, n]) => poser(g, D.feuillu(4.4, c, n), x, z));
  [[-1.6, -1.15, 0.35, 2], [0.4, -1.25, 0.3, 5], [2.6, -1.1, 0.4, 8], [-3.8, -1.2, 0.3, 3]].forEach(([x, z, s, n]) => poser(g, D.rocher(s, n), x, z));
  const mj = gens(g, "sujet", -0.4, 0.5, 181, "paysanne", { taille: 0.92 }), soeur = gens(g, "foule", -1.4, 1.0, 182, "bergere", { taille: 0.85 });
  const lance = D.baton(2.0); mj.articulations.mainD.add(lance);
  const b = bete(g, 3.6, -0.1);
  const VIENT = [[3.6, -0.1], [1.25, 0.25]], PART = [[1.25, 0.25], [2.0, 0.6], [3.4, 0.5], [6.4, 0.3]];
  const finVient = cap(VIENT, longueur(VIENT), longueur(VIENT));
  return {
    fond: () => ciel("jour"),
    update(t) {
      eclaire("jour");
      const tm = wt("valet", "Marie-Jeanne", 3), tr = wt("valet", "repousse", 5), part = tr + 0.9;
      if (t < part) marcher(b, t, S("valet") + 0.6, VIENT, { v: 1.1, tete: [versLui(b, -0.4, 0.5) * 0.5, -0.1] });
      else marcher(b, t, part, PART, { v: 1.2, cap0: finVient });
      tourneVers(mj, b.position.x, b.position.z); tourneVers(soeur, b.position.x, b.position.z);
      mj.transitionPose("debout", "pointer", fenetre(t, tr - 0.3, 0.5)).expression("colere", fenetre(t, tr - 0.2, 0.5)).animer(t);
      soeur.expression("peur", fenetre(t, S("valet") + 1.5, 0.6)).animer(t + 1);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.2, 2.0, 9.4], cible: [0.3, 0.8, -0.4] }, { pos: [0.2, 1.95, 8.8], cible: [0.3, 0.8, -0.4] })],
        [tm - 0.2, glisse({ pos: [1.6, 1.45, 2.7], cible: [-0.4, 1.25, 0.5] }, { pos: [1.5, 1.45, 2.5], cible: [-0.4, 1.25, 0.5] })],
        [tr - 0.3, glisse({ pos: [0.6, 1.7, 5.6], cible: [0.5, 0.85, 0.2] }, { pos: [0.6, 1.65, 5.2], cible: [0.6, 0.85, 0.2] })],
      ]), lumieres: true, focus: [0.4, 0] };
    },
    over(t) {
      const ta = wt("valet", "août", 0.3), tm = wt("valet", "Marie-Jeanne", 3);
      note("août 1765", W / 2, 400, prog(t, ta - 0.2, ta + 0.5) * (1 - prog(t, tm - 0.6, tm - 0.3)), { size: 64 });
      note("Marie-Jeanne Valet, 20 ans", W / 2, 400, prog(t, tm - 0.2, tm + 0.6), { size: 58 });
    },
  };
});

// ---------------------------------------------------------------- September 1765, an autumn wood: the king's hunter
plateau("antoine", g => {
  campagne(g, [], { sol: "#8E7E58", relief: ["#9C8E78", "#A69A84", "#958870", "#A0937C"] });
  [[-1.6, -4.4, "#C8742E", 1], [0.6, -5.4, "#D9A23A", 2], [2.8, -4.6, "#B5532E", 3], [-3.6, -3.0, "#D08A34", 4], [4.4, -3.2, "#C8742E", 5], [-0.6, -7.2, "#B5532E", 6], [3.6, -7.0, "#D9A23A", 7], [-4.2, -6.4, "#A8642A", 8]]
    .forEach(([x, z, c, n]) => poser(g, D.feuillu(4.6, c, n), x, z));
  for (const [x, z, h] of [[-2.6, -6.2, 3.0], [1.8, -7.6, 3.2]]) poser(g, D.sapin(h), x, z);
  const chasseur = gens(g, "autre", -0.5, 0.3, 191, "chasseur");
  const grand = bete(g, 1.55, -2.65, { taille: 1.0, tete: 1.0 });
  tourneVers(chasseur, 1.0, -1.9);
  return {
    fond: () => ciel("jour", "couchant", 0.25),
    update(t) {
      eclaire("jour", "couchant", 0.3);
      marcher(grand, t, S("antoine") + 0.3, [[1.55, -2.65], [1.0, -1.95]], { v: 0.8, tete: [0, 0.06] });
      chasseur.animer(t);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.2, 1.65, 6.2], cible: [0.25, 1.0, -0.8] }, { pos: [0.25, 1.6, 5.8], cible: [0.25, 1.0, -0.8] })],
        [wt("antoine", "chasseur", 2.4) - 0.2, glisse({ pos: [2.2, 1.65, -0.85], cible: [-0.5, 1.45, 0.3] }, { pos: [2.05, 1.65, -0.8], cible: [-0.5, 1.45, 0.3] })],
        [wt("antoine", "abat", 4.8) - 0.2, glisse({ pos: [-1.75, 1.0, -0.8], cible: [0.56, 0.92, -1.39] }, { pos: [-1.6, 1.0, -0.85], cible: [0.56, 0.92, -1.39] })],
      ]), lumieres: true, focus: [0.2, -0.8] };
    },
    over(t) {
      const ts = wt("antoine", "septembre", 0.3), tn = wt("antoine", "François", 3.8), tl = wt("antoine", "loup", 5.8);
      note("septembre 1765", W / 2, 400, prog(t, ts - 0.2, ts + 0.5) * (1 - prog(t, tn - 0.6, tn - 0.3)), { size: 64 });
      note("François Antoine, chasseur du roi", W / 2, 400, prog(t, tn - 0.3, tn + 0.6), { size: 54 });
      note("un très grand loup", W / 2, 500, prog(t, tl - 0.4, tl + 0.4), { size: 58 });
    },
  };
});

// ---------------------------------------------------------------- the Hall of Mirrors: the stuffed wolf… and night falls
plateau("versailles", g => {
  g.add(D.piece({ w: 5.4, d: 14, h: 4.8, mur: "#E8DCC0", sol: "#8A6440", poutres: "#C9A23E" }));
  const verre = new THREE.MeshStandardMaterial({ color: "#DCE7EE", emissive: "#EAF2F6", emissiveIntensity: 0.85 });
  for (let z = -5.6; z <= 5.0; z += 2.1) {
    const m = D.cadre(1.1, 2.9, "miroir"); m.rotation.y = Math.PI / 2; m.position.set(-2.58, 0.9, z); g.add(m);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.9, 1.1), verre); f.position.set(2.57, 0.9 + 1.45, z); g.add(f);
    const fr = D.cadre(1.1, 2.9, "#C9A23E"); fr.rotation.y = -Math.PI / 2; fr.position.set(2.62, 0.9, z); fr.children[0].visible = false; g.add(fr);
  }
  const socle = D.table(1.3, 0.62, 0.18, "#8E6A45"); socle.position.set(0, 0, -1.2); g.add(socle);
  const empaille = bete(g, 0, -1.2, { taille: 1.0, tete: 1.0 }); empaille.position.y = 0.205; empaille.animer(0);
  const roi = gens(g, "autorite", -1.35, 0.4, 201, "roi", { accessoires: [] });
  roi.articulations.tete.add(D.couronne());
  const cour = [[1.35, 0.5], [1.5, -2.6]].map(([x, z], i) => gens(g, "foule", x, z, 202 + i, i ? "dame" : "courtisan"));
  [roi, ...cour].forEach(q => tourneVers(q, 0, -1.2));
  const oeilA = new THREE.Vector3(4.0, 1.6, -4.5), oeilB = new THREE.Vector3(4.0, 1.6, -4.36);
  return {
    fond: salle("#2A2418"),
    update(t) {
      const tr = revele("versailles", 3.4), n = easeInOut(prog(t, tr - 0.3, tr + 1.0));
      eclaire("dedans", "nuit", 0.75 * n);
      verre.emissive.set(melange("#EAF2F6", "#1A2236", n)); verre.color.set(melange("#DCE7EE", "#141A26", n));
      roi.pose("pointer", fenetre(t, wt("versailles", "Versailles", 1.5) - 0.3, 0.6)).expression("doute", fenetre(t, tr + 0.2, 0.6)).animer(t);
      cour.forEach((c, i) => c.expression("choc", fenetre(t, tr + 0.3, 0.6)).animer(t + i));
      return { ...plans(t, [
        [-1, glisse({ pos: [0.4, 1.9, 7.0], cible: [0, 1.3, -1.8] }, { pos: [0.3, 1.85, 6.3], cible: [0, 1.3, -1.8] })],
        [wt("versailles", "fini", 2.4) - 0.5, glisse({ pos: [1.2, 1.8, -1.6], cible: [-1.35, 1.65, 0.4] }, { pos: [1.1, 1.8, -1.5], cible: [-1.35, 1.65, 0.4] })],
        [tr - 0.15, glisse({ pos: [-0.9, 1.7, 6.2], cible: [1.2, 1.4, -2.4] }, { pos: [-0.85, 1.7, 5.8], cible: [1.2, 1.4, -2.4] })],
      ]), sombre: 0.6 * n, lumieres: true, focus: [0, -0.6] };
    },
    over(t) {
      const tv = wt("versailles", "Versailles", 1.5), tf = wt("versailles", "fini", 2.4), tr = revele("versailles", 3.4);
      note("empaillé · montré à Versailles", W / 2, 400, prog(t, tv - 0.6, tv + 0.4) * (1 - prog(t, tf - 0.4, tf - 0.1)), { size: 58 });
      tampon("FINI ?", 420, prog(t, tf - 0.1, tf + 0.7) * (1 - prog(t, tr - 0.2, tr + 0.3)), { size: 130, color: VERT });
      tampon("NON.", 420, prog(t, tr + 0.1, tr + 0.9), { size: 150, color: ROUGE });
      const k = fenetre(t, tr + 0.2, 1.0);
      if (k > 0) for (const p of [oeilA, oeilB]) lueurs(st.projeter(p), k, 14);   // eyes outside, behind a window
    },
  };
});

// ---------------------------------------------------------------- a village street at night: "she is back"
plateau("rue", g => {
  campagne(g, foret(2, -11, 10, 3, 6), { sol: "#7E8462" });
  [[-4.6, -3.2, 0], [-1.2, -3.0, 0], [2.2, -3.2, 0], [5.6, -3.0, 0]].forEach(([x, z, r], i) => poser(g, D.maison({ nuit: true, etage: i % 2 === 1 }), x, z, r));
  poser(g, D.bande(30, 2.0, "#8C826E"), 0, 0.4);
  const homme = gens(g, "sujet", 0.3, -0.3, 211, "paysan"), femme = gens(g, "foule", -1.2, -0.4, 212, "paysanne");
  face(homme, femme); face(femme, homme);
  const b = bete(g, 3.0, 0.2); b.rotation.y = Math.PI; b.animer(0);
  return {
    fond: () => ciel("nuit"),
    update(t) {
      eclaire("nuit");
      homme.expression("peur", fenetre(t, S("nuit1"), 0.5)).animer(t); parle(homme, t, "nuit1");
      femme.expression("choc", fenetre(t, S("nuit2"), 0.4)).animer(t + 1); parle(femme, t, "nuit2");
      b.animer(t, 0, { tete: [0.25, 0] }); regard(b, fenetre(t, S("reprise") + 0.3, 1.0));
      return { ...plans(t, [
        [-1, glisse({ pos: [-1.3, 1.6, 2.1], cible: [0.3, 1.5, -0.3] }, { pos: [-1.2, 1.6, 1.95], cible: [0.3, 1.5, -0.3] })],
        [S("nuit2") - 0.1, glisse({ pos: [0.5, 1.6, 1.95], cible: [-1.2, 1.5, -0.4] }, { pos: [0.42, 1.6, 1.8], cible: [-1.2, 1.5, -0.4] })],
        [S("reprise") - 0.1, glisse({ pos: [-2.6, 1.6, 5.4], cible: [2.8, 1.0, -0.2] }, { pos: [-2.4, 1.6, 5.0], cible: [2.9, 1.0, -0.2] })],
      ]), sombre: 0.85, lumieres: true, focus: [0, -0.5] };
    },
    over(t) {
      yeux(b, fenetre(t, S("reprise") + 0.3, 1.0), 16);
      const tr = wt("reprise", "recommencent", 0.8), td = wt("reprise", "demi", 2.8);
      note("les attaques recommencent", W / 2, 420, prog(t, tr - 0.2, tr + 0.5), { size: 60, color: ROUGE });
      note("encore 1 an et demi", W / 2, 520, prog(t, td - 0.5, td + 0.3), { size: 56 });
    },
  };
});

// ---------------------------------------------------------------- June 1767, Mont Mouchet at dawn: Jean Chastel
plateau("chastel", g => {
  campagne(g, [[2.6, -1.4, 2.7], [-2.6, -1.8, 2.9], [0.6, -4.6, 3.1], [3.4, -3.6, 2.8], [-1.6, -4.0, 3], [2.0, -6.0, 3.2], [-3.4, -0.4, 2.6], [4.2, -1.0, 2.5]]);
  [[-1.2, -2.6, "#7E9A5A", 2], [4.4, -5.6, "#6E8F4A", 6]].forEach(([x, z, c, n]) => poser(g, D.feuillu(3.6, c, n), x, z));
  poser(g, D.rocher(0.7, 4), 1.9, 0.9); poser(g, D.rocher(0.5, 7), -2.4, 1.4);
  const jean = gens(g, "sujet", -0.6, 0.6, 81, "paysan");
  jean.objet.rotation.y = 0.45;
  const b = bete(g, 1.0, -2.2); b.rotation.y = -2.3;
  const jour = t => easeInOut(prog(t, revele("chastel", 7.4) - 0.2, revele("chastel", 7.4) + 2.2));
  const fin = t => 1 - fenetre(t, wt("chastel", "abat", 4.3) + 0.2, 1.4);
  const k = t => fenetre(t, S("chastel") + 0.5, 1) * fin(t);
  return {
    fond: t => ciel("nuit", "aube", jour(t)),
    update(t) {
      const tr = revele("chastel", 7.4);
      eclaire("nuit", "aube", jour(t)); regard(b, k(t));
      b.animer(t, 0, { tete: [versLui(b, -0.6, 0.6), 0] }); b.opacite(fin(t));
      jean.expression("joie", fenetre(t, tr + 0.8, 0.8)).regarder(0.6, 0).animer(t);
      return { ...plans(t, [
        [-1, glisse({ pos: [-1.5, 1.5, 5.4], cible: [0.1, 1.05, -0.8] }, { pos: [-1.4, 1.5, 5.0], cible: [0.1, 1.05, -0.8] })],
        [wt("chastel", "paysan", 2.4) - 0.3, glisse({ pos: [0.3, 1.6, 3.7], cible: [-0.6, 1.5, 0.6] }, { pos: [0.25, 1.6, 3.4], cible: [-0.6, 1.5, 0.6] })],
        [wt("chastel", "abat", 4.3) - 0.2, glisse({ pos: [-0.87, 0.98, -0.1], cible: [0.6, 0.85, -1.75] }, { pos: [-0.75, 0.97, -0.2], cible: [0.6, 0.85, -1.75] })],
        [wt("chastel", "Et", 6.1) - 0.1, (u, t) => chemin(t, [{ pos: [-1.5, 1.5, 5.4], cible: [0.1, 1.05, -0.8], fov: 30 }, { t: tr, d: 2.0, pos: [-1.0, 2.0, 7.0], cible: [0.2, 1.1, -1.2] }])],
      ]), sombre: 0.9 * (1 - jour(t)), lumieres: true, focus: [0.2, -0.6] };
    },
    over(t) {
      const tj = wt("chastel", "Chastel", 3.5), ta = wt("chastel", "animal", 5.5), tr = revele("chastel", 7.4);
      brume(0.2 * (1 - 0.5 * jour(t)), 1200);
      yeux(b, k(t), 16);
      note("19 juin 1767", W / 2, 390, prog(t, S("chastel") + 0.2, S("chastel") + 0.9), { size: 68 });
      note("Jean Chastel, paysan", W / 2, 490, prog(t, tj, tj + 0.6) * (1 - prog(t, tr + 0.3, tr + 0.6)), { size: 56 });
      note("un animal proche du loup", W / 2, 590, prog(t, ta - 0.1, ta + 0.6) * (1 - prog(t, tr + 0.3, tr + 0.6)), { size: 54 });
      note("plus aucune attaque mortelle", W / 2, 490, prog(t, tr + 0.6, tr + 1.6), { size: 60, color: VERT });
    },
  };
});

// ---------------------------------------------------------------- the village square in the sun: relief
plateau("fete", g => {
  campagne(g, [], { sol: "#9AA06C" });
  poser(g, D.fontaine(), 0, -1.6);
  poser(g, D.maison({ etage: true }), -4.6, -4.4, 0.35); poser(g, D.maison({ etage: true, mur: "#B0A592" }), 4.4, -4.6, -0.35); poser(g, D.maison(), 0.2, -6.8);
  poser(g, D.eglise(), -2.2, -12.5, 0.2);
  g.add(D.fanions([-3.2, 3.3, -3.0], [3.1, 3.3, -3.2])); g.add(D.fanions([-3.4, 2.9, -2.6], [0.2, 3.1, -5.4]));
  const mere = gens(g, "foule", -1.35, 0.9, 221, "paysanne"), berger = gens(g, "sujet", 1.4, 0.9, 222, "berger");
  const petits = [[-0.45, 1.75, "bergere"], [0.55, 1.8, "berger"]].map(([x, z, tn], i) => enfant(g, "foule", x, z, 223 + i, tn));
  const autres = [[-2.7, -0.9, "paysan"], [2.7, -1.1, "paysanne"]].map(([x, z, tn], i) => gens(g, "foule", x, z, 225 + i, tn));
  face(mere, berger); face(berger, mere);
  return {
    fond: () => ciel("jour"),
    update(t) {
      eclaire("jour");
      mere.expression("joie").animer(t); parle(mere, t, "fete1");
      berger.expression("joie").animer(t + 1); parle(berger, t, "fete2");
      petits.forEach((q, i) => q.pose("mainLevee").expression("joie").animer(t + i * 0.5));
      autres.forEach((q, i) => q.pose("mainLevee", 0.8).expression("joie").animer(t + 2 + i));
      return { ...plans(t, [
        [-1, glisse({ pos: [0, 1.9, 7.4], cible: [0, 1.4, -1] }, { pos: [0, 1.85, 6.8], cible: [0, 1.4, -1] })],
        [S("fete1") + 0.6, glisse({ pos: [0.6, 1.6, 3.4], cible: [-1.35, 1.5, 0.9] }, { pos: [0.55, 1.6, 3.15], cible: [-1.35, 1.5, 0.9] })],
        [S("fete2") - 0.1, glisse({ pos: [-0.6, 1.6, 3.4], cible: [1.4, 1.5, 0.9] }, { pos: [-0.55, 1.6, 3.15], cible: [1.4, 1.5, 0.9] })],
      ]), lumieres: true, focus: [0, 0] };
    },
  };
});

// ---------------------------------------------------------------- a museum today: the historians' answer
const FRANCE = [[2.37, 51.05], [1.6, 50.9], [1.4, 50.1], [0.1, 49.55], [-1.25, 49.7], [-1.6, 49.65], [-1.35, 48.65], [-3.0, 48.85], [-4.75, 48.45],
  [-4.4, 47.95], [-3.4, 47.7], [-2.25, 47.2], [-1.8, 46.5], [-1.15, 46.15], [-1.05, 45.6], [-1.25, 44.65], [-1.5, 43.5], [-1.78, 43.36],
  [-0.5, 42.85], [1.0, 42.7], [2.4, 42.4], [3.17, 42.45], [3.05, 42.95], [3.9, 43.5], [4.6, 43.4], [5.35, 43.25], [5.95, 43.1], [6.8, 43.4],
  [7.5, 43.78], [7.0, 44.2], [6.9, 45.1], [7.0, 45.9], [6.15, 46.2], [6.1, 46.9], [7.55, 47.55], [7.8, 48.6], [8.2, 48.97], [6.7, 49.15],
  [6.0, 49.45], [4.85, 50.15], [4.2, 49.95], [3.0, 50.75]];
const CORSE = [[8.6, 41.4], [9.25, 41.4], [9.55, 42.1], [9.45, 43.0], [9.0, 42.75], [8.6, 42.4]];
const LOUPS = (() => { let a = 12345; const r = () => ((a = (a * 16807) % 2147483647) / 2147483647); return Array.from({ length: 700 }, () => [-4.8 + 13 * r(), 41.4 + 9.7 * r()]); })();
function carte(t, t0, t1) {
  const p = clamp(prog(t, t0, t0 + 0.35)) * (1 - clamp(prog(t, t1, t1 + 0.35)));
  if (p <= 0) return;
  const k = 84, cx = W / 2 - 25, cy = 910, X = ([lon]) => cx + (lon - 2.2) * k * 0.69, Y = ([, lat]) => cy - (lat - 46.6) * k;
  ctx.save(); ctx.globalAlpha = easeInOut(p);
  ctx.fillStyle = "rgba(247,244,236,.96)"; ctx.beginPath(); ctx.roundRect(60, 330, W - 120, 1150, 40); ctx.fill();
  const trace = pts => { const f = new Path2D(); pts.forEach((q, i) => (i ? f.lineTo(X(q), Y(q)) : f.moveTo(X(q), Y(q)))); f.closePath(); return f; };
  const corse = trace(CORSE), france = trace(FRANCE);
  ctx.fillStyle = "#E3DCC8"; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = "round";
  for (const f of [corse, france]) { ctx.fill(f); ctx.stroke(f); }
  const n = Math.floor(LOUPS.length * easeInOut(prog(t, t0 + 0.4, t0 + 2.4)));
  ctx.fillStyle = "#6A4C36";
  for (let i = 0; i < n; i++) {
    const [lon, lat] = LOUPS[i], x = X([lon]), y = Y([0, lat]);
    if (!ctx.isPointInPath(france, x, y)) continue;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.29); ctx.fill();
  }
  const gx = X([3.5]), gy = Y([0, 44.55]), pul = 1 + 0.12 * Math.sin(t * 5);
  ctx.strokeStyle = ROUGE; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(gx, gy, 30 * pul, 0, 6.29); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = easeInOut(p);
  txt("≈ 20 000 LOUPS", W / 2, 420, 62, "MontX", INK);
  txt("en France, au XVIIIe siècle", W / 2, 480, 36, "MontS", INK);
  ctx.restore();
  note("Gévaudan", gx + 150, gy + 70, p * prog(t, t0 + 0.8, t0 + 1.4), { size: 46, color: ROUGE });
}
plateau("explication", g => {
  g.add(D.piece({ w: 8, d: 6, h: 3.6, mur: "#F1EEE8", sol: "#B89470", poutres: "#E6E2DA" }));
  const v = D.vitrine(3.6, 1.5, 1.7); v.position.set(0, 0, -1.3); g.add(v);
  // the case holds a diorama (its contents are part of it)
  const fond = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.03, 1.6), new THREE.MeshStandardMaterial({ color: "#7E8A5A", roughness: 1 })); fond.position.set(0, 0.615, 0); v.add(fond);
  [[-1.5, -0.6], [1.45, -0.55]].forEach(([x, z]) => { const s = D.sapin(1.2); s.position.set(x, 0.63, z); v.add(s); });
  // a diorama of three wolves: several animals, not one monster
  [[-0.95, 0.15, -0.35], [0.1, -0.3, 0.35], [0.95, 0.3, 2.7]].forEach(([x, z, r]) => {
    const b = D.loup(); b.scale.setScalar(0.5); b.position.set(x, 0.63, z); b.rotation.y = r; b.animer(0); v.add(b);
  });
  const titre = D.panneau([["LA BÊTE DU GÉVAUDAN", 46], ["1764 – 1767", 36, "MontS"]], { w: 2.6, h: 0.8, haut: 2.6 }); titre.children[1].visible = false; titre.position.set(0, 0, -2.85); g.add(titre);
  const visiteurs = [[-2.6, 0.9], [2.5, 0.7], [-1.6, 1.6]].map(([x, z], i) => { const q = figure(g, i === 1 ? "sujet" : "foule", x, z, { graine: 231 + i }); tourneVers(q, 0, -1.3); return q; });
  const centre = new THREE.Vector3(0, 0.85, -1.3), bord = new THREE.Vector3();
  return {
    fond: salle("#3A3631"),
    update(t) {
      eclaire("musee");
      visiteurs.forEach((q, i) => q.regarder(0, -0.3).animer(t + i));
      return { ...plans(t, [
        [-1, glisse({ pos: [0.3, 1.9, 7.4], cible: [0, 1.3, -1.2] }, { pos: [0.25, 1.85, 6.8], cible: [0, 1.3, -1.2] })],
        [wt("explication", "plupart", 2.3) - 0.3, glisse({ pos: [0.5, 1.55, 2.6], cible: [0, 0.95, -1.3] }, { pos: [0.4, 1.5, 2.3], cible: [0, 0.95, -1.3] })],
        [wt("explication", "chercheurs", 11) - 0.3, glisse({ pos: [0.9, 1.15, 0.1], cible: [0.32, 0.95, -1.6] }, { pos: [0.85, 1.13, 0.0], cible: [0.32, 0.95, -1.6] })],
        [wt("explication", "comme", 13.9) - 0.3, glisse({ pos: [0.3, 1.8, 4.4], cible: [0, 1.1, -1.3] }, { pos: [0.3, 1.8, 4.0], cible: [0, 1.1, -1.3] })],
      ]), sombre: 0.1, lumieres: true, focus: [0, -1] };
    },
    over(t) {
      const tp = wt("explication", "plusieurs", 4), tc = wt("explication", "chien", 13), ts = wt("explication", "imaginait", 21);
      note("pas un monstre :", W / 2, 390, prog(t, tp - 1.2, tp - 0.6) * (1 - prog(t, ts - 1.4, ts - 1.1)), { size: 60 });
      note("plusieurs loups", W / 2, 490, prog(t, tp - 0.2, tp + 0.5) * (1 - prog(t, ts - 1.4, ts - 1.1)), { size: 74, color: VERT });
      carte(t, wt("explication", "époque", 7.5) - 0.3, wt("explication", "chercheurs", 11) - 0.45);
      note("ou un mélange chien + loup ?", W / 2, 1380, prog(t, tc - 0.2, tc + 0.6) * (1 - prog(t, ts - 1.4, ts - 1.1)), { size: 56 });
      const pc = prog(t, ts - 1.2, ts - 0.2);
      if (pc > 0) {
        const c = st.projeter(centre); bord.copy(centre); bord.x += 1.75; const r = Math.min(470, Math.abs(st.projeter(bord).x - c.x));
        chalkCircle(c.x, c.y, r, r * 0.5, pc, { color: ROUGE, width: 9 });
      }
      note("« la » Bête = un seul monstre ?", W / 2, 440, prog(t, ts - 0.8, ts + 0.2), { size: 60, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- a bookshop: the conspiracy stories come from novels
plateau("mythes", g => {
  g.add(D.piece({ w: 6.5, d: 5, h: 3.4, mur: "#D8CDB8", sol: "#6E5643", fenetres: [["droite", -0.6, 1.0, 1.0, 1.6]] }));
  [-2.2, 0, 2.2].forEach((x, i) => poser(g, D.etagere(2.0, 2.6, 11 + i), x, -2.3));
  const tb = D.table(1.1, 0.62); tb.position.set(0, 0, 0.6); g.add(tb);
  const roman = D.livre("ROMAN", "fiction, 1936", "#3E5A7A"); roman.position.set(0, 0.76, 0.6); g.add(roman);
  const comte = gens(g, "autorite", -0.75, -0.8, 91, "noble", { accessoires: [] }), dresseur = gens(g, "foule", 0.75, -0.8, 92, "paysan");
  return {
    fond: salle("#2E2924"),
    update(t) {
      eclaire("dedans");
      roman.rotation.y = -0.3 + 0.2 * Math.sin(t * 0.7);
      comte.pose("brasCroises").animer(t); dresseur.pose("hausseEpaules", 0.6).animer(t);
      const livreProche = glisse({ pos: [0.35, 1.35, 3.2], cible: [0, 1.1, 0.55] }, { pos: [0.3, 1.3, 2.9], cible: [0, 1.1, 0.55] });
      return { ...plans(t, [
        [-1, livreProche],
        [wt("mythes", "comte", 1.5) - 0.3, glisse({ pos: [-0.55, 1.65, 2.6], cible: [-0.75, 1.5, -0.8] }, { pos: [-0.58, 1.65, 2.35], cible: [-0.75, 1.5, -0.8] })],
        [wt("mythes", "dresseur", 2.4) - 0.3, glisse({ pos: [0.55, 1.65, 2.6], cible: [0.75, 1.5, -0.8] }, { pos: [0.58, 1.65, 2.35], cible: [0.75, 1.5, -0.8] })],
        [wt("mythes", "Elles", 3.6) - 0.2, livreProche],
        [wt("mythes", "Aucun", 4.9) - 0.3, glisse({ pos: [0.3, 1.6, 5.4], cible: [0, 1.05, -0.2] }, { pos: [0.25, 1.6, 5.1], cible: [0, 1.05, -0.2] })],
      ]), sombre: 0.1, lumieres: true, focus: [0, -0.4] };
    },
    over(t) {
      const tc = wt("mythes", "comte", 1.5), td = wt("mythes", "dresseur", 2.5), tr = wt("mythes", "romans", 4), ta = wt("mythes", "document", 5.5);
      const a = auDessus(comte, 0.5), b = auDessus(dresseur, 0.5);
      note("un comte ?", clamp(a.x, 190, W - 190), Math.max(a.y, 470), prog(t, tc - 0.2, tc + 0.4), { size: 54 });
      note("un dresseur ?", clamp(b.x, 190, W - 190), Math.max(b.y, 470), prog(t, td - 0.2, td + 0.4), { size: 54 });
      note("→ inventés dans des romans", W / 2, 380, prog(t, tr - 0.3, tr + 0.6), { size: 58 });
      sketchPath([[140, 560], [940, 1180]], prog(t, ta - 0.2, ta + 0.3), { color: ROUGE, width: 14 });
      sketchPath([[940, 560], [140, 1180]], prog(t, ta + 0.1, ta + 0.6), { color: ROUGE, width: 14 });
      note("aucun document ne le prouve", W / 2, 1390, prog(t, ta, ta + 0.7), { size: 56, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- a town square today: the statue and the phones
function telephone(x, y, s, p) {
  if (p <= 0) return;
  const k = easeOutBack(clamp(p), 2);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.fillStyle = "#15161A"; ctx.beginPath(); ctx.roundRect(-34, -60, 68, 120, 12); ctx.fill();
  ctx.fillStyle = "#1E2533"; ctx.fillRect(-28, -50, 56, 100);
  for (const ex of [-10, 10]) { ctx.fillStyle = "#FFD678"; ctx.beginPath(); ctx.arc(ex, -6, 5, 0, 6.29); ctx.fill(); }
  ctx.restore();
}
plateau("aujourdhui", g => {
  g.add(D.pre(60, "#B9B5AC"));
  [[-6.2, -8, 5, 7, "#D9CBB4"], [0, -9.5, 6, 8.5, "#CDBFA8"], [6.2, -8, 5, 7, "#E0D3BE"]].forEach(([x, z, w, h, c], i) => poser(g, D.immeuble(w, h, c, i), x, z));
  [[-3.4, -2.2], [3.4, -2.6]].forEach(([x, z]) => poser(g, D.lampadaire(), x, z));
  poser(g, D.banc(1.6, "#4A4E56"), -2.6, 0.6, 0.4);
  const socle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.0), new THREE.MeshStandardMaterial({ color: "#9A948A", roughness: 0.9 }));
  socle.position.set(0, 0.65, -2.8); socle.castShadow = socle.receiveShadow = true; g.add(socle);
  const statue = D.loup({ couleur: "#6E5A3A", creme: "#7C6844", sombre: "#4A3B26", selle: "#62502F", tete: 1.12 });
  statue.position.set(0, 1.3, -2.8); statue.rotation.y = -0.5; statue.name = "statue"; statue.animer(0); g.add(statue);
  const foule = [[-1.9, -0.6], [1.9, -0.8], [-0.9, 0.5], [0.9, 0.4]].map(([x, z], i) => { const q = figure(g, i % 2 ? "sujet" : "foule", x, z, { graine: 241 + i }); tourneVers(q, 0, -2.8); return q; });
  const selfie = figure(g, "autre", 2.6, 0.9, { graine: 245 });
  return {
    fond: () => ciel("jour"),
    update(t) {
      eclaire("jour");
      foule.forEach((q, i) => q.regarder(0, 0.2).animer(t + i));
      selfie.pose("mainLevee").expression("joie").animer(t);
      return { ...plans(t, [
        [-1, glisse({ pos: [0.6, 2.4, 8.6], cible: [0, 1.7, -2.6] }, { pos: [0.5, 2.3, 8.0], cible: [0, 1.7, -2.6] })],
        [wt("aujourdhui", "Une", 3.2) - 0.2, glisse({ pos: [2.0, 2.3, 1.5], cible: [0.1, 1.9, -2.7] }, { pos: [1.9, 2.25, 1.3], cible: [0.1, 1.9, -2.7] })],
        [wt("aujourdhui", "quand", 6.3) - 0.4, glisse({ pos: [0.3, 2.2, 7.0], cible: [0, 1.6, -2.4] }, { pos: [0.3, 2.0, 6.4], cible: [0, 1.6, -2.4] })],
      ]), lumieres: true, focus: [0, -1.4] };
    },
    over(t) {
      const ts = wt("aujourdhui", "statues", 1.6), tr = wt("aujourdhui", "répétée", 3.6), tl = wt("aujourdhui", "légende", 5.4), tv = wt("aujourdhui", "vérité", 6.6);
      [...foule, selfie].forEach((q, i) => { const a = auDessus(q, 0.6); telephone(a.x, a.y, 0.8, prog(t, ts - 0.2 + i * 0.14, ts + 0.1 + i * 0.14)); });
      note("des statues de la Bête", W / 2, 420, prog(t, ts - 0.2, ts + 0.5) * (1 - prog(t, tr - 0.6, tr - 0.3)), { size: 60 });
      note("répétée partout…", W / 2, 1300, prog(t, tr - 0.2, tr + 0.6) * (1 - prog(t, tv - 0.6, tv - 0.3)), { size: 62 });
      note("…une légende", W / 2, 1400, prog(t, tl - 0.2, tl + 0.6) * (1 - prog(t, tv - 0.6, tv - 0.3)), { size: 68, color: ROUGE });
      note("la vérité est souvent plus simple", W / 2, 1360, prog(t, tv - 0.3, tv + 0.6), { size: 54, color: VERT });
    },
  };
});

// ---------------------------------------------------------------- what do you think? (a hill at sunset)
plateau("cta", g => {
  campagne(g, foret(0, -5, 10, 3, 3), { relief: ["#8A7E86", "#9A8C8E", "#857A80", "#928690"] });
  const toi = figure(g, "sujet", 0, 0.3, { graine: 3 });
  return {
    fond: () => ciel("couchant"),
    update(t) {
      eclaire("couchant");
      toi.pose("hausseEpaules", fenetre(t, S("cta") + 0.3, 0.6)).expression("doute", fenetre(t, S("cta") + 0.5, 0.5)).animer(t);
      return { fov: 30, pos: [0.25, 1.6, lerp(6.0, 5.5, prog(t, S("cta"), E("cta")))], cible: [0, 1.4, 0.3], lumieres: true };
    },
    over(t) {
      const t0 = S("cta");
      [["DES LOUPS", VERT, 300], ["AUTRE CHOSE", "#B8741A", 780]].forEach(([s, c, x], i) => {
        const p = easeOutBack(prog(t, t0 + 0.3 + i * 0.15, t0 + 0.65 + i * 0.15), 2);
        if (p <= 0) return;
        const hl = Math.floor((t - t0) * 1.2) % 2 === i;
        ctx.save(); ctx.translate(x, 470); ctx.scale(p * (hl ? 1.06 : 1), p * (hl ? 1.06 : 1));
        ctx.fillStyle = hl ? c : "rgba(255,255,255,.88)"; ctx.strokeStyle = c; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.roundRect(-210, -66, 420, 132, 66); ctx.fill(); ctx.stroke();
        txt(s, 0, 4, 54, "MontX", hl ? "#FFFFFF" : c);
        ctx.restore();
      });
      const tc = wt("cta", "commentaire", 3), p = easeOutBack(prog(t, tc - 0.2, tc + 0.2), 2.2);
      if (p > 0) {
        ctx.save(); ctx.translate(W / 2, 320); ctx.scale(p, p);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-380, -58, 760, 116, 58); ctx.fill();
        txt("DIS-LE EN COMMENTAIRE", 0, 4, 46, "MontX", "#FFFFFF");
        ctx.restore();
      }
    },
  };
});

// ---------------------------------------------------------------- sound: soft beds and small sounds only (TikTok)
function sons() {
  const amb = (type, a, b, gain) => sfx(a, type, { dur: Math.max(1, b - a), gain });
  amb("vent", 0, E("hook"), 0.5); amb("vent", S("question"), E("question"), 0.4); amb("vent", S("nuit1"), E("reprise"), 0.5);
  amb("vent", S("chastel"), revele("chastel", 7.4) + 1.2, 0.45); amb("vent", S("heros"), E("heros"), 0.35);
  amb("oiseaux", S("lieu"), E("lieu"), 0.6); amb("oiseaux", S("lavoir1"), E("lavoir3"), 0.45); amb("oiseaux", S("soldats"), E("soldats"), 0.4);
  amb("oiseaux", S("valet"), E("valet"), 0.5); amb("oiseaux", S("antoine"), E("antoine"), 0.4); amb("oiseaux", revele("chastel", 7.4) + 0.8, E("fete2"), 0.6);
  amb("oiseaux", S("cta"), E("cta"), 0.35);
  for (let s = S("soldats") + 0.1; s < wt("soldats", "Sans", 5) - 0.6; s += 0.53) sfx(s, "step", { gain: 0.2 });
  sfx(wt("journaux", "feuilleton", 4.4), "paper", { gain: 0.4 });
  for (let k = 0; k < 4; k++) sfx(wt("journaux", "recopient", 7) + k * 0.25, "paper", { gain: 0.25 });
  sfx(wt("roi", "récompense", 3.8), "chime", { gain: 0.25 });
  sfx(wt("heros", "études", 11.4), "chime", { gain: 0.3 });
  for (let k = 0; k < 3; k++) sfx(S("fete1") - 0.3 + k * 0.7, "chime", { gain: 0.18 });   // church bells, far
  sfx(wt("explication", "époque", 7.5) - 0.3, "paper", { gain: 0.35 });
  RUMEURS.forEach(id => sfx(S(id) + 0.2, "swish", { gain: 0.15 }));
}

const DIALOGUE = ["lavoir1", "lavoir2", "lavoir3", "temoin1", "temoin2", "rumeur1", "rumeur2", "rumeur3", "rumeur4", "paris1", "paris2", "nuit1", "nuit2", "fete1", "fete2"];
const RECONSTITUTION = ["attaques", "bilan", "soldats", "roi", "heros", "valet", "antoine", "versailles", "reprise", "chastel"];
demarrer({
  decors: { lavoir1: "lavoir", lavoir2: "lavoir", lavoir3: "lavoir", temoin1: "temoins", temoin2: "portrait", rumeur1: "auberge", rumeur2: "auberge", rumeur3: "auberge", rumeur4: "auberge",
    paris1: "cafe", paris2: "cafe", nuit1: "rue", nuit2: "rue", reprise: "rue", fete1: "fete", fete2: "fete" },
  interlocuteurs: {
    lavoir1: ["UNE LAVANDIÈRE", "#E2B53E"], lavoir2: ["SA VOISINE", "#7FB0D8"], lavoir3: ["UNE LAVANDIÈRE", "#E2B53E"],
    temoin1: ["UN BERGER, TÉMOIN", "#9BD08A"], temoin2: ["UN BERGER, TÉMOIN", "#9BD08A"],
    rumeur1: ["L'AUBERGISTE", "#E2B53E"], rumeur2: ["UN CLIENT", "#9BD08A"], rumeur3: ["UNE CLIENTE", "#7FB0D8"], rumeur4: ["L'AUBERGISTE", "#E2B53E"],
    paris1: ["UNE LECTRICE", "#D88FB0"], paris2: ["UN LECTEUR", "#9BD08A"], nuit1: ["UN VILLAGEOIS", "#9BD08A"], nuit2: ["SA FEMME", "#E2B53E"],
    fete1: ["UNE MÈRE", "#7FB0D8"], fete2: ["UN BERGER", "#9BD08A"],
  },
  chapitres: { question: "LA QUESTION", attaques: "1764", temoins: "LES TÉMOINS", auberge: "LES RUMEURS", journaux: "LES JOURNAUX", soldats: "LE ROI", heros: "LES HÉROS",
    antoine: "1765", nuit1: "ÇA RECOMMENCE", chastel: "1767", explication: "LA RÉPONSE", mythes: "LES MYTHES", aujourdhui: "AUJOURD'HUI" },
  mentions: Object.fromEntries(["hook", "lieu", "question", "attaques", "lavoir1", "lavoir2", "lavoir3", "bilan", "temoins", "temoin1", "temoin2", "auberge", ...RUMEURS, "journaux", "paris1", "paris2",
    "soldats", "roi", "heros", "valet", "antoine", "versailles", "nuit1", "nuit2", "reprise", "chastel", "fete1", "fete2", "explication", "mythes", "aujourdhui", "cta"]
    .map(id => [id, DIALOGUE.includes(id) ? "Dialogue imaginé" : RECONSTITUTION.includes(id) ? "Reconstitution" : "Illustration"])),
  sources: {
    titre: "SOURCES", duree: 5, lignes: [
      ["Article « Bête du Gévaudan », Wikipédia (2026).", 36, "MontX"],
      ["Jean-Marc Moriceau, La Bête du Gévaudan, 1764-1767, Tallandier, 2021.", 32],
      ["Jay M. Smith, Monsters of the Gévaudan, Harvard University Press, 2011.", 32],
      ["Dialogues imaginés · scènes reconstituées en 3D · voix de synthèse.", 28],
    ],
  },
  musique: { style: "dark", root: 38, room: true, tick: true },
  sons,
  voix: { bed: 0.22, duck: 0.6 },
  fonduDebut: false,
  accents: () => [wt("hook", "1764", 0.3), wt("question", "Bête", 2.8), wt("bilan", "quatre-vingts", 1.2), wt("temoin1", "énorme", 2), wt("rumeur4", "sorcier", 1),
    wt("journaux", "feuilleton", 4.4), wt("paris2", "honte", 2.5), wt("roi", "énorme", 3.4), wt("heros", "héros", 0.8), wt("heros", "études", 11.4),
    wt("valet", "repousse", 5), wt("explication", "plusieurs", 4.5), wt("mythes", "romans", 4.3), wt("aujourdhui", "légende", 5.4)],
});
