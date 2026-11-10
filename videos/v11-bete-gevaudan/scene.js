// La Bête du Gévaudan (1764-1767), about two minutes, simple words, staged with the Quidams and narrated by a generic
// native French library voice (Piper, "Tom"). The Beast is never shown attacking: eyes in the woods, a shadow that
// grows with the rumours, wolves standing still. TikTok rules of the brief (lib/recit3d.js): no flash or sudden sound,
// nobody speaks, every scene labelled "Reconstitution" or "Illustration", sources at the end.
import * as THREE from "three";
import { plateau, figure, auDessus, tourneVers, chemin, revele, encre, tampon, st, S, E, wt, INK, demarrer } from "../lib/recit3d.js";
import { LUMIERES } from "../lib/studio3d.js";
import { creerFoule, fenetre } from "../lib/quidams.js";
import { table, livre, couronne, sapin, pre, colline, mouton, loup, baton } from "../lib/decors3d.js";
import { habiller, TENUES } from "../lib/costumes.js";

const VERT = "#2E9E5B", ROUGE = "#C8322B", OR = "#FFE08A";

// ---------------------------------------------------------------- outdoors
function melange(a, b, k) {
  const x = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), y = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`;
}
// sky behind the hills: day, dusk or night (n = 0..1)
function ciel(n) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, melange("#9DB4C4", "#0B1019", n)); g.addColorStop(0.55, melange("#E6DFCF", "#1C2330", n)); g.addColorStop(1, melange("#E6DFCF", "#1C2330", n));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// meadow, distant hills and fir trees at the given spots
function campagne(g, arbres = [], collines = true) {
  g.add(pre());
  if (collines) [[-14, -34, "#8E9C93", 1.2], [6, -40, "#99A6A0", 1.5], [22, -30, "#8A988F", 1.0], [-30, -28, "#93A097", 1.1]].forEach(([x, z, c, s]) => {
    const h = colline(c); h.position.set(x, 0, z); h.scale.multiplyScalar(s); g.add(h);
  });
  for (const [x, z, h] of arbres) { const a = sapin(h); a.position.set(x, 0, z); g.add(a); }
}
const foret = (cx, cz, n, r, seed = 1) => Array.from({ length: n }, (_, i) => {
  const a = i * 2.39996 + seed, d = r * Math.sqrt((i + 0.5) / n);
  return [cx + Math.cos(a) * d, cz + Math.sin(a) * d, 2.4 + ((i * 37 + seed * 11) % 10) / 10];
});
// the Beast as a 2D shadow on the sky, eyes lit (behind everything 3D)
function ombreBete(x, y, s, alpha, yeux = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha; ctx.fillStyle = "#06080C";
  ctx.beginPath(); ctx.ellipse(0, 0, 230, 105, 0, 0, 6.29); ctx.fill();                   // body
  ctx.beginPath(); ctx.ellipse(220, -70, 95, 80, -0.3, 0, 6.29); ctx.fill();              // head
  ctx.beginPath(); ctx.moveTo(290, -60); ctx.lineTo(400, -30); ctx.lineTo(300, 0); ctx.fill(); // muzzle
  for (const ex of [185, 245]) { ctx.beginPath(); ctx.moveTo(ex - 28, -130); ctx.lineTo(ex, -215); ctx.lineTo(ex + 28, -130); ctx.fill(); } // ears
  for (const lx of [-160, -90, 90, 160]) ctx.fillRect(lx - 22, 60, 44, 190);              // legs
  ctx.beginPath(); ctx.moveTo(-210, -30); ctx.quadraticCurveTo(-380, -60, -420, 60); ctx.quadraticCurveTo(-330, 10, -215, 30); ctx.fill(); // tail
  if (yeux > 0) for (const ex of [235, 285]) {
    const gl = ctx.createRadialGradient(ex, -85, 0, ex, -85, 26);
    gl.addColorStop(0, `rgba(255,214,120,${yeux})`); gl.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ex, -85, 26, 0, 6.29); ctx.fill();
  }
  ctx.restore();
}
function bete(g, x, z, o = {}) {
  const b = loup(o);
  b.position.set(x, 0, z);
  g.add(b);
  return b;
}
const regard = (b, k) => { b.lueur.emissiveIntensity = 2.6 * k; };
// outdoor night: moonlight instead of the studio (the set returns lumieres: true)
function nuit(k) {
  st.ciel.intensity = lerp(LUMIERES.ciel, 0.1, k); st.key.intensity = lerp(LUMIERES.cle, 0.3, k); st.contre.intensity = lerp(LUMIERES.contre, 1.1, k);
}
// handwriting on a pale backing, so it reads over trees and crowds
function note(s, x, y, p, { size = 56, color = INK, align = "center" } = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.font = `${size}px Caveat`;
  const w = ctx.measureText(s).width, x0 = align === "left" ? x - 22 : x - w / 2 - 22;
  ctx.globalAlpha = 0.86 * clamp(p * 2); ctx.fillStyle = "#FBF8F1";
  ctx.beginPath(); ctx.roundRect(x0, y - size * 0.72, w + 44, size * 1.44, size * 0.45); ctx.fill();
  ctx.restore();
  encre(s, x, y, p, { size, color, align });
}
// the eyes of a wolf glowing in the dark (drawn over the picture where they are)
const oeil = new THREE.Vector3();
function yeux(b, k, r = 16) {
  if (k <= 0) return;
  for (const e of b.yeux) {
    e.getWorldPosition(oeil);
    const s = st.projeter(oeil), g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, `rgba(255,226,140,${k})`); g.addColorStop(0.35, `rgba(255,200,90,${0.7 * k})`); g.addColorStop(1, "rgba(255,190,80,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 6.29); ctx.fill();
  }
}
// everyone of 1764-1767 wears the clothes of the time (lib/costumes.js); the modern scenes stay plain
const vetu = (q, tenue) => habiller(q, TENUES[tenue]);
const enfant = (g, role, x, z, graine, tenue) => vetu(figure(g, role, x, z, { graine, taille: 0.62 }), tenue);

// ---------------------------------------------------------------- 1764: something in the woods
plateau("hook", g => {
  campagne(g, [[-1.6, -1.2, 2.8], [1.9, -1.0, 2.6], [-0.8, -3.4, 3], [1.4, -4.0, 2.7], [-2.6, -2.6, 2.9], [2.9, -2.9, 3.1], [0.1, -5.2, 3.2], [-3.6, -0.4, 2.5], [3.6, -0.6, 2.4], [-1.9, -5.4, 2.8], [2.4, -5.8, 3]], false);
  const b = bete(g, 0.5, -2.0); b.rotation.y = -Math.PI / 2;
  const k = t => fenetre(t, 0.8, 1.2) * (1 - fenetre(t, revele("hook", 3) + 0.3, 1.0));
  return {
    fond: () => ciel(0.95),
    update(t) {
      const tr = revele("hook", 3);
      nuit(1); regard(b, k(t));
      b.position.z = -2.0 - 2.2 * fenetre(t, tr + 0.2, 1.4);
      const p = easeInOut(prog(t, 0, E("hook")));
      return { fov: 30, pos: [lerp(0.3, 0.45, p), lerp(1.3, 1.05, p), lerp(6.4, 4.4, p)], cible: [0.45, 0.85, -2], sombre: 0.9, lumieres: true };
    },
    over(t) {
      const tr = revele("hook", 3);
      yeux(b, k(t), 20);
      chalk("1764", W / 2, 420, prog(t, 0.4, 1.2) * (1 - prog(t, tr - 0.4, tr)), { size: 110 });
      tampon("LA BÊTE", 400, prog(t, tr + 0.1, tr + 0.9), { size: 150 });
      tampon("DU GÉVAUDAN", 540, prog(t, tr + 0.4, tr + 1.2), { size: 90, color: OR });
    },
  };
});

// ---------------------------------------------------------------- the Gévaudan: mountains, forests, children with the flocks
plateau("lieu", g => {
  campagne(g, [...foret(-4.5, -6, 14, 3, 5), ...foret(5, -8, 10, 2.5, 9)]);
  const moutons = [[-0.4, -1.2], [0.5, -1.6], [1.4, -0.9], [-1.3, -2.1], [2.1, -2.4], [0.2, -3]].map(([x, z], i) => {
    const m = mouton(); m.position.set(x, 0, z); m.rotation.y = i * 1.3; g.add(m); return m;
  });
  const p1 = enfant(g, "sujet", -1.1, 0.4, 3, "berger"), p2 = enfant(g, "foule", 2.4, -0.4, 4, "bergere");
  for (const p of [p1, p2]) p.articulations.mainD.add(baton(1.0));
  tourneVers(p2, 0.6, -1.6);
  return {
    fond: () => ciel(0),
    update(t) {
      moutons.forEach((m, i) => (m.rotation.y = i * 1.3 + 0.15 * Math.sin(t * 0.5 + i)));
      p1.regarder(0.4, -0.2).animer(t); p2.animer(t);
      const ts = wt("lieu", "seuls", 7);
      return chemin(t, [{ pos: [0.6, 5.5, 13], cible: [0.4, 0.6, -2], fov: 32 }, { t: ts - 1.6, d: 1.6, pos: [-0.6, 1.3, 3.6], cible: [-1.0, 0.75, 0.2], fov: 30 }]);
    },
    over(t) {
      const tl = wt("lieu", "Lozère", 2.5), tm = wt("lieu", "montagnes", 4), tf = wt("lieu", "forêts", 5), ts = wt("lieu", "seuls", 7);
      note("Gévaudan = l'actuelle Lozère", W / 2, 400, prog(t, tl - 0.6, tl + 0.4) * (1 - prog(t, ts - 1.8, ts - 1.5)), { size: 62 });
      note("montagnes", 250, 560, prog(t, tm, tm + 0.4) * (1 - prog(t, ts - 1.8, ts - 1.5)), { size: 54 });
      note("forêts", 800, 600, prog(t, tf, tf + 0.4) * (1 - prog(t, ts - 1.8, ts - 1.5)), { size: 54 });
      const a = auDessus(p1, 0.1);
      note("souvent seul", a.x + 120, a.y - 180, prog(t, ts - 0.2, ts + 0.4), { size: 62, align: "left" });
    },
  };
});

// ---------------------------------------------------------------- the question
plateau("question", g => {
  campagne(g, [[-1.4, -1.0, 2.7], [1.9, -0.7, 2.6], [0.2, -3.2, 3], [-2.4, -2.8, 2.9], [2.7, -3.0, 3.1], [-0.9, -4.6, 3.2], [1.6, -5.0, 2.8]], false);
  const b = bete(g, 0.6, -1.9); b.rotation.y = -1.9;
  const k = t => 0.75 * fenetre(t, S("question") + 0.4, 1);
  return {
    fond: () => ciel(0.7),
    update(t) {
      nuit(0.7); regard(b, k(t));
      const p = easeInOut(prog(t, S("question") - 0.2, E("question")));
      return { fov: 30, pos: [lerp(-0.4, -0.1, p), 1.4, lerp(6.4, 5.4, p)], cible: [0.4, 1.0, -1.6], sombre: 0.7, lumieres: true };
    },
    over(t) {
      const tq = wt("question", "quoi", 1.5);
      yeux(b, k(t), 16);
      note("c'était quoi,", W / 2, 400, prog(t, tq - 0.4, tq + 0.3), { size: 78 });
      note("vraiment, la Bête ?", W / 2, 510, prog(t, tq + 0.2, tq + 1.0), { size: 78, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- 30 June 1764 and the toll
plateau("attaques", g => {
  campagne(g, foret(-3.5, -5, 10, 2.5, 2));
  const gens = [[-0.9, 0, "foule", 1], [-0.3, -0.3, "foule", 1], [0.35, 0, "foule", 1], [0.95, -0.25, "foule", 1], [-0.6, 0.6, "foule", 0.62], [0.1, 0.65, "sujet", 0.62], [0.7, 0.6, "foule", 0.62]]
    .map(([x, z, r, s], i) => vetu(figure(g, r, x, z, { graine: 21 + i, taille: s }), s < 1 ? (i % 2 ? "bergere" : "berger") : (i % 2 ? "paysanne" : "paysan")));
  return {
    fond: () => ciel(0.3),
    update(t) {
      gens.forEach((q, i) => q.transitionPose("debout", "teteBaissee", fenetre(t, S("attaques") + 0.6 + i * 0.1, 0.8)).expression("tristesse", fenetre(t, S("attaques") + 1 + i * 0.1, 0.8)).animer(t));
      const p = easeInOut(prog(t, S("attaques") - 0.2, E("attaques")));
      return { fov: 30, pos: [lerp(0.4, 0.1, p), lerp(1.45, 1.4, p), lerp(7.8, 6.8, p)], cible: [0, 1.1, 0], sombre: 0.35 };
    },
    over(t) {
      const tj = wt("attaques", "juin", 1), to = wt("attaques", "officielle", 4), tq = wt("attaques", "quatre-vingts", 9), te = wt("attaques", "enfants", 12);
      note("30 juin 1764", W / 2, 390, prog(t, tj - 0.4, tj + 0.4) * (1 - prog(t, tq - 1.0, tq - 0.7)), { size: 74 });
      note("1re victime officielle", W / 2, 490, prog(t, to - 0.4, to + 0.5) * (1 - prog(t, tq - 1.0, tq - 0.7)), { size: 56 });
      tampon("+ DE 80", 420, prog(t, tq - 0.1, tq + 0.7), { size: 140 });
      note("personnes tuées en 3 ans", W / 2, 540, prog(t, tq + 0.4, tq + 1.2), { size: 56 });
      note("surtout des enfants et des femmes", W / 2, 630, prog(t, te - 0.5, te + 0.6), { size: 50 });
    },
  };
});

// ---------------------------------------------------------------- the rumours: the shadow grows with every one
const RUMEURS = [["veau", "grande comme un veau"], ["cheval", "plus rapide qu'un cheval"], ["balles", "les balles ne lui font rien"], ["hyène", "une hyène ?"], ["sorcier", "un sorcier ?"]];
plateau("rumeurs", g => {
  campagne(g, foret(0, -13, 14, 5, 4), false);
  const cercle = [0, 1, 2, 3, 4].map(i => {
    const a = (i / 5) * Math.PI * 2 + 0.3, q = vetu(figure(g, i === 2 ? "sujet" : "foule", Math.cos(a) * 0.9, Math.sin(a) * 0.9 - 0.3, { graine: 31 + i }), i % 2 ? "paysanne" : "paysan");
    tourneVers(q, 0, -0.3); return q;
  });
  // the shadow on the sky grows a little more with every rumour
  const taille = t => 0.55 + 0.22 * RUMEURS.reduce((a, [m], i) => a + fenetre(t, wt("rumeurs", m, 3 + i * 1.6) - 0.2, 0.8), 0);
  return {
    fond: t => { ciel(0.85); ombreBete(W / 2 + 60, 520, taille(t), 0.8 * fenetre(t, S("rumeurs") + 0.5, 1.2), 0.9); },
    update(t) {
      nuit(0.8);
      cercle.forEach((q, i) => q.expression("peur", fenetre(t, S("rumeurs") + 0.8 + i * 0.15, 0.7)).regarder(Math.sin(t * 0.8 + i) * 0.6, 0.2).animer(t));
      return { fov: 32, pos: [0, 1.25, 7.2], cible: [0, 1.8, -0.4], sombre: 0.8, lumieres: true };
    },
    over(t) {
      RUMEURS.forEach(([m, s], i) => {
        const tw = wt("rumeurs", m, 3 + i * 1.6);
        note(s, i % 2 ? 760 : 320, 380 + i * 100, prog(t, tw - 0.2, tw + 0.5), { size: 48, color: i > 2 ? ROUGE : INK });
      });
    },
  };
});

// ---------------------------------------------------------------- the newspapers turn it into a serial
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
  const tb = table(1.3, 0.7); g.add(tb);
  const redac = vetu(figure(g, "autre", 0, -0.55, { graine: 41 }), "ecrivain");
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.3, 8), new THREE.MeshStandardMaterial({ color: "#F4F1EA" }));
  plume.position.set(0, -0.05, 0.08); plume.rotation.x = 0.9; redac.articulations.mainD.add(plume);
  const feuille = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.006, 0.26), new THREE.MeshStandardMaterial({ color: "#F5F0E4" }));
  feuille.position.set(0.05, 0.768, 0.05); feuille.rotation.y = 0.2; g.add(feuille);
  const encrier = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 14), new THREE.MeshStandardMaterial({ color: "#15161B", roughness: 0.3 }));
  encrier.position.set(-0.4, 0.805, 0.1); g.add(encrier);
  return {
    update(t) {
      redac.pose("noter").animer(t);
      const p = easeInOut(prog(t, S("journaux") - 0.2, E("journaux")));
      return { fov: 30, pos: [lerp(0.4, 0.2, p), lerp(1.6, 1.8, p), lerp(5.0, 6.6, p)], cible: [0, 1.4, -0.3] };
    },
    over(t) {
      const tc = wt("journaux", "Courrier", 2.5), tf = wt("journaux", "feuilleton", 4), tx = wt("journaux", "exagère", 5), tr = wt("journaux", "recopient", 6.5);
      note("Courrier d'Avignon", W / 2, 1380, prog(t, tc - 0.2, tc + 0.6) * (1 - prog(t, tf - 0.5, tf - 0.2)), { size: 60 });
      note("un feuilleton, qui exagère tout", W / 2, 1380, prog(t, tf - 0.2, tf + 0.6), { size: 56 });
      journal(W / 2, 520, 0.6, 0.06, prog(t, tx - 0.3, tx + 0.3) * (1 - prog(t, tr - 0.3, tr)), "LA BÊTE !");
      // then every paper copies it, one after another
      for (let k = 0; k < 8; k++) {
        const x = 150 + (k % 4) * 260, y = 420 + Math.floor(k / 4) * 230;
        journal(x, y, 0.36, (k % 3 - 1) * 0.12, prog(t, tr - 0.3 + k * 0.12, tr + k * 0.12), k % 2 ? "LE MONSTRE" : "LA BÊTE !");
      }
    },
  };
});

// ---------------------------------------------------------------- soldiers, the king's hunters, a reward
plateau("roi", g => {
  campagne(g, [...foret(-1, -4, 12, 3, 6), ...foret(6, -4, 8, 2.5, 1)]);
  const soldats = [0, 1, 2, 3, 4].map(i => vetu(figure(g, "foule", -2.5 + i * 0.7, 0.2 - (i % 2) * 0.5, { graine: 51 + i }), "soldat"));
  const roi = vetu(figure(g, "autorite", 5.6, -0.3, { graine: 57, accessoires: [] }), "roi");
  roi.articulations.tete.add(couronne());
  const chasseurs = [6.4, 7.0].map((x, i) => vetu(figure(g, "autre", x, 0.25, { graine: 58 + i }), "chasseur"));
  tourneVers(roi, 6.7, 0.3); chasseurs.forEach(c => tourneVers(c, 5.6, -0.3));
  return {
    update(t) {
      const x0 = S("roi");
      soldats.forEach((q, i) => { q.objet.position.x = -2.5 + i * 0.7 + 0.9 * (t - x0); q.objet.rotation.y = Math.PI / 2; q.pose("marche").animer(t + i * 0.3); });
      const tr = wt("roi", "roi", 1.5);
      roi.pose("pointer", fenetre(t, tr + 0.6, 0.6)).animer(t);
      chasseurs.forEach(c => c.animer(t));
      const c = chemin(t, [{ pos: [0.4, 1.7, 6.4], cible: [0.2, 1.0, 0], fov: 30 }, { t: tr - 0.5, d: 0.8, pos: [6.0, 1.7, 6.6], cible: [6.1, 1.05, 0] }]);
      return { ...c, focus: t < tr ? [0.5, 0] : [6, 0] };
    },
    over(t) {
      const tr = wt("roi", "roi", 1.5), tc = wt("roi", "chasseurs", 4), tp = wt("roi", "récompense", 6);
      note("des soldats", W / 2, 420, prog(t, S("roi") + 0.2, S("roi") + 0.8) * (1 - prog(t, tr - 0.6, tr - 0.3)), { size: 68 });
      const a = auDessus(roi, 0.75);
      note("Louis XV", clamp(a.x, 200, W - 200), Math.max(a.y, 420), prog(t, tr + 0.2, tr + 0.7), { size: 62 });
      note("ses meilleurs chasseurs", W / 2, 1380, prog(t, tc - 0.2, tc + 0.6), { size: 58 });
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

// ---------------------------------------------------------------- a hero: Jacques Portefaix, 12
plateau("heros", g => {
  campagne(g, foret(1.8, -4.2, 12, 2.4, 8));
  const amis = [[-0.55, -0.3], [-0.15, -0.55], [0.3, -0.45], [0.65, -0.2], [-0.35, -0.85], [0.15, -0.95]].map(([x, z], i) => enfant(g, "foule", x, z, 61 + i, i % 3 === 1 ? "bergere" : "berger"));
  const jacques = enfant(g, "sujet", 0.05, 0.35, 3, "berger");
  jacques.articulations.mainD.add(baton(1.1));
  amis.slice(0, 3).forEach(a => a.articulations.mainD.add(baton(1.0)));
  const b = bete(g, 2.4, -2.0); b.rotation.y = -2.6;
  return {
    update(t) {
      const tf = wt("heros", "fuir", 3.5), td = wt("heros", "défend", 4.5), te = wt("heros", "études", 8);
      amis.forEach((a, i) => a.expression("peur", fenetre(t, S("heros") + 0.5, 0.6) * (1 - fenetre(t, td + 0.4 + i * 0.1, 0.6))).regarder(0.6, 0).animer(t));
      jacques.pose("pointer", fenetre(t, tf - 0.2, 0.6) * (1 - fenetre(t, te - 0.6, 0.6))).expression("joie", fenetre(t, te, 0.5)).regarder(0.5 * (1 - fenetre(t, te - 0.6, 0.5)), 0).animer(t);
      b.position.x = 2.4 + 2.2 * fenetre(t, td + 0.6, 1.6); // it gives up and goes away
      const c = chemin(t, [{ pos: [0.8, 1.55, 5.6], cible: [0.6, 0.75, -0.6], fov: 30 }, { t: te - 0.8, d: 0.9, pos: [0.15, 1.15, 3.6], cible: [0.05, 0.95, 0.3] }]);
      return { ...c, focus: [0.4, -0.6] };
    },
    over(t) {
      const tj = wt("heros", "Portefaix", 1.5), te = wt("heros", "études", 8);
      note("Jacques Portefaix, 12 ans", W / 2, 400, prog(t, tj - 0.2, tj + 0.6), { size: 60 });
      note("études payées par le roi", W / 2, 500, prog(t, te - 0.3, te + 0.6), { size: 56, color: VERT });
    },
  };
});

// ---------------------------------------------------------------- 1765: the king's hunter, a big wolf at Versailles… and it starts again
plateau("antoine", g => {
  campagne(g, [...foret(-0.6, -3.6, 10, 2.6, 4), ...foret(7.6, -7.5, 12, 3.2, 2)]);
  const chasseur = vetu(figure(g, "autre", -0.5, 0.3, { graine: 71 }), "chasseur");
  const grand = bete(g, 1.0, -2.2); grand.rotation.y = -2.4; grand.scale.setScalar(1.15);
  // Versailles: the stuffed wolf on its stand, the king and the court
  const empaille = bete(g, 7.6, -0.6); empaille.rotation.y = -0.5; empaille.position.y = 0.2;
  const socle = table(1.8, 0.7, 0.18, "#8E6A45"); socle.position.set(7.6, 0, -0.6); g.add(socle);
  const roi = vetu(figure(g, "autorite", 6.7, 0.5, { graine: 72, accessoires: [] }), "roi");
  roi.articulations.tete.add(couronne());
  const cour = [8.4, 8.95].map((x, i) => vetu(figure(g, "foule", x, 0.45 - i * 0.3, { graine: 73 + i }), "courtisan"));
  tourneVers(roi, 7.6, -0.6); cour.forEach(c => tourneVers(c, 7.6, -0.6)); tourneVers(chasseur, 1.0, -2.2);
  // …and in the woods behind Versailles, eyes again
  const autre = bete(g, 7.2, -5.2); autre.rotation.y = -Math.PI / 2;
  const k = t => fenetre(t, revele("antoine", 9) + 0.1, 1.0);
  return {
    update(t) {
      const tv = wt("antoine", "Versailles", 6), tr = revele("antoine", 9);
      chasseur.animer(t);
      roi.pose("pointer", fenetre(t, tv - 0.3, 0.6)).expression("doute", fenetre(t, tr + 0.2, 0.6)).animer(t);
      cour.forEach(c => c.expression("choc", fenetre(t, tr + 0.3, 0.6)).animer(t));
      const n = 0.7 * easeInOut(prog(t, tr - 0.3, tr + 1.0));
      nuit(n); regard(autre, k(t));
      const c = chemin(t, [{ pos: [0.2, 1.65, 6.0], cible: [0.2, 1.0, -0.8], fov: 30 }, { t: wt("antoine", "empaille", 4.5) - 0.5, d: 0.8, pos: [7.6, 1.9, 8.8], cible: [7.6, 1.0, -0.8] }]);
      return { ...c, sombre: n, lumieres: true, focus: t < tv ? [0.2, -0.8] : [7.6, -0.6] };
    },
    over(t) {
      const tn = wt("antoine", "Antoine", 2.5), tl = wt("antoine", "loup", 3.5), tv = wt("antoine", "Versailles", 6), tf = wt("antoine", "fini", 7.5), tr = revele("antoine", 9);
      yeux(autre, k(t), 14);
      note("François Antoine, chasseur du roi", W / 2, 400, prog(t, tn - 0.3, tn + 0.6) * (1 - prog(t, tv - 1.2, tv - 0.9)), { size: 54 });
      note("un très grand loup", W / 2, 500, prog(t, tl - 0.2, tl + 0.6) * (1 - prog(t, tv - 1.2, tv - 0.9)), { size: 58 });
      note("empaillé · montré à Versailles", W / 2, 400, prog(t, tv - 0.6, tv + 0.4) * (1 - prog(t, tf - 0.4, tf - 0.1)), { size: 58 });
      tampon("FINI ?", 420, prog(t, tf - 0.1, tf + 0.7) * (1 - prog(t, tr - 0.2, tr + 0.3)), { size: 130, color: VERT });
      tampon("NON.", 420, prog(t, tr + 0.1, tr + 0.9), { size: 150, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- 1767: Jean Chastel, and the dawn
plateau("chastel", g => {
  campagne(g, [[2.6, -1.4, 2.7], [-2.6, -1.8, 2.9], [0.6, -4.4, 3.1], [3.4, -3.6, 2.8], [-1.6, -4.0, 3], [2.0, -6.0, 3.2], [-3.4, -0.4, 2.6], [4.2, -1.0, 2.5]]);
  const jean = vetu(figure(g, "sujet", -0.6, 0.6, { graine: 81 }), "paysan");
  jean.objet.rotation.y = 0.45;
  const b = bete(g, 1.2, -2.4); b.rotation.y = -2.3;
  const jour = t => easeInOut(prog(t, revele("chastel", 5) - 0.2, revele("chastel", 5) + 2.2));
  const k = t => fenetre(t, S("chastel") + 0.5, 1) * (1 - fenetre(t, revele("chastel", 5) - 0.2, 1.2));
  return {
    fond: t => ciel(0.9 * (1 - jour(t))),
    update(t) {
      const tr = revele("chastel", 5);
      nuit(0.9 * (1 - jour(t))); regard(b, k(t));
      b.position.z = -2.4 - 3 * fenetre(t, tr - 0.2, 1.8);
      jean.expression("joie", fenetre(t, tr + 0.8, 0.8)).regarder(0.6, 0).animer(t);
      const c = chemin(t, [{ pos: [-1.5, 1.5, 5.4], cible: [0.1, 1.05, -0.8], fov: 30 }, { t: tr, d: 2.0, pos: [-1.0, 2.0, 7.0], cible: [0.2, 1.1, -1.2] }]);
      return { ...c, sombre: 0.9 * (1 - jour(t)), lumieres: true };
    },
    over(t) {
      const tj = wt("chastel", "Chastel", 2.5), tr = revele("chastel", 5);
      yeux(b, k(t), 16);
      note("19 juin 1767", W / 2, 390, prog(t, S("chastel") + 0.2, S("chastel") + 0.9), { size: 68 });
      note("Jean Chastel, paysan", W / 2, 490, prog(t, tj, tj + 0.6) * (1 - prog(t, tr + 0.3, tr + 0.6)), { size: 56 });
      note("plus aucune attaque mortelle", W / 2, 490, prog(t, tr + 0.6, tr + 1.6), { size: 60, color: VERT });
    },
  };
});

// ---------------------------------------------------------------- the historians' answer
plateau("explication", g => {
  campagne(g, foret(0, -7, 14, 4, 12));
  const meute = [[-1.2, -0.6, 0.4], [0.2, -1.4, -0.3], [1.3, -0.4, 2.8]].map(([x, z, r]) => { const b = bete(g, x, z); b.rotation.y = r; return b; });
  const centre = new THREE.Vector3(0.1, 0.7, -0.8), bord = new THREE.Vector3();
  return {
    update(t) {
      meute.forEach((b, i) => (b.position.y = 0.01 * Math.sin(t * 2 + i)));
      const p = easeInOut(prog(t, S("explication") - 0.2, E("explication")));
      return { fov: 30, pos: [lerp(0.2, 0.4, p), lerp(1.9, 2.5, p), lerp(7.2, 8.4, p)], cible: [0.1, 0.8, -0.6] };
    },
    over(t) {
      const tp = wt("explication", "plusieurs", 4), tv = wt("explication", "vingt", 9), tc = wt("explication", "chien", 13), ts = wt("explication", "imaginait", 21);
      note("pas un monstre :", W / 2, 390, prog(t, tp - 1.2, tp - 0.6) * (1 - prog(t, ts - 1.4, ts - 1.1)), { size: 60 });
      note("plusieurs loups", W / 2, 490, prog(t, tp - 0.2, tp + 0.5) * (1 - prog(t, ts - 1.4, ts - 1.1)), { size: 74, color: VERT });
      note("≈ 20 000 loups en France", W / 2, 1380, prog(t, tv - 0.3, tv + 0.6) * (1 - prog(t, tc - 0.5, tc - 0.2)), { size: 56 });
      note("ou un mélange chien + loup ?", W / 2, 1380, prog(t, tc - 0.2, tc + 0.6) * (1 - prog(t, ts - 1.4, ts - 1.1)), { size: 56 });
      // one chalk circle around the whole pack: "the" Beast
      const pc = prog(t, ts - 1.2, ts - 0.2);
      if (pc > 0) {
        const c = st.projeter(centre); bord.copy(centre); bord.x += 1.75; const r = Math.min(470, Math.abs(st.projeter(bord).x - c.x));
        chalkCircle(c.x, c.y, r, r * 0.45, pc, { color: ROUGE, width: 9 });
      }
      note("« la » Bête = un seul monstre ?", W / 2, 440, prog(t, ts - 0.8, ts + 0.2), { size: 60, color: ROUGE });
    },
  };
});

// ---------------------------------------------------------------- the conspiracy stories come from novels
plateau("mythes", g => {
  const tb = table(1.1, 0.62); tb.position.set(0, 0, 0.6); g.add(tb);
  const roman = livre("ROMAN", "fiction, 1936", "#3E5A7A"); roman.position.set(0, 0.76, 0.6); g.add(roman);
  const comte = vetu(figure(g, "autorite", -0.75, -0.8, { graine: 91, accessoires: [] }), "noble");
  const dresseur = vetu(figure(g, "foule", 0.75, -0.8, { graine: 92 }), "paysan");
  return {
    update(t) {
      roman.rotation.y = -0.3 + 0.2 * Math.sin(t * 0.7);
      comte.pose("brasCroises").animer(t); dresseur.pose("hausseEpaules", 0.6).animer(t);
      return { fov: 30, pos: [0.3, 1.6, 5.4], cible: [0, 1.05, -0.2] };
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

// ---------------------------------------------------------------- today: a story repeated everywhere becomes a legend
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
  const f = creerFoule({ nombre: 12, colonnes: 4, graine: 15 });
  f.groupe.position.z = -0.4;
  g.add(f.groupe);
  return {
    update(t) {
      f.quidams.forEach((q, i) => q.regarder(0, -0.4).animer(t + i));
      return { fov: 30, pos: [0.2, 2.6, 7.6], cible: [0, 1.1, -1.2] };
    },
    over(t) {
      const tr = wt("aujourdhui", "répétée", 1.5), tl = wt("aujourdhui", "légende", 4), tv = wt("aujourdhui", "vérité", 6);
      f.quidams.forEach((q, i) => { const a = auDessus(q, 0.6); telephone(a.x, a.y, 0.8, prog(t, tr - 0.3 + i * 0.14, tr + i * 0.14)); });
      note("répétée partout…", W / 2, 1300, prog(t, tr - 0.2, tr + 0.6) * (1 - prog(t, tv - 0.6, tv - 0.3)), { size: 62 });
      note("…une légende", W / 2, 1400, prog(t, tl - 0.2, tl + 0.6) * (1 - prog(t, tv - 0.6, tv - 0.3)), { size: 68, color: ROUGE });
      note("la vérité est souvent plus simple", W / 2, 1360, prog(t, tv - 0.3, tv + 0.6), { size: 54, color: VERT });
    },
  };
});

// ---------------------------------------------------------------- what do you think?
plateau("cta", g => {
  campagne(g, foret(0, -4, 10, 3, 3), false);
  const toi = figure(g, "sujet", 0, 0.3, { graine: 3 });
  return {
    fond: () => ciel(0.15),
    update(t) {
      toi.pose("hausseEpaules", fenetre(t, S("cta") + 0.3, 0.6)).expression("doute", fenetre(t, S("cta") + 0.5, 0.5)).animer(t);
      return { fov: 30, pos: [0.25, 1.6, lerp(6.0, 5.5, prog(t, S("cta"), E("cta")))], cible: [0, 1.4, 0.3] };
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

// ---------------------------------------------------------------- sound: soft only (TikTok); reveals get their rising note from the engine
function sons() {
  sfx(wt("journaux", "feuilleton", 4), "paper", { gain: 0.4 });
  for (let k = 0; k < 4; k++) sfx(wt("journaux", "recopient", 6.5) + k * 0.25, "paper", { gain: 0.25 });
  for (let s = S("roi") + 0.2; s < wt("roi", "roi", 1.5) - 0.3; s += 0.53) sfx(s, "step", { gain: 0.22 });
  sfx(wt("roi", "récompense", 6), "chime", { gain: 0.25 });
  sfx(wt("heros", "études", 8), "chime", { gain: 0.3 });
  sfx(revele("chastel", 5) + 0.8, "chime", { gain: 0.25 });
  RUMEURS.forEach(([m], i) => sfx(wt("rumeurs", m, 3 + i * 1.6) - 0.2, "swish", { gain: 0.18 }));
}

demarrer({
  chapitres: { question: "LA QUESTION", attaques: "1764", rumeurs: "LES RUMEURS", journaux: "LES JOURNAUX", roi: "LE ROI", heros: "UN HÉROS", antoine: "1765", chastel: "1767", explication: "LA RÉPONSE", mythes: "LES MYTHES", aujourdhui: "AUJOURD'HUI" },
  // the historical scenes are reconstructions, the rest are illustrations: nothing passes for real footage
  mentions: Object.fromEntries(["hook", "lieu", "question", "attaques", "rumeurs", "journaux", "roi", "heros", "antoine", "chastel", "explication", "mythes", "aujourdhui", "cta"]
    .map(id => [id, ["attaques", "roi", "heros", "antoine", "chastel"].includes(id) ? "Reconstitution" : "Illustration"])),
  sources: {
    titre: "SOURCES", duree: 5, lignes: [
      ["Article « Bête du Gévaudan », Wikipédia (2026).", 36, "MontX"],
      ["Jean-Marc Moriceau, La Bête du Gévaudan, 1764-1767, Tallandier, 2021.", 32],
      ["Jay M. Smith, Monsters of the Gévaudan, Harvard University Press, 2011.", 32],
      ["Scènes reconstituées en 3D · voix de synthèse.", 28],
    ],
  },
  musique: { style: "dark", root: 38, room: true, tick: true },
  sons,
  voix: { bed: 0.24, duck: 0.6 },
});
