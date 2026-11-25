// « Une journée de Lucien, soldat de la drôle de guerre » — January 1940, a fort of the Maginot Line.
// First-person view: the camera is Lucien's eyes (eye height, a slight sway when he walks, his hands and what they
// hold: binoculars, mess tin, letter, cards), eyelids at waking and at lights out. Same montage as v14/v15:
// PS2 characters (lib/ps2.js) in low-poly sets, vector text (lib/epure.js), log-book time at the top.
// No violence, no weapon in hand, nothing burning, no cigarette, no alcohol, no symbol of any army: the soldiers
// across the border are grey shapes far away in the snow. Every character is invented; real people never speak.
import * as THREE from "three";
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidamPS2, qualitePS2, texturePS2, PEINTURES } from "../lib/ps2.js";
import { vue, fondCarte, FRANCE } from "../v15-nuage-tchernobyl/carte.js";

const TAU = Math.PI * 2;
const AMBRE = "#E3A54A";
qualitePS2(3);
const st = creerStudio({ antialias: true });
st.sol.visible = false; st.gl.shadowMap.enabled = false; st.key.castShadow = false;
st.scene.fog = new THREE.Fog("#050506", 9, 30);
const lam = o => new THREE.MeshLambertMaterial(o);
const FILTRE = "saturate(0.55) sepia(0.16) contrast(1.07)";

// ---------------------------------------------------------------- painted textures
function peint(w, h, f, rx = 1, ry = 1) { const t = texturePS2(w, h, f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function grainDe(x, w, h, a, graine, n = 500) { const r = rng(graine); for (let i = 0; i < n; i++) { const v = r(); x.fillStyle = v > 0.5 ? `rgba(255,255,255,${a * v})` : `rgba(0,0,0,${a * 1.6 * (1 - v)})`; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 2); } }
const beton = c => (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); grainDe(x, w, h, 0.09, 3, 900); x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, h - 3, w, 3); };
const murPeint = (x, w, h) => { x.fillStyle = "#9A9886"; x.fillRect(0, 0, w, h); x.fillStyle = "#5E6450"; x.fillRect(0, h * 0.62, w, h * 0.38); x.fillStyle = "#2C2E26"; x.fillRect(0, h * 0.62, w, 3); grainDe(x, w, h, 0.07, 5, 900); };
const neige = (x, w, h) => { x.fillStyle = "#D8DCDC"; x.fillRect(0, 0, w, h); grainDe(x, w, h, 0.06, 7, 700); };
const bois = (x, w, h) => { x.fillStyle = "#5E5040"; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + 0.08 * ((i * 5) % 3) / 3})`; x.fillRect(0, i * h / 8, w, 2); } grainDe(x, w, h, 0.07, 9, 400); };
const couverture = (x, w, h) => { x.fillStyle = "#6A6650"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(0, h * 0.15, w, 4); x.fillRect(0, h * 0.85, w, 4); grainDe(x, w, h, 0.08, 11, 600); };

const boite = (g, m, w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
const plan = (g, m, w, h, x, y, z, ry = 0, rx = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); g.add(p); return p; };
const cylindre = (g, m, r1, r2, h, x, y, z, n = 12) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), m); c.position.set(x, y, z); g.add(c); return c; };
function piece(g, x0, x1, z0, z1, h, mur, sol, plafond = "#2A2C28") {
  const lx = x1 - x0, lz = z1 - z0, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  plan(g, lam({ map: peint(64, 64, sol, lx / 1.5, lz / 1.5) }), lx, lz, xc, 0, zc, 0, -Math.PI / 2);
  const m = (w, x, z, ry) => plan(g, lam({ map: peint(64, 128, mur, w / 1.6, 1) }), w, h, x, h / 2, z, ry);
  m(lx, xc, z0, 0); m(lx, xc, z1, Math.PI); m(lz, x0, zc, Math.PI / 2); m(lz, x1, zc, -Math.PI / 2);
  plan(g, lam({ map: peint(64, 64, beton(plafond), lx / 2, lz / 2) }), lx, lz, xc, h, zc, 0, Math.PI / 2);
}
const ampoules = [];
function ampoule(g, x, y, z, puissance = 3) {
  const m = lam({ color: "#2A2620", emissive: "#FFD9A0", emissiveIntensity: 1 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m); b.position.set(x, y, z); g.add(b);
  cylindre(g, lam({ color: "#2E2E2A" }), 0.012, 0.012, 0.25, x, y + 0.15, z, 6);
  const l = new THREE.PointLight("#FFD6A0", puissance, 0, 1.6); l.position.set(x, y - 0.1, z); g.add(l);
  const a = { m, l, p: puissance }; ampoules.push(a); return a;
}

// ---------------------------------------------------------------- the dormitory under the ground
const dortoir = new THREE.Group(); st.plateau.add(dortoir);
const metal = lam({ color: "#4A4C46" }), matelas = lam({ color: "#8A8C80" }), couv = lam({ map: peint(64, 64, couverture) });
const COUCHETTES = [];
{
  piece(dortoir, -3, 3, -9, 4, 2.9, murPeint, beton("#5A5A52"), "#3A3C36");
  for (const s of [-1, 1]) for (let z = 2.6; z > -6; z -= 2.1) {
    const x = s * 2.45;
    for (const [px, pz] of [[-0.4, -0.95], [0.4, -0.95], [-0.4, 0.95], [0.4, 0.95]]) boite(dortoir, metal, 0.04, 2.3, 0.04, x + px, 1.15, z + pz);
    for (const y of [0.42, 1.18, 1.94]) {
      boite(dortoir, metal, 0.86, 0.04, 1.95, x, y, z); boite(dortoir, matelas, 0.8, 0.1, 1.86, x, y + 0.07, z);
      boite(dortoir, couv, 0.82, 0.05, 1.2, x, y + 0.14, z + 0.3); boite(dortoir, lam({ color: "#C8C6BA" }), 0.5, 0.07, 0.3, x, y + 0.15, z - 0.75);
      COUCHETTES.push({ x, y, z, s });
    }
  }
  for (const x of [-0.6, 0.6]) { const c = cylindre(dortoir, lam({ color: "#5A5C54" }), 0.06, 0.06, 13, x, 2.75, -2.5, 8); c.rotation.x = Math.PI / 2; }
  boite(dortoir, lam({ map: peint(64, 64, bois) }), 1.0, 2.1, 0.06, 0, 1.05, -8.97);                     // the door at the end
  boite(dortoir, lam({ map: peint(64, 64, bois) }), 1.7, 0.06, 0.85, 0, 0.76, -6.6);                     // the table for the evening
  for (const sx of [-0.78, 0.78]) for (const sz of [-6.95, -6.25]) boite(dortoir, metal, 0.05, 0.74, 0.05, sx, 0.37, sz);
  for (const z of [-5.9, -7.3]) boite(dortoir, lam({ map: peint(64, 64, bois) }), 1.6, 0.05, 0.3, 0, 0.45, z);
  for (const z of [2.0, -1.5, -5.0, -7.6]) ampoule(dortoir, 0, 2.5, z, 3);
}
const veilleuse = new THREE.PointLight("#7A90B0", 0, 0, 1.4); veilleuse.position.set(0, 2.4, -8.5); dortoir.add(veilleuse);
const cartesTable = new THREE.Group(); dortoir.add(cartesTable);
for (let i = 0; i < 7; i++) { const c = boite(cartesTable, lam({ color: i % 3 ? "#E6E2D6" : "#C8C2B2" }), 0.07, 0.004, 0.1, -0.3 + i * 0.09 + (i % 2) * 0.02, 0.8, -6.6 + (i % 3 - 1) * 0.06); c.rotation.y = (i - 3) * 0.25; }
const LIT = COUCHETTES.find(c => c.s === -1 && Math.abs(c.z - 0.5) < 0.01 && c.y < 0.5);   // Lucien's bunk: left, lower

// ---------------------------------------------------------------- the gallery and the little electric train
const galerie = new THREE.Group(); st.plateau.add(galerie);
const LAMPES_G = [];
{
  const voute = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 260, 18, 1, true, -Math.PI / 2, Math.PI), lam({ map: peint(64, 64, beton("#7A7A70"), 6, 60), side: THREE.BackSide }));
  voute.rotation.x = Math.PI / 2; voute.rotation.z = Math.PI / 2; voute.position.set(0, 1.0, -120); galerie.add(voute);
  plan(galerie, lam({ map: peint(64, 64, beton("#5E5E56"), 2, 100) }), 3.8, 260, 0, 0, -120, 0, -Math.PI / 2);
  for (const s of [-1, 1]) { boite(galerie, lam({ map: peint(64, 64, beton("#76766C"), 1, 60) }), 0.05, 1.0, 260, s * 1.9, 0.5, -120); boite(galerie, lam({ color: "#3E3A34" }), 0.06, 0.06, 260, s * 0.3, 0.05, -120); }
  for (let z = 6; z > -250; z -= 7) { const m = lam({ color: "#2A2620", emissive: "#FFD9A0", emissiveIntensity: 1 }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m); b.position.set(0, 2.75, z); galerie.add(b); LAMPES_G.push(b); }
  const c = cylindre(galerie, lam({ color: "#5A5C54" }), 0.08, 0.08, 260, 1.3, 2.3, -120, 8); c.rotation.x = Math.PI / 2;
}
const train = new THREE.Group(); galerie.add(train);
{
  boite(train, lam({ color: "#3E4A3C" }), 1.0, 1.1, 1.8, 0, 0.75, -2.2); boite(train, lam({ color: "#2A2E28" }), 0.9, 0.2, 1.7, 0, 1.4, -2.2);   // the locomotive
  boite(train, lam({ color: "#1A1E1A", emissive: "#FFE0A8", emissiveIntensity: 0.9 }), 0.16, 0.12, 0.02, 0.3, 0.9, -3.11);
  for (let w = 0; w < 3; w++) {
    const z = w * 2.1; boite(train, metal, 1.1, 0.12, 1.9, 0, 0.32, z);
    for (const [cx, cz, h] of [[-0.25, -0.4, 0.45], [0.25, 0.35, 0.35], [0.25, -0.45, 0.3]]) boite(train, lam({ map: peint(64, 64, bois) }), 0.42, h, 0.5, cx, 0.38 + h / 2, z + cz);
    for (const s of [-1, 1]) for (const dz of [-0.6, 0.6]) { const r = cylindre(train, metal, 0.12, 0.12, 0.06, s * 0.45, 0.14, z + dz, 10); r.rotation.z = Math.PI / 2; }
  }
}
const feuTrain = new THREE.PointLight("#FFD6A0", 2.5, 0, 1.4); feuTrain.position.set(0, 2.2, 0.5); train.add(feuTrain);

// ---------------------------------------------------------------- outside: the observation block in the snow, the forest across
const dehors = new THREE.Group(); st.plateau.add(dehors);
{
  plan(dehors, lam({ map: peint(64, 64, neige, 40, 40) }), 300, 300, 0, 0, -60, 0, -Math.PI / 2);
  const bet = lam({ map: peint(64, 64, beton("#8A8A80"), 2, 2) });
  boite(dehors, bet, 4.5, 2.2, 4.0, -2.6, 1.1, 2.6); boite(dehors, lam({ color: "#E2E4E2" }), 4.6, 0.12, 4.1, -2.6, 2.26, 2.6);   // the block, snow on top
  const cl = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 8, 0, TAU, 0, Math.PI / 2), lam({ color: "#5A5C56" })); cl.position.set(-2.2, 2.3, 1.6); dehors.add(cl);
  boite(dehors, lam({ color: "#2A2C28" }), 0.6, 0.12, 0.05, -2.2, 2.62, 0.88);
  const sapin = (x, z, s) => { cylindre(dehors, lam({ color: "#3A2E24" }), 0.1 * s, 0.12 * s, 1 * s, x, 0.5 * s, z, 6); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.3 - k * 0.32) * s, 1.6 * s, 8), lam({ color: k === 2 ? "#C8D0CC" : "#2E3E32" })); c.position.set(x, (1.3 + k * 1.0) * s, z); dehors.add(c); } };
  const r = rng(5);
  for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * 70, z = 6 - r() * 26; if (Math.abs(x) < 5 && z > -8) continue; if (Math.abs(x - (0.4 + 3.4 * Math.max(0, -z) / 57)) < 4) continue; sapin(x, z, 0.8 + r() * 0.7); }
  for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 140, z = -62 - r() * 40; if (Math.abs(x - 4) < 5 && z > -70) continue; sapin(x, z, 0.9 + r() * 0.8); }    // the forest on the other side
  for (let i = 0; i < 12; i++) { const x = -3 + i * 0.6; boite(dehors, lam({ color: "#4A3E30" }), 0.08, 0.9, 0.08, x, 0.45, -3.5); }   // a low fence
  boite(dehors, lam({ color: "#4A3E30" }), 7, 0.05, 0.04, 0.3, 0.75, -3.5);
}

// ---------------------------------------------------------------- the mess hall
const refectoire = new THREE.Group(); st.plateau.add(refectoire);
let marmite;
{
  piece(refectoire, -4, 4, -11, 4, 3.0, murPeint, beton("#5A5A52"), "#3A3C36");
  const b = lam({ map: peint(64, 64, bois) });
  for (const x of [-1.6, 1.6]) {
    boite(refectoire, b, 0.9, 0.06, 11, x, 0.76, -3.5); for (const z of [-8.5, -3.5, 1.5]) boite(refectoire, metal, 0.06, 0.74, 0.06, x, 0.37, z);
    for (const s of [-1, 1]) boite(refectoire, b, 0.3, 0.05, 11, x + s * 0.75, 0.45, -3.5);
    for (let z = -8; z < 1.5; z += 0.8) { const g = cylindre(refectoire, lam({ color: "#9A9C94" }), 0.09, 0.08, 0.06, x + (z % 1.6 ? 0.25 : -0.25), 0.82, z, 10); }
  }
  boite(refectoire, lam({ color: "#6A6A60" }), 5, 1.0, 0.8, 0, 0.5, -9.6);                                   // the counter
  marmite = cylindre(refectoire, lam({ color: "#8A8C86" }), 0.45, 0.4, 0.6, -0.8, 1.3, -9.6, 16);
  cylindre(refectoire, lam({ color: "#7A7C76" }), 0.3, 0.28, 0.4, 0.9, 1.2, -9.6, 14);
  for (const z of [1.0, -3.0, -7.0]) ampoule(refectoire, 0, 2.6, z, 3.5);
}

// ---------------------------------------------------------------- the cast (all invented): French soldiers of 1940
const acteurs = new THREE.Group(); st.plateau.add(acteurs);
function alea(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function soldat(g, o = {}) {
  const r = n => alea(g * 17 + n), kaki = o.kaki || ["#6E6646", "#686244", "#726A4A"][Math.floor(r(1) * 3)];
  const peau = o.peau || ["#E8C3A2", "#DDB38E", "#F0CFB2", "#C99A72", "#E3BC98"][Math.floor(r(2) * 5)];
  return {
    peau, iris: ["#3A2416", "#4A6A8A", "#3E5A4A", "#5A4028"][Math.floor(r(3) * 4)], cheveux: o.cheveux || ["#17120F", "#2E2018", "#4A3222", "#6E5434", "#8A7450"][Math.floor(r(4) * 5)],
    levres: "#A0705A", coiffure: o.coiffure || (r(5) > 0.5 ? "court" : "ras"),
    haut: PEINTURES.chemise({ couleur: kaki, poches: true, ceinture: "#3A3020" }), hautCouleur: kaki, manche: { couleur: kaki },
    bas: PEINTURES.uni({ couleur: "#5C5640" }), basCouleur: "#5C5640", chaussure: { couleur: "#2A2018", semelle: "#140E0A", lacets: "#140E0A" },
  };
}
function acteur(graine, design, taille = 1) { const q = creerQuidamPS2({ role: "foule", graine, design, taille }); acteurs.add(q.objet); return q; }
const KAKI_CASQUE = lam({ color: "#5E5C46" });
function casque(q) {   // the Adrian helmet: a dome, a brim longer at front and back, a crest
  const g = new THREE.Group(); q.articulations.tete.add(g);
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, TAU, 0, Math.PI / 2), KAKI_CASQUE); d.position.y = 0.01; d.scale.set(1, 0.82, 1.08); g.add(d);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.012, 18), KAKI_CASQUE); b.position.y = 0.015; b.scale.set(0.9, 1, 1.2); g.add(b);
  boite(g, KAKI_CASQUE, 0.014, 0.022, 0.17, 0, 0.13, 0);
  return g;
}
function calot(q) { const g = new THREE.Group(); q.articulations.tete.add(g); const c = boite(g, lam({ color: "#5E5A42" }), 0.11, 0.06, 0.24, 0.03, 0.125, 0); c.rotation.z = -0.15; return g; }
const sergent = acteur(5, soldat(5, { cheveux: "#3A2A1E", coiffure: "ras" }), 1.04);
const marcel = acteur(6, soldat(6, { cheveux: "#7A5634", coiffure: "court" }), 0.98);
const vaguemestre = acteur(7, soldat(7, { cheveux: "#8A8A84" }), 1.0);
const cuisinier = acteur(8, { ...soldat(8), haut: PEINTURES.chemise({ couleur: "#D8D4C8", poches: false }), hautCouleur: "#D8D4C8", manche: { couleur: "#D8D4C8" } }, 1.06);
const copains = Array.from({ length: 8 }, (_, i) => acteur(20 + i, soldat(20 + i), 0.95 + 0.08 * alea(i)));
const loin = [0, 1].map(i => acteur(40 + i, { ...soldat(40 + i, { kaki: "#5A5E5A" }), haut: PEINTURES.uni({ couleur: "#5A5E5A" }), hautCouleur: "#5A5E5A", manche: { couleur: "#5A5E5A" }, bas: PEINTURES.uni({ couleur: "#4A4E4A" }) }, 1.0));
const casqueSergent = casque(sergent);
calot(marcel); calot(vaguemestre); copains.forEach((q, i) => { if (i % 2) calot(q); });
const sac = boite(vaguemestre.articulations.buste, lam({ color: "#5A4630" }), 0.3, 0.32, 0.12, 0.22, 0.12, 0.05);
const TOUS = [sergent, marcel, vaguemestre, cuisinier, ...copains, ...loin];

// ---------------------------------------------------------------- Lucien's hands (first person), and what they hold
const mains = new THREE.Group(); st.scene.add(mains);
const pivot = new THREE.Object3D();
const MAINS = {};
{
  const manche = lam({ color: "#6A6244" }), peau = lam({ color: "#E2B994" });
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); mains.add(g); MAINS[s] = g;
    boite(g, manche, 0.1, 0.1, 0.42, 0, 0, -0.2); boite(g, peau, 0.085, 0.045, 0.11, 0, 0.005, 0.05);
    boite(g, peau, 0.03, 0.03, 0.06, -s * 0.045, 0.01, 0.02);
  }
  MAINS.jumelles = new THREE.Group(); mains.add(MAINS.jumelles);
  for (const s of [-1, 1]) { const c = cylindre(MAINS.jumelles, lam({ color: "#2A2A26" }), 0.028, 0.032, 0.13, s * 0.034, 0, 0, 10); c.rotation.x = Math.PI / 2; }
  boite(MAINS.jumelles, lam({ color: "#2A2A26" }), 0.04, 0.02, 0.05, 0, 0.01, 0);
  MAINS.gamelle = new THREE.Group(); mains.add(MAINS.gamelle);
  { const g = cylindre(MAINS.gamelle, lam({ color: "#9A9C94" }), 0.11, 0.1, 0.07, 0, 0, 0, 16); g.scale.z = 0.75; const s = cylindre(MAINS.gamelle, lam({ color: "#8A7A58", emissive: "#2A2010" }), 0.1, 0.1, 0.005, 0, 0.032, 0, 16); s.scale.z = 0.75; }
  MAINS.cartes = new THREE.Group(); mains.add(MAINS.cartes);
  for (let i = 0; i < 5; i++) { const c = boite(MAINS.cartes, lam({ color: "#E8E4D8" }), 0.06, 0.09, 0.003, 0, 0.04, 0); c.position.x = (i - 2) * 0.018; c.rotation.z = (i - 2) * -0.18; c.position.y = 0.04 - Math.abs(i - 2) * 0.004; }
}
/** Places the hands in front of the eye at pos looking at cible: o.quoi ("jumelles" | "gamelle" | "cartes" | "vide"), o.leve 0..1. */
function poserMains(pos, cible, o = {}) {
  const quoi = o.quoi || null;
  mains.visible = !!quoi;
  if (!quoi) return;
  pivot.position.set(...pos); pivot.lookAt(...cible);
  mains.position.copy(pivot.position); mains.quaternion.copy(pivot.quaternion);
  const k = o.leve ?? 1, ob = { jumelles: MAINS.jumelles, gamelle: MAINS.gamelle, cartes: MAINS.cartes };
  for (const [n, g] of Object.entries(ob)) g.visible = n === quoi;
  if (quoi === "jumelles") {
    MAINS.jumelles.position.set(0, lerp(-0.35, -0.01, k), lerp(0.35, 0.16, k));
    MAINS[-1].position.set(0.06, lerp(-0.4, -0.05, k), lerp(0.3, 0.17, k)); MAINS[1].position.set(-0.06, lerp(-0.4, -0.05, k), lerp(0.3, 0.17, k));
    MAINS[-1].rotation.set(-0.5, 0.3, 0); MAINS[1].rotation.set(-0.5, -0.3, 0);
  } else if (quoi === "gamelle") {
    MAINS.gamelle.position.set(0, -0.21, 0.42); MAINS[-1].position.set(0.13, -0.21, 0.42); MAINS[1].position.set(-0.13, -0.21, 0.42);
    MAINS[-1].rotation.set(0, 0.5, 0); MAINS[1].rotation.set(0, -0.5, 0);
  } else if (quoi === "cartes") {
    MAINS.cartes.position.set(-0.05, -0.17, 0.34); MAINS.cartes.rotation.set(-0.35, 0, 0);
    MAINS[1].position.set(-0.06, -0.24, 0.33); MAINS[1].rotation.set(-0.9, 0, 0); MAINS[-1].position.set(0.16, -0.3, 0.4); MAINS[-1].rotation.set(0, 0.4, 0);
  } else {   // the hands low, holding a sheet of paper (drawn in 2D over them)
    MAINS[-1].position.set(0.2, -0.32, 0.38); MAINS[1].position.set(-0.2, -0.32, 0.38); MAINS[-1].rotation.set(-0.7, 0.3, 0); MAINS[1].rotation.set(-0.7, -0.3, 0);
  }
}

// ---------------------------------------------------------------- gestures and helpers (as in v14 / v15)
const vers = (o, cle, v, k) => { o.rotation[cle] = lerp(o.rotation[cle], v, k); };
function tendLettre(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -1.25, k); vers(a.epauleD, "z", -0.1, k); vers(a.coudeD, "x", -0.25, k); }
function mange(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -0.7, k); vers(a.coudeD, "x", -1.8, k); }
function jouer(q, t, o = {}) {
  q.objet.visible = !o.cache;
  if (o.cache) return;
  q.objet.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); q.objet.rotation.set(o.rx || 0, o.ry ?? 0, 0);
  if (Array.isArray(o.pose)) q.transitionPose(o.pose[0], o.pose[1], o.pose[2]); else q.pose(o.pose || "debout");
  if (o.expr) q.expression(o.expr[0], o.expr[1]); else q.expression("neutre", 0);
  q.regarder(...(o.regard || [0, 0])); q.parler(o.parle || 0);
  q.animer(t + (o.phase || 0));
  tendLettre(q, o.tend || 0); mange(q, o.mange || 0);
  if (o.tete) q.articulations.cou.rotation.y += o.tete;
}
function bouche(id, t) {
  const sg = EP.SEG[id];
  if (!sg || t < sg.start || t > sg.next) return 0;
  for (const s of sg.sentences) for (const w of s.words) if (t >= w.s - 0.04 && t <= w.e + 0.02) return 0.35 + 0.65 * Math.abs(Math.sin((t - w.s) * TAU * 3.2));
  return 0;
}
function seuls(liste) { for (const q of TOUS) if (!liste.includes(q)) q.objet.visible = false; }
function decor(g, { ciel, cle, contre, fond = "#050506", fog = [9, 30] }) {
  for (const x of [dortoir, galerie, dehors, refectoire]) x.visible = x === g;
  st.ciel.intensity = ciel; st.key.intensity = cle; st.contre.intensity = contre;
  st.scene.background = new THREE.Color(fond); st.scene.fog.color.set(fond); st.scene.fog.near = fog[0]; st.scene.fog.far = fog[1];
}
function lumieres(liste, k) { for (const a of liste) { a.m.emissiveIntensity = k; a.l.intensity = a.p * k; } }
const AMP_D = ampoules.slice(0, 4), AMP_R = ampoules.slice(4);

function miseDortoir(t, o = {}) {
  casqueSergent.visible = false;
  decor(dortoir, { ciel: 0.55 * (o.lum ?? 1), cle: 0.25 * (o.lum ?? 1), contre: 0.25, fog: [8, 24] });
  st.ciel.color.set("#D8CCB4"); st.ciel.groundColor.set("#2A2620"); st.key.position.set(0, 3, 2); st.key.target.position.set(0, 0, -3);
  lumieres(AMP_D, o.lum ?? 1); veilleuse.intensity = 2.2 * (1 - (o.lum ?? 1));
  cartesTable.visible = !!o.cartes;
  const actifs = [];
  for (const [q, def] of o.roles || []) if (def) { jouer(q, t, def); actifs.push(q); }
  seuls(actifs);
}
function miseGalerie(t, o = {}) {
  decor(galerie, { ciel: 0.5, cle: 0.2, contre: 0.2, fog: [6, 40] });
  st.ciel.color.set("#E0D2B8"); st.ciel.groundColor.set("#2A2620");
  train.position.z = o.trainZ ?? 0;
  const actifs = [];
  for (const [q, def] of o.roles || []) if (def) { jouer(q, t, def); actifs.push(q); }
  seuls(actifs);
}
function miseDehors(t, o = {}) {
  casqueSergent.visible = true;
  decor(dehors, { ciel: 1.25, cle: 0.6, contre: 0.4, fond: "#B4BAB8", fog: [12, 95] });
  st.ciel.color.set("#E6EAEA"); st.ciel.groundColor.set("#8A8E8C"); st.key.position.set(-6, 10, 6); st.key.target.position.set(0, 0, -10); st.key.color.set("#E8ECEC");
  const actifs = [];
  for (const [q, def] of o.roles || []) if (def) { jouer(q, t, def); actifs.push(q); }
  seuls(actifs);
}
function miseRefectoire(t, o = {}) {
  decor(refectoire, { ciel: 0.6, cle: 0.3, contre: 0.25, fog: [10, 28] });
  st.ciel.color.set("#D8CCB4"); st.ciel.groundColor.set("#2A2620"); st.key.position.set(0, 3, 2); st.key.target.position.set(0, 0, -4);
  lumieres(AMP_R, 1);
  const actifs = [];
  for (const [q, def] of o.roles || []) if (def) { jouer(q, t, def); actifs.push(q); }
  seuls(actifs);
}

// ---------------------------------------------------------------- camera: Lucien's eyes (shots joined by a short dissolve)
const tampon = Object.assign(document.createElement("canvas"), { width: W, height: H });
const doux = u => u * u * (3 - 2 * u);
const glisse = (a, b = a) => u => { const k = doux(u); return { fov: lerp(a.fov ?? 62, b.fov ?? a.fov ?? 62, k), pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), cible: a.cible.map((v, i) => lerp(v, b.cible[i], k)) }; };
/** A walk: eased move from a to b with the sway of the steps. */
const marche = (a, b) => (u, t) => { const c = glisse(a, b)(u), w = Math.sin(u * Math.PI) ; return { ...c, pos: [c.pos[0] + 0.02 * Math.sin(t * TAU * 0.9) * w, c.pos[1] + 0.025 * Math.abs(Math.sin(t * TAU * 0.9)) * w, c.pos[2]] }; };
const P = (t0, cam, mise, o = {}) => ({ t0, cam, mise, ...o });
function prise(t, p, fin) {
  if (p.cam === "2d") { p.mise(t); return; }
  const c = typeof p.cam === "function" ? p.cam(clamp((t - p.t0) / Math.max(0.01, fin - p.t0)), t) : p.cam;
  p.mise(t);
  poserMains(c.pos, c.cible, p.mains ? p.mains(t) : {});
  st.tourner(ctx, 0, 0, W, H, { fov: c.fov ?? 62, pos: c.pos, cible: c.cible, filtre: FILTRE });
  if (p.apres) p.apres(t);
}
function filmer(t, liste, fin) {
  let i = 0;
  while (i + 1 < liste.length && t >= liste[i + 1].t0) i++;
  const bout = j => (j + 1 < liste.length ? liste[j + 1].t0 : fin), d = t - liste[i].t0;
  if (i > 0 && d < 0.3) {
    prise(t, liste[i - 1], bout(i - 1) + 0.3); tampon.getContext("2d").drawImage(cv, 0, 0);
    fondNoir(); prise(t, liste[i], bout(i));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - d / 0.3; ctx.drawImage(tampon, 0, 0); ctx.restore();
  } else prise(t, liste[i], bout(i));
  degradesTexte();
}
function degradesTexte() {
  let g = ctx.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, "rgba(4,4,3,.88)"); g.addColorStop(0.6, "rgba(4,4,3,.42)"); g.addColorStop(1, "rgba(4,4,3,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 760);
  g = ctx.createLinearGradient(0, 1100, 0, H); g.addColorStop(0, "rgba(4,4,3,0)"); g.addColorStop(0.45, "rgba(4,4,3,.4)"); g.addColorStop(1, "rgba(4,4,3,.85)"); ctx.fillStyle = g; ctx.fillRect(0, 1100, W, H - 1100);
}
/** Eyelids: k = 0 open, 1 shut (two soft dark curves closing from top and bottom). */
function paupieres(k) {
  if (k <= 0.001) return;
  ctx.save(); ctx.fillStyle = "#030303";
  const h = (H / 2 + 120) * k;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, h - 120); ctx.quadraticCurveTo(W / 2, h + 120, 0, h - 120); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, H - h + 120); ctx.quadraticCurveTo(W / 2, H - h - 120, 0, H - h + 120); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** The binoculars: everything dark except two overlapping round fields. */
function masqueJumelles(k) {
  if (k <= 0) return;
  if (!masqueJumelles.c) {   // the mask drawn once: black, with the union of the two round fields cut out
    const c = masqueJumelles.c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#030303"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "destination-out";
    for (const s of [-1, 1]) { x.beginPath(); x.arc(CX + s * 170, 900, 300, 0, TAU); x.fill(); }
  }
  ctx.save(); ctx.globalAlpha = k; ctx.drawImage(masqueJumelles.c, 0, 0); ctx.restore();
  ctx.save(); ctx.globalAlpha = k; const g = ctx.createRadialGradient(CX, 900, 250, CX, 900, 520); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
const FLOCONS = (() => { const r = rng(9); return Array.from({ length: 220 }, () => ({ x: r() * W, v: 60 + r() * 90, s: 2 + r() * 4, ph: r() * 10, d: r() })); })();
function chuteNeige(t, a = 1) {
  ctx.save(); ctx.fillStyle = "#F2F2EE";
  for (const f of FLOCONS) { const y = ((t * f.v + f.ph * 300) % (H + 40)) - 20, x = (f.x + 30 * Math.sin(t * 0.6 + f.ph)) % W; ctx.globalAlpha = a * (0.35 + 0.5 * f.d); ctx.beginPath(); ctx.arc(x, y, f.s, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function vapeur(t, x, y, a = 1) {   // steam over the soup (soft, slow)
  ctx.save(); ctx.fillStyle = "#F2EEE4";
  for (let i = 0; i < 14; i++) { const u = ((t * 0.35 + i / 14) % 1), r = 30 + 60 * u; ctx.globalAlpha = a * 0.12 * Math.sin(u * Math.PI); ctx.beginPath(); ctx.arc(x + 40 * Math.sin(i * 2.1 + t * 0.7) * u, y - 320 * u, r, 0, TAU); ctx.fill(); }
  ctx.restore();
}
/** A sheet of paper held in front of the eyes (the letter): drawn here, its writing in texte(). */
function feuillePapier(t, k, y0 = 330) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.translate(CX, y0 + 520 + (1 - k) * 200); ctx.rotate(-0.03);
  ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(-405, -505, 830, 1060);
  ctx.fillStyle = "#E6DDC8"; ctx.fillRect(-420, -520, 830, 1060);
  ctx.strokeStyle = "rgba(60,80,120,.18)"; ctx.lineWidth = 2; for (let y = -420; y < 520; y += 74) { ctx.beginPath(); ctx.moveTo(-380, y); ctx.lineTo(370, y); ctx.stroke(); }
  ctx.restore();
}
function ligneEcrite(str, y, t, t0, cps = 26, o = {}) {   // a line that writes itself on the letter
  const n = Math.floor(clamp((t - t0) * cps, 0, str.length));
  if (n > 0) ecrire(str.slice(0, n), 140, y, o.taille || 52, { align: "left", couleur: o.couleur || "#2A3550", contour: false, alpha: o.alpha ?? 1 });
}

// ---------------------------------------------------------------- the map: France, Germany, the Maginot Line
const MAGINOT = [[5.75, 49.52], [6.35, 49.47], [6.75, 49.3], [7.05, 49.12], [7.6, 49.05], [8.15, 48.97], [7.9, 48.6], [7.75, 48.2], [7.55, 47.7]];
const CARTE_V = () => vue(30, 300, 1020, 1300, 6.0, 48.6, 150);
function carte(t, o = {}) {
  const V = CARTE_V();
  fondCarte(ctx, V, { trait: 2.4, france: "#3E453A", terre: "#2A2E28", bordFrance: "#C8C4B4" });
  if (o.ligne > 0) {
    const pts = MAGINOT.map(V.p);
    ctx.save(); ctx.strokeStyle = AMBRE; ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 0.9;
    const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])), L = seg.reduce((a, b) => a + b, 0);
    let reste = L * Math.min(1, o.ligne); ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length && reste > 0; i++) { const k = Math.min(1, reste / seg[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); reste -= seg[i - 1]; }
    ctx.stroke();
    if (o.forts) for (let i = 0; i < pts.length; i++) { const a = clamp(o.forts * pts.length - i); if (a <= 0) continue; ctx.globalAlpha = a; ctx.fillStyle = "#EDE7DA"; ctx.fillRect(pts[i][0] - 12, pts[i][1] - 12, 24, 24); }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- shots
const OEIL_LIT = { pos: [LIT.x + 0.05, LIT.y + 0.33, LIT.z - 0.45], cible: [LIT.x + 0.15, LIT.y + 1.2, LIT.z + 0.2], fov: 62 };
const VERS_ALLEE = { pos: [LIT.x + 0.15, LIT.y + 0.38, LIT.z - 0.45], cible: [0, 1.4, -2.2], fov: 62 };
const ASSIS_LIT = { pos: [-1.95, 1.15, LIT.z], cible: [1.95, 1.08, LIT.z], fov: 36 };
scene("hook", {
  dessin(t) {
    const tr = EP.T.reveals[0];
    filmer(t, [P(-1, glisse(OEIL_LIT, VERS_ALLEE), t => miseDortoir(t, { lum: 0.45, roles: [[copains[0], { x: 2.45, y: 0.47, z: LIT.z + 0.15, rx: -Math.PI / 2, ry: Math.PI, expr: ["joie", 0.9] }], [copains[1], { x: 2.45, y: 1.23, z: LIT.z - 2.0, rx: -Math.PI / 2, ry: Math.PI, expr: ["joie", 0.9] }]] }))], E("hook") + 0.4);
    paupieres(1 - va(t, 0.2, 1.4) + 0.5 * Math.max(0, Math.sin(clamp((t - 2.0) / 0.35) * Math.PI)));
  },
  texte(t) {
    const tr = EP.T.reveals[0];
    texte("LUCIEN", CX, 420, 140, t, mot("hook", "Lucien", 1) - 0.1, { fin: tr - 0.3 });
    texte("20 ANS · SOLDAT", CX, 540, ajuste("20 ANS · SOLDAT", 64), t, mot("hook", "soldat", 4) - 0.3, { fin: tr - 0.3, alpha: 0.85 });
    texte("UNE GUERRE", CX, 420, 110, t, tr + 0.1);
    texte("OÙ IL NE SE PASSE", CX, 1270, ajuste("OÙ IL NE SE PASSE", 72), t, mot("hook", "passe", 7) - 0.4);
    texte("PRESQUE RIEN", CX, 1365, ajuste("PRESQUE RIEN", 84), t, mot("hook", "presque", 8) - 0.3, { couleur: AMBRE });
  },
});
scene("contexte", {
  dessin(t) { carte(t); },
  texte(t) {
    const t0 = S("contexte"), ts = mot("contexte", "septembre", 2) - 0.3, tp = mot("contexte", "personne", 5) - 0.3, td = mot("contexte", "drôle", 8) - 0.4, V = CARTE_V();
    texte("JANVIER 1940", CX, 400, ajuste("JANVIER 1940", 110), t, t0 + 0.05, { fin: ts - 0.3 });
    texte("SEPTEMBRE 1939 :", CX, 380, ajuste("SEPTEMBRE 1939 :", 72), t, ts, { alpha: 0.85, fin: td - 0.3 });
    texte("LA FRANCE ENTRE EN GUERRE", CX, 470, ajuste("LA FRANCE ENTRE EN GUERRE", 60), t, ts + 0.3, { fin: td - 0.3 });
    const [fx, fy] = V.p([2.6, 47.6]), [ax, ay] = V.p([9.3, 49.6]);
    texte("FRANCE", fx, fy, 64, t, t0 + 0.3);
    texte("ALLEMAGNE", Math.min(ax, 760), ay, ajuste("ALLEMAGNE", 60, 330), t, mot("contexte", "Allemagne", 3.5) - 0.3);
    texte("MAIS PERSONNE NE SE BAT", CX, 1300, ajuste("MAIS PERSONNE NE SE BAT", 64), t, tp, { fin: td - 0.3 });
    texte("LA DRÔLE", CX, 400, 110, t, td, { couleur: AMBRE });
    texte("DE GUERRE", CX, 520, 110, t, td + 0.2, { couleur: AMBRE });
  },
});
scene("maginot", {
  dessin(t) {
    const t0 = S("maginot"), tl = mot("maginot", "Maginot", 1.5) - 0.3, ti = mot("maginot", "intérieur", 9) - 0.4;
    if (t < ti) { carte(t, { ligne: va(t, tl, 2.2), forts: va(t, mot("maginot", "forts", 4) - 0.2, 1.5) }); return; }
    filmer(t, [P(ti, marche({ pos: [0.2, 1.65, 2.6], cible: [0, 1.3, -9], fov: 62 }, { pos: [0.1, 1.65, 0.2], cible: [0, 1.3, -9], fov: 62 }), t => miseDortoir(t, { roles: copains.slice(2, 6).map((q, i) => [q, { x: (i % 2 ? 1 : -1) * 1.9, z: -1.5 - i * 1.4, ry: (i % 2 ? -1 : 1) * Math.PI / 2, pose: i === 1 ? "assis" : "debout", y: i === 1 ? 0.05 : 0, phase: i }]) }))], E("maginot"));
  },
  texte(t) {
    const t0 = S("maginot"), tl = mot("maginot", "Maginot", 1.5) - 0.3, tc = mot("maginot", "chaîne", 4) - 0.3, ti = mot("maginot", "intérieur", 9) - 0.4, V = CARTE_V();
    texte("LA LIGNE MAGINOT", CX, 400, ajuste("LA LIGNE MAGINOT", 92), t, tl, { fin: ti - 0.3 });
    texte("DES FORTS EN BÉTON", CX, 1270, ajuste("DES FORTS EN BÉTON", 66), t, tc, { fin: ti - 0.3 });
    texte("LE LONG DE LA FRONTIÈRE", CX, 1355, ajuste("LE LONG DE LA FRONTIÈRE", 56), t, mot("maginot", "frontière", 6) - 0.4, { fin: ti - 0.3, alpha: 0.85 });
    texte("SOUS LA TERRE", CX, 400, ajuste("SOUS LA TERRE", 100), t, ti + 0.1);
    texte("DORTOIRS · CUISINES · TRAIN", CX, 1300, ajuste("DORTOIRS · CUISINES · TRAIN", 58), t, mot("maginot", "dortoirs", 10) - 0.3);
  },
});
scene("train", {
  dessin(t) {
    const t0 = S("train"), fin = E("train"), z = -(t - t0) * 3.2;
    filmer(t, [
      P(-1, t => ({ pos: [0.15, 1.55, 1.6 + z], cible: [0.1, 1.35, -30 + z], fov: 64 }), t => miseGalerie(t, { trainZ: z, roles: [[copains[6], { x: 0.3, y: 0.38, z: -0.6 + z, ry: Math.PI, pose: "assis", phase: 1 }], [copains[7], { x: -0.3, y: 0.38, z: -1.5 + z, ry: Math.PI + 0.3, pose: "assis", phase: 2 }]] }), { mains: () => ({ quoi: "vide" }) }),
    ], fin);
  },
  texte(t) {
    texte("DES KILOMÈTRES", CX, 400, ajuste("DES KILOMÈTRES", 100), t, S("train") + 0.1);
    texte("DE GALERIES", CX, 510, 84, t, S("train") + 0.4, { alpha: 0.85 });
    texte("LE PETIT TRAIN ÉLECTRIQUE", CX, 1300, ajuste("LE PETIT TRAIN ÉLECTRIQUE", 58), t, mot("train", "train", 6) - 0.4, { couleur: AMBRE });
  },
});

// ---------------------------------------------------------------- 06:00, the bugle, the sergeant at the door
const SERG_DORT = { x: 0.15, z: LIT.z - 2.2, ry: -1.25, pose: "debout" };
scene("reveil", {
  dessin(t) {
    const t0 = S("reveil"), t1 = S("sergent1"), t2 = S("marcel1"), t3 = S("lucien0");
    const mise = t => miseDortoir(t, { lum: va(t, t0 + 0.8, 1.2) * 0.6 + 0.4, roles: [
      [sergent, t > t0 + 2.0 ? { ...SERG_DORT, x: lerp(0.4, 0.15, va(t, t0 + 2, 1)), z: lerp(-7.5, LIT.z - 2.2, va(t, t0 + 2.0, 2.4)), pose: t < t0 + 4.4 ? "marche" : "debout", phase: t * 2, parle: bouche("sergent1", t), expr: ["colere", 0.3] } : null],
      [marcel, { x: 1.95, z: LIT.z, y: 0.05, ry: -Math.PI / 2, pose: ["assis", "assis", 1], parle: bouche("marcel1", t), expr: ["joie", 0.35 * va(t, t2, 0.4)], regard: [0.2, 0] }],
      ...copains.slice(0, 4).map((q, i) => [q, { x: (i % 2 ? 1 : -1) * 1.8, z: LIT.z - 1.6 - i * 1.1, ry: (i % 2 ? -1 : 1) * Math.PI / 2, pose: "debout", phase: i * 1.3 }]),
    ] });
    filmer(t, [
      P(-1, glisse(VERS_ALLEE, { ...VERS_ALLEE, cible: [0.2, 1.5, -6] }), mise),
      P(t1 - 0.15, glisse({ pos: [LIT.x + 0.3, 1.15, LIT.z - 0.3], cible: [0.15, 1.6, LIT.z - 2.2], fov: 52 }, { pos: [LIT.x + 0.35, 1.15, LIT.z - 0.3], cible: [0.15, 1.62, LIT.z - 2.2], fov: 48 }), mise),
      P(t2 - 0.15, glisse(ASSIS_LIT, { ...ASSIS_LIT, fov: 33 }), mise),
    ], E("lucien0"));
  },
  texte(t) {
    const t0 = S("reveil"), t1 = S("sergent1");
    texte("06:00", CX, 420, 150, t, t0 + 0.05, { fin: t1 - 0.2 });
    texte("LE CLAIRON", CX, 1300, ajuste("LE CLAIRON", 84), t, mot("reveil", "clairon", 3) - 0.3, { fin: t1 - 0.2 });
    texte("−15 °C", CX, 420, 140, t, mot("sergent1", "moins", 2) - 0.2, { fin: S("marcel1") - 0.2, couleur: "#CFE0EA" });
  },
});

// ---------------------------------------------------------------- 08:00, on guard in the snow; the binoculars
const POSTE = { pos: [0.4, 1.62, 0.4], cible: [0.6, 1.3, -60], fov: 60 };
const SERG_DEHORS = { x: 1.35, z: -0.2, ry: -1.9, pose: "debout", expr: ["neutre", 0] };
const loinRoles = t => loin.map((q, i) => [q, { x: 3.4 + i * 1.3, z: -57 - i * 0.6, ry: 0.4 + i * 0.5, pose: "debout", phase: i * 2 }]);
scene("garde", {
  dessin(t) {
    const t0 = S("garde"), ts = S("sergent3"), tj = S("jumelles"), tv = mot("jumelles", "regarde", 2) - 0.6, t2 = S("sergent2"), t3 = S("lucien1");
    const leve = va(t, tv, 0.9) * (1 - va(t, t2 - 0.6, 0.6));
    const mise = t => miseDehors(t, { roles: [[sergent, { ...SERG_DEHORS, parle: bouche("sergent3", t) + bouche("sergent2", t), regard: [0, 0.1] }], ...loinRoles(t)] });
    filmer(t, [
      P(-1, marche({ pos: [-0.6, 1.62, 3.4], cible: [0.4, 1.25, -40], fov: 62 }, POSTE), mise),
      P(ts - 0.15, glisse({ pos: [0.4, 1.62, 0.4], cible: [1.35, 1.6, -0.2], fov: 50 }), mise),
      P(tj - 0.1, glisse(POSTE, { ...POSTE, cible: [1.2, 1.4, -60] }), mise, { mains: t => ({ quoi: "jumelles", leve }) }),
      P(tv + 0.8, glisse({ pos: [0.4, 1.62, 0.4], cible: [3.6, 1.3, -57], fov: 7 }, { pos: [0.4, 1.62, 0.4], cible: [4.2, 1.25, -57.4], fov: 6.2 }), mise, { apres: t => masqueJumelles(1) }),
      P(t2 - 0.4, glisse({ pos: [0.4, 1.62, 0.4], cible: [1.35, 1.62, -0.2], fov: 48 }), mise),
    ], E("lucien1"));
    chuteNeige(t);
  },
  texte(t) {
    const t0 = S("garde"), tf = mot("garde", "froids", 3) - 0.6, tj = S("jumelles"), tf2 = mot("jumelles", "frontière", 5) - 0.4, ta = mot("jumelles", "attendent", 8) - 0.6, t2 = S("sergent2");
    texte("DE GARDE", CX, 420, 120, t, t0 + 0.05, { fin: tf - 0.3 });
    texte("UN HIVER TRÈS FROID", CX, 420, ajuste("UN HIVER TRÈS FROID", 84), t, tf, { fin: S("sergent3") - 0.2 });
    texte("LA FRONTIÈRE", CX, 400, ajuste("LA FRONTIÈRE", 100), t, tf2, { fin: t2 - 0.4 });
    texte("EUX AUSSI", CX, 1300, 84, t, ta, { fin: t2 - 0.4 });
    texte("ILS ATTENDENT", CX, 1395, ajuste("ILS ATTENDENT", 72), t, ta + 0.2, { fin: t2 - 0.4, couleur: AMBRE });
  },
});

// ---------------------------------------------------------------- 12:00, the mess hall
const TABLE_D = 1.6;
scene("midi", {
  dessin(t) {
    const t0 = S("midi"), tc = S("cuisinier"), tm = S("marcel2");
    const mise = t => miseRefectoire(t, { roles: [
      [cuisinier, { x: -0.3, z: -10.2, ry: 0, parle: bouche("cuisinier", t), expr: ["joie", 0.6], pose: ["debout", "pointer", 0.4 * va(t, tc, 0.4)] }],
      [marcel, { x: TABLE_D + 0.75, z: -3.0, y: 0.02, ry: -Math.PI / 2, pose: "assis", parle: bouche("marcel2", t), expr: ["tristesse", 0.4 * va(t, tm + 1, 0.6)], mange: t < tm ? 0.6 : 0, regard: [0, 0.1] }],
      ...copains.map((q, i) => [q, { x: (i < 4 ? -1.6 : 1.6) + (i % 2 ? 0.75 : -0.75), z: -1.0 - (i % 4) * 1.6 - (i < 4 ? 0 : 3.2) - (i % 4 === 3 && i >= 4 ? -9 : 0), y: 0.02, ry: (i % 2 ? -1 : 1) * Math.PI / 2, pose: "assis", mange: 0.3 + 0.3 * Math.sin(t * 1.3 + i), phase: i }]),
    ] });
    filmer(t, [
      P(-1, marche({ pos: [0.2, 1.65, 3.2], cible: [0, 1.2, -10], fov: 62 }, { pos: [0.1, 1.65, -6.6], cible: [-0.3, 1.45, -10], fov: 62 }), mise),
      P(tc - 0.15, glisse({ pos: [-0.1, 1.65, -8.4], cible: [-0.3, 1.5, -10.2], fov: 56 }, { pos: [-0.1, 1.62, -8.7], cible: [-0.3, 1.5, -10.2], fov: 56 }), mise, { mains: () => ({ quoi: "gamelle" }), apres: t => vapeur(t, 420, 1250, 1) }),
      P(tm - 0.15, glisse({ pos: [TABLE_D - 0.75, 1.18, -3.0], cible: [TABLE_D + 0.75, 1.12, -3.0], fov: 56 }, { pos: [TABLE_D - 0.7, 1.18, -3.0], cible: [TABLE_D + 0.75, 1.12, -3.0], fov: 54 }), mise, { mains: () => ({ quoi: "gamelle" }), apres: t => vapeur(t, CX, 1450, 0.7) }),
    ], E("marcel2"));
  },
  texte(t) {
    const t0 = S("midi"), tc = S("cuisinier");
    texte("12:00", CX, 420, 150, t, t0 + 0.05, { fin: mot("midi", "soupe", 2.5) - 0.3 });
    texte("SOUPE · PAIN · CAFÉ", CX, 420, ajuste("SOUPE · PAIN · CAFÉ", 84), t, mot("midi", "soupe", 2.5) - 0.3, { fin: tc - 0.2 });
    texte("LE MEILLEUR MOMENT", CX, 1300, ajuste("LE MEILLEUR MOMENT", 70), t, mot("midi", "meilleur", 6) - 0.3, { fin: tc - 0.2, couleur: AMBRE });
  },
});

// ---------------------------------------------------------------- 15:00, the post; the letter from home
scene("courrier", {
  dessin(t) {
    const t0 = S("courrier"), tv = S("vaguemestre"), tl = S("lettre"), tm = S("maman"), tr = S("reponse"), te = mot("reponse", "dis", 3) - 0.6;
    const mise = t => miseDortoir(t, { roles: [
      [vaguemestre, t < tl + 1 ? { x: lerp(0.1, 0.2, va(t, t0, 2)), z: lerp(-7.8, LIT.z - 1.4, va(t, t0 + 0.3, 3.2)), ry: t < t0 + 3.5 ? 0 : -0.9, pose: t < t0 + 3.5 ? "marche" : "debout", phase: t * 2, parle: bouche("vaguemestre", t), tend: va(t, tv + 0.5, 0.6), expr: ["joie", 0.6] } : null],
      [marcel, { x: 1.95, z: LIT.z - 0.2, y: 0.05, ry: -Math.PI / 2, pose: "assis", regard: [0.4, 0], phase: 2 }],
      ...copains.slice(0, 3).map((q, i) => [q, { x: 1.95, z: LIT.z - 2.2 - i * 2.1, y: 0.05, ry: -Math.PI / 2, pose: "assis", phase: i }]),
    ] });
    filmer(t, [
      P(-1, glisse({ pos: [LIT.x + 0.4, 1.2, LIT.z - 0.1], cible: [0.1, 1.3, -8], fov: 60 }, { pos: [LIT.x + 0.4, 1.2, LIT.z - 0.1], cible: [0.2, 1.4, -4], fov: 58 }), mise),
      P(tv - 0.15, glisse({ pos: [LIT.x + 0.4, 1.2, LIT.z - 0.1], cible: [0.2, 1.45, LIT.z - 1.4], fov: 52 }), mise),
      P(tl, glisse({ pos: [LIT.x + 0.4, 1.2, LIT.z - 0.1], cible: [LIT.x + 0.9, 0.7, LIT.z - 0.3], fov: 60 }), mise, { mains: () => ({ quoi: "vide" }) }),
    ], E("reponse"));
    feuillePapier(t, va(t, tl + 0.4, 0.7) * (1 - va(t, tr - 0.5, 0.4)) + va(t, te, 0.6));
  },
  texte(t) {
    const t0 = S("courrier"), tv = S("vaguemestre"), tl = S("lettre"), tm = S("maman"), tr = S("reponse"), te = mot("reponse", "dis", 3) - 0.6;
    texte("15:00", CX, 420, 150, t, t0 + 0.05, { fin: mot("courrier", "vaguemestre", 2) - 0.3 });
    texte("LE VAGUEMESTRE", CX, 400, ajuste("LE VAGUEMESTRE", 92), t, mot("courrier", "vaguemestre", 2) - 0.3, { fin: tl + 0.2 });
    texte("= LE FACTEUR DES SOLDATS", CX, 500, ajuste("= LE FACTEUR DES SOLDATS", 56), t, mot("courrier", "courrier", 5) - 0.5, { fin: tl + 0.2, alpha: 0.85 });
    if (t > tl + 0.5 && t < tr - 0.4) {
      const y0 = 470;
      ligneEcrite("Mon petit Lucien,", y0, t, tl + 0.8, 30, { taille: 58 });
      ligneEcrite("ici aussi il fait", y0 + 148, t, mot("maman", "ici", 1.5) - 0.2, 22);
      ligneEcrite("très froid.", y0 + 222, t, mot("maman", "très", 2.5) - 0.2, 22);
      ligneEcrite("Je t'envoie des chaussettes", y0 + 296, t, mot("maman", "envoie", 4) - 0.3, 26);
      ligneEcrite("que j'ai tricotées.", y0 + 370, t, mot("maman", "tricotées", 5.5) - 0.6, 24);
      ligneEcrite("Couvre-toi bien.", y0 + 444, t, mot("maman", "Couvre", 7) - 0.2, 22);
      ligneEcrite("Maman", y0 + 592, t, E("maman") - 1.0, 14, { taille: 60 });
    }
    if (t > te) {
      const y0 = 470;
      ligneEcrite("Chère maman,", y0, t, te + 0.2, 22, { taille: 58 });
      ligneEcrite("tout va bien ici.", y0 + 148, t, te + 1.2, 18);
      ligneEcrite("Ne t'inquiète pas.", y0 + 222, t, te + 2.4, 18);
    }
    texte("SON SEUL LIEN", CX, 1430, ajuste("SON SEUL LIEN", 60), t, mot("lettre", "lien", 4) - 0.4, { fin: tm - 0.2, couleur: AMBRE });
  },
});

// ---------------------------------------------------------------- the evening: cards; 22:00, lights out
const TABLE_SOIR = { pos: [0, 1.15, -5.75], cible: [0, 0.95, -7.3], fov: 60 };
scene("soir", {
  dessin(t) {
    const t0 = S("soir"), tm = S("marcel3"), tl = S("lucien2"), tx = S("extinction"), tn = mot("extinction", "éteint", 2) - 0.4;
    const roles = t => [
      [marcel, { x: 0.3, z: -7.35, y: 0.0, ry: 0, pose: "assis", parle: bouche("marcel3", t), expr: ["tristesse", 0.35 * va(t, tm, 0.5)], regard: [0, 0.15] }],
      [copains[0], { x: -0.75, z: -7.35, ry: 0, pose: "assis", phase: 1 }],
      [copains[1], { x: 0.95, z: -6.6, ry: -Math.PI / 2, pose: "assis", phase: 2, expr: ["joie", 0.5] }],
      [copains[2], { x: -0.95, z: -6.6, ry: Math.PI / 2, pose: "assis", phase: 3 }],
      ...copains.slice(3, 6).map((q, i) => [q, { x: (i % 2 ? 1.95 : -1.95), z: -1.2 - i * 2.1, y: 0.05, ry: (i % 2 ? -1 : 1) * Math.PI / 2, pose: "assis", phase: i }]),
    ];
    const soir = t => miseDortoir(t, { cartes: true, lum: 0.85, roles: roles(t) });
    const nuit = t => miseDortoir(t, { lum: 1 - va(t, tn, 1.2), roles: [[marcel, { x: 2.45, y: 0.47, z: LIT.z + 0.15, rx: -Math.PI / 2, ry: Math.PI, expr: ["joie", 0.9] }]] });
    filmer(t, [
      P(-1, glisse(TABLE_SOIR, { ...TABLE_SOIR, pos: [0, 1.12, -5.65] }), soir, { mains: () => ({ quoi: "cartes" }) }),
      P(tm - 0.15, glisse({ pos: [0.1, 1.15, -5.85], cible: [0.3, 1.18, -7.35], fov: 46 }, { pos: [0.1, 1.15, -5.95], cible: [0.3, 1.18, -7.35], fov: 44 }), soir, { mains: () => ({ quoi: "cartes" }) }),
      P(tx - 0.2, glisse({ ...OEIL_LIT, cible: [0.3, 2.2, LIT.z - 1.5] }, { ...OEIL_LIT, cible: [1.6, 1.0, LIT.z] }), nuit),
    ], E("extinction"));
    paupieres(va(t, E("extinction") - 2.4, 2.0));
  },
  texte(t) {
    const t0 = S("soir"), tc = mot("soir", "cafard", 9) - 0.4, tm = S("marcel3"), tx = S("extinction");
    texte("21:00", CX, 420, 150, t, t0 + 0.05, { fin: tc - 0.3 });
    texte("LE CAFARD", CX, 400, ajuste("LE CAFARD", 120), t, tc, { fin: tm - 0.2, couleur: AMBRE });
    texte("= LA TRISTESSE", CX, 1290, ajuste("= LA TRISTESSE", 72), t, mot("soir", "tristesse", 11) - 0.4, { fin: tm - 0.2 });
    texte("QUAND LA MAISON MANQUE", CX, 1380, ajuste("QUAND LA MAISON MANQUE", 56), t, mot("soir", "maison", 12) - 0.4, { fin: tm - 0.2, alpha: 0.85 });
    texte("22:00", CX, 420, 150, t, tx + 0.05, { fin: E("extinction") - 1.2 });
    texte("EXTINCTION DES FEUX", CX, 530, ajuste("EXTINCTION DES FEUX", 56), t, mot("extinction", "éteint", 2) - 0.3, { fin: E("extinction") - 1.2, alpha: 0.85 });
  },
});

// ---------------------------------------------------------------- the end: 10 May 1940; and you?
scene("fin", {
  dessin(t) {
    filmer(t, [P(-1, glisse({ pos: [0.4, 1.62, 0.4], cible: [1.2, 1.4, -60], fov: 60 }, { pos: [0.4, 1.62, 0.2], cible: [1.4, 1.5, -60], fov: 58 }), t => miseDehors(t, { roles: loinRoles(t) }))], EP.DUREE);
    chuteNeige(t, 0.8);
    ctx.fillStyle = "rgba(4,5,6,.55)"; ctx.fillRect(0, 0, W, H);
  },
  texte(t) {
    const t0 = S("fin"), tm = mot("fin", "dix", 2.5) - 0.4, tq = phrase("fin", 2).start;
    texte("ON NE LE SAIT PAS ENCORE", CX, 420, ajuste("ON NE LE SAIT PAS ENCORE", 64), t, t0 + 0.05, { fin: tm - 0.3, alpha: 0.85 });
    texte("10 MAI 1940", CX, 760, ajuste("10 MAI 1940", 130), t, tm, { fin: tq - 0.6 });
    texte("LA DRÔLE DE GUERRE", CX, 900, ajuste("LA DRÔLE DE GUERRE", 72), t, mot("fin", "drôle", 4) - 0.3, { fin: tq - 0.6 });
    texte("S'ARRÊTE D'UN COUP", CX, 990, ajuste("S'ARRÊTE D'UN COUP", 72), t, mot("fin", "arrêter", 6) - 0.3, { fin: tq - 0.6, couleur: AMBRE });
    texte("ET TOI ?", CX, 760, 130, t, tq);
    texte("TU AURAIS TENU", CX, 900, ajuste("TU AURAIS TENU", 76), t, mot("fin", "tenu", 11) - 0.4);
    texte("COMBIEN DE TEMPS ?", CX, 995, ajuste("COMBIEN DE TEMPS ?", 76), t, mot("fin", "combien", 12) - 0.3, { couleur: AMBRE });
  },
});

// ---------------------------------------------------------------- interface: the time at the top (log book)
const HEURES = () => [[S("contexte"), "JANVIER 1940"], [S("reveil"), "JANVIER 1940 — 06:00"], [S("garde"), "JANVIER 1940 — 08:00"], [S("midi"), "JANVIER 1940 — 12:00"], [S("courrier"), "JANVIER 1940 — 15:00"], [mot("reponse", "soir", 1) - 0.3, "JANVIER 1940 — 19:00"], [S("soir"), "JANVIER 1940 — 21:00"], [S("extinction"), "JANVIER 1940 — 22:00"], [S("fin"), null]];
function heureDe(t) { let s = null; for (const [a, v] of HEURES()) if (t >= a) s = v; return t < S("hook") + 0.1 ? null : s ?? null; }
function journal(t) {
  const s = heureDe(t);
  let avant = null, tc = -9;
  for (let k = 1; k <= 10; k++) { const u = t - k * 0.05, x = u < 0 ? null : heureDe(u); if (x !== s) { avant = x; tc = t - (k - 0.5) * 0.05; break; } }
  const p = sort(t, tc, 0.45);
  if (avant && p < 1) ecrire(avant, ZONE.x0, 176 - 22 * p, TAILLE_MIN, { align: "left", alpha: 0.85 * (1 - p) });
  if (s) ecrire(s, ZONE.x0, 176 + 22 * (1 - p), TAILLE_MIN, { align: "left", alpha: 0.85 * (avant ? p : 1) });
}

// ---------------------------------------------------------------- sound
lancer({
  accent: AMBRE, boite: "#4A4636", motsCles: ["drôle", "guerre", "maginot", "froid", "neige", "lettre", "cafard", "attend", "train", "maman", "mai"],
  carteMots: 3, carteMax: 15,
  decors: { reveil: "reveil", sergent1: "reveil", marcel1: "reveil", lucien0: "reveil", garde: "garde", sergent3: "garde", jumelles: "garde", sergent2: "garde", lucien1: "garde", midi: "midi", cuisinier: "midi", marcel2: "midi", courrier: "courrier", vaguemestre: "courrier", lettre: "courrier", maman: "courrier", reponse: "courrier", soir: "soir", marcel3: "soir", lucien2: "soir", extinction: "soir" },
  flou: 2, grain: 0.035,
  mention: [ZONE.x0, 240, "left"],
  mentions: Object.fromEntries(["hook", "contexte", "maginot", "train", "reveil", "sergent1", "marcel1", "lucien0", "garde", "sergent3", "jumelles", "sergent2", "lucien1", "midi", "cuisinier", "marcel2", "courrier", "vaguemestre", "lettre", "maman", "reponse", "soir", "marcel3", "lucien2", "extinction", "fin"].map(id => [id, ["contexte", "fin"].includes(id) ? "ILLUSTRATION" : "RECONSTITUTION"])),
  sources: { titre: "SOURCES", duree: 6, lignes: ["Ministère des Armées, « La drôle de guerre 39-40 », Chemins de mémoire.", "Ouvrage du Hackenberg (ligne Maginot) : galeries et petit train électrique.", "Lucien, Marcel, le sergent, le cuisinier, le vaguemestre et la lettre sont inventés.", "Voix de synthèse, images d'illustration."] },
  interface(t) { journal(t); },
  musique: () => ({ style: "dark", root: 38, room: true }),
  silences: () => [[phrase("fin", 1).end + 0.08, phrase("fin", 2).start - 0.08, 1.2]],
  sons() {
    EP.ORDRE.forEach((id, i) => { if (i && decorDe(id) !== decorDe(EP.ORDRE[i - 1])) sfx(S(id) - 0.25, "swish", { gain: 0.1 }); });
    sfx(mot("reveil", "clairon", 3) - 0.1, "clairon", { gain: 0.3 });
    sfx(S("train") - 0.2, "rumble", { dur: +(E("train") - S("train") + 0.3).toFixed(2), gain: 0.35 });
    sfx(S("garde") - 0.2, "vent", { dur: +(E("lucien1") - S("garde") + 0.3).toFixed(2), gain: 0.45 });
    for (let x = S("garde"); x < S("garde") + 3.2; x += 0.55) sfx(+x.toFixed(2), "step", { gain: 0.12 });
    for (let x = S("midi") + 0.2; x < S("cuisinier") - 0.5; x += 0.55) sfx(+x.toFixed(2), "step", { gain: 0.1 });
    for (let x = S("courrier") + 0.3; x < S("courrier") + 3.4; x += 0.55) sfx(+x.toFixed(2), "step", { gain: 0.1 });
    sfx(S("lettre") + 0.3, "paper", { gain: 0.25 }); sfx(mot("reponse", "dis", 3) - 0.6, "paper", { gain: 0.2 });
    sfx(mot("reponse", "dis", 3) - 0.3, "scribble", { dur: 3.0, gain: 0.25 });
    sfx(S("soir") + 0.3, "paper", { gain: 0.15 }); sfx(S("soir") + 2.3, "paper", { gain: 0.12 });
    sfx(mot("extinction", "éteint", 2) - 0.3, "switch", { gain: 0.15 });
  },
  voix: { bed: 0.19, duck: 0.65 },
});
