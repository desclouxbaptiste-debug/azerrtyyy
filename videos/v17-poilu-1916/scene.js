// « Une journée d'Émile, poilu de 1916 » — November 1916, a French front-line trench.
// First-person view as in v16 (the camera is Émile's eyes: his hands, the periscope, the mess tin, the letter,
// eyelids at waking): the dugout (cagna), the trench with its duckboards and mud, the periscope view over no man's
// land, the soup brought up at night. Same montage (PS2 characters of lib/ps2.js in low-poly sets, vector text of
// lib/epure.js, time at the top like a log book). No fighting is shown: no weapon in hand, no wound, nothing
// burning (no candle, no fire), no cigarette, no alcohol; the guns are only a far, low rumble. No symbol of any army:
// the German line is a far row of sandbags. Every character is invented; real people never speak.
import * as THREE from "three";
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidamPS2, qualitePS2, texturePS2, PEINTURES } from "../lib/ps2.js";
import { vue, fondCarte } from "../v15-nuage-tchernobyl/carte.js";

const TAU = Math.PI * 2;
const BLEU = "#9DBDE0";   // the one accent: horizon blue
qualitePS2(3);
const st = creerStudio({ antialias: true });
st.sol.visible = false; st.gl.shadowMap.enabled = false; st.key.castShadow = false;
st.scene.fog = new THREE.Fog("#050506", 9, 30);
const lam = o => new THREE.MeshLambertMaterial(o);
const FILTRE = "saturate(0.5) sepia(0.12) contrast(1.08)";


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


const terre = c => (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); grainDe(x, w, h, 0.12, 13, 900); for (let i = 0; i < 6; i++) { x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(0, (i * 37) % h, w, 3); } };
const boue = (x, w, h) => { x.fillStyle = "#4A3E30"; x.fillRect(0, 0, w, h); grainDe(x, w, h, 0.14, 17, 1100); x.fillStyle = "rgba(150,160,170,.10)"; for (let i = 0; i < 12; i++) { x.beginPath(); x.ellipse((i * 41) % w, (i * 67) % h, 10, 4, 0, 0, TAU); x.fill(); } };
const planches = (x, w, h) => { x.fillStyle = "#5A4C3A"; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, i * h / 8, w, 2); } grainDe(x, w, h, 0.08, 19, 500); };
const caillebotis = (x, w, h) => { x.fillStyle = "#2A2218"; x.fillRect(0, 0, w, h); x.fillStyle = "#6A5A44"; for (let i = 0; i < 6; i++) x.fillRect(0, i * h / 6 + 2, w, h / 6 - 6); grainDe(x, w, h, 0.08, 23, 400); };
const sacs = (x, w, h) => { x.fillStyle = "#7A6E58"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 2; x.strokeRect(2, 2, w - 4, h - 4); grainDe(x, w, h, 0.1, 29, 400); };

// ---------------------------------------------------------------- the dugout (cagna)
const cagna = new THREE.Group(); st.plateau.add(cagna);
const LIT = { x: -1.35, y: 0.45, z: 0 };
{
  piece(cagna, -2.1, 2.1, -2.6, 2.6, 1.95, terre("#5A4A38"), terre("#3E3428"), "#2E261C");
  const bois = lam({ map: peint(64, 64, planches) });
  for (const x of [-2.0, 2.0]) for (const z of [-2.4, -0.8, 0.8, 2.4]) boite(cagna, bois, 0.14, 1.95, 0.14, x, 0.97, z);
  for (const z of [-2.4, -0.8, 0.8, 2.4]) boite(cagna, bois, 4.2, 0.16, 0.16, 0, 1.87, z);
  for (const s of [-1, 1]) for (const y of [0.45, 1.2]) { boite(cagna, bois, 0.8, 0.05, 2.0, s * 1.6, y, 0); boite(cagna, lam({ color: "#5A5440" }), 0.7, 0.07, 1.4, s * 1.6, y + 0.06, 0.2); }
  boite(cagna, bois, 0.9, 0.05, 0.6, 0, 0.7, -1.9); for (const sx of [-0.4, 0.4]) boite(cagna, bois, 0.05, 0.7, 0.05, sx, 0.35, -1.9);
  // the steps up to the trench and the grey daylight at the top
  for (let i = 0; i < 6; i++) boite(cagna, bois, 1.0, 0.05, 0.3, 0, 0.12 + i * 0.25, 2.3 + i * 0.28);
  plan(cagna, lam({ color: "#0A0C0E", emissive: "#A8B2BA", emissiveIntensity: 0.9 }), 1.0, 1.6, 0, 1.3, 2.58, Math.PI);
}
const jour = new THREE.PointLight("#B8C4D0", 3, 0, 1.4); jour.position.set(0, 1.4, 2.0); cagna.add(jour);

// ---------------------------------------------------------------- the trench: walls of planks, sandbags, duckboards, mud
const tranchee = new THREE.Group(); st.plateau.add(tranchee);
const PROF = 2.1, LARG = 0.75;
{
  plan(tranchee, lam({ map: peint(64, 64, caillebotis, 1, 60) }), 0.7, 80, 0, 0.03, -20, 0, -Math.PI / 2);
  plan(tranchee, lam({ map: peint(64, 64, boue, 2, 60) }), 1.5, 80, 0, 0.0, -20, 0, -Math.PI / 2);
  for (const s of [-1, 1]) {
    plan(tranchee, lam({ map: peint(64, 64, planches, 30, 1.2) }), 80, PROF * 0.7, s * LARG, PROF * 0.35, -20, -s * Math.PI / 2);
    plan(tranchee, lam({ map: peint(64, 64, terre("#5A4A38"), 30, 1) }), 80, PROF * 0.3, s * LARG, PROF * 0.85, -20, -s * Math.PI / 2);
    for (let z = 20; z > -60; z -= 1.6) for (let k = 0; k < 2; k++) boite(tranchee, lam({ map: peint(32, 32, sacs) }), 0.55, 0.22, 0.75, s * (LARG + 0.25), PROF + 0.11 + k * 0.2, z + k * 0.4);
    for (let z = 20; z > -60; z -= 2.2) boite(tranchee, lam({ map: peint(64, 64, planches) }), 0.1, PROF, 0.12, s * (LARG - 0.03), PROF / 2, z);
  }
  boite(tranchee, lam({ map: peint(64, 64, planches, 1, 8) }), 0.35, 0.5, 30, LARG - 0.18, 0.25, -6);   // the fire step
  // above: mud, craters, stumps, wire stakes, and the far line of sandbags
  plan(tranchee, lam({ map: peint(64, 64, boue, 40, 40) }), 200, 200, 0, PROF + 0.02, -60, 0, -Math.PI / 2);
  const r = rng(3);
  for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 60, z = -4 - r() * 50; if (Math.abs(x) < 2) continue; const c = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 1.6, 14), lam({ color: "#2E261C" })); c.rotation.x = -Math.PI / 2; c.position.set(x, PROF + 0.04, z); tranchee.add(c); }
  for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 50, z = -8 - r() * 40; const t = cylindre(tranchee, lam({ color: "#3A3026" }), 0.12, 0.18, 1.5 + r() * 3, x, PROF + 1.2, z, 6); t.rotation.z = (r() - 0.5) * 0.4; }
  for (let i = 0; i < 40; i++) { const x = -20 + i, z = -14 - (i % 3) * 0.7; for (const a of [-0.35, 0.35]) { const p = cylindre(tranchee, lam({ color: "#3A3430" }), 0.025, 0.025, 1.3, x, PROF + 0.55, z, 5); p.rotation.z = a; } }
  for (let i = 0; i < 80; i++) boite(tranchee, lam({ map: peint(32, 32, sacs) }), 0.6, 0.28, 0.6, -24 + i * 0.6, PROF + 0.14 + (i % 2) * 0.12, -42 + Math.sin(i * 0.7) * 0.4);
}
const rat = new THREE.Group(); tranchee.add(rat);
{ const m = lam({ color: "#3A342E" }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m); b.scale.set(1, 0.7, 1.8); b.position.y = 0.07; rat.add(b); const h = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 6), m); h.rotation.x = -Math.PI / 2; h.position.set(0, 0.07, -0.16); rat.add(h); const q = cylindre(rat, m, 0.008, 0.004, 0.22, 0, 0.05, 0.2, 4); q.rotation.x = Math.PI / 2 - 0.2; }


// ---------------------------------------------------------------- the cast (all invented): French soldiers of 1916, horizon blue
const acteurs = new THREE.Group(); st.plateau.add(acteurs);
function alea(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function poilu(g, o = {}) {
  const r = n => alea(g * 17 + n), bleu = ["#6E7E8C", "#748496", "#68788A"][Math.floor(r(1) * 3)];
  const peau = o.peau || ["#E8C3A2", "#DDB38E", "#F0CFB2", "#C99A72", "#E3BC98"][Math.floor(r(2) * 5)];
  return {
    peau, iris: ["#3A2416", "#4A6A8A", "#3E5A4A", "#5A4028"][Math.floor(r(3) * 4)], cheveux: o.cheveux || ["#17120F", "#2E2018", "#4A3222", "#6E5434", "#8A7450"][Math.floor(r(4) * 5)],
    levres: "#A0705A", coiffure: o.coiffure || (r(5) > 0.5 ? "court" : "ras"),
    haut: PEINTURES.chemise({ couleur: bleu, poches: true, ceinture: "#3A3020" }), hautCouleur: bleu, manche: { couleur: bleu },
    bas: PEINTURES.jambe({ peau: "#5E6470", chaussette: "#4A4E54", haut: 0.45 }), basCouleur: "#5E6470", chaussure: { couleur: "#3A2E22", semelle: "#1E1610", lacets: "#1E1610" },
  };
}
function acteur(graine, design, taille = 1) { const q = creerQuidamPS2({ role: "foule", graine, design, taille }); acteurs.add(q.objet); return q; }
const MAT_CASQUE = lam({ color: "#5E6E7C" });
function casque(q) {
  const g = new THREE.Group(); q.articulations.tete.add(g);
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, TAU, 0, Math.PI / 2), MAT_CASQUE); d.position.y = 0.01; d.scale.set(1, 0.82, 1.08); g.add(d);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.012, 18), MAT_CASQUE); b.position.y = 0.015; b.scale.set(0.9, 1, 1.2); g.add(b);
  boite(g, MAT_CASQUE, 0.014, 0.022, 0.17, 0, 0.13, 0);
  return g;
}
const sergent = acteur(5, poilu(5, { cheveux: "#3A2A1E", coiffure: "ras" }), 1.04);
const gaston = acteur(6, poilu(6, { cheveux: "#7A5634", coiffure: "court" }), 0.98);
const porteurs = [0, 1].map(i => acteur(30 + i, poilu(30 + i), 1.0));
const copains = Array.from({ length: 6 }, (_, i) => acteur(20 + i, poilu(20 + i), 0.95 + 0.08 * alea(i)));
const CASQUES = [sergent, gaston, ...porteurs, ...copains].map(q => [q, casque(q)]);
const marmites = porteurs.map(q => { const m = cylindre(q.articulations.mainD, lam({ color: "#7A7C76" }), 0.16, 0.14, 0.3, 0, -0.18, 0.05, 12); return m; });
const TOUS = [sergent, gaston, ...porteurs, ...copains];
function casques(v) { for (const [, c] of CASQUES) c.visible = v; }


// ---------------------------------------------------------------- Lucien's hands (first person), and what they hold
const mains = new THREE.Group(); st.scene.add(mains);
const pivot = new THREE.Object3D();
const MAINS = {};
{
  const manche = lam({ color: "#6A7A88" }), peau = lam({ color: "#E2B994" });
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
  MAINS.periscope = new THREE.Group(); mains.add(MAINS.periscope);
  { const p = lam({ color: "#4A4E4C" }); boite(MAINS.periscope, p, 0.07, 0.75, 0.07, 0, 0.2, 0); const h = boite(MAINS.periscope, p, 0.08, 0.1, 0.14, 0, 0.6, -0.03); boite(MAINS.periscope, lam({ color: "#0E1012", emissive: "#6A7480", emissiveIntensity: 0.6 }), 0.05, 0.05, 0.01, 0, -0.1, 0.036); }
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
  const k = o.leve ?? 1, ob = { jumelles: MAINS.jumelles, gamelle: MAINS.gamelle, cartes: MAINS.cartes, periscope: MAINS.periscope };
  for (const [n, g] of Object.entries(ob)) g.visible = n === quoi;
  if (quoi === "jumelles") {
    MAINS.jumelles.position.set(0, lerp(-0.35, -0.01, k), lerp(0.35, 0.16, k));
    MAINS[-1].position.set(0.06, lerp(-0.4, -0.05, k), lerp(0.3, 0.17, k)); MAINS[1].position.set(-0.06, lerp(-0.4, -0.05, k), lerp(0.3, 0.17, k));
    MAINS[-1].rotation.set(-0.5, 0.3, 0); MAINS[1].rotation.set(-0.5, -0.3, 0);
  } else if (quoi === "periscope") {   // the trench periscope held up against the parapet, its lower mirror at eye level
    MAINS.periscope.position.set(0, lerp(-0.75, -0.3, k), 0.62); MAINS.periscope.scale.setScalar(0.8);
    MAINS[-1].position.set(0.06, lerp(-0.7, -0.33, k), 0.58); MAINS[1].position.set(-0.06, lerp(-0.55, -0.14, k), 0.58);
    MAINS[-1].rotation.set(-0.3, 0.6, 0); MAINS[1].rotation.set(-0.3, -0.6, 0);
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
  for (const x of [cagna, tranchee]) x.visible = x === g;
  st.ciel.intensity = ciel; st.key.intensity = cle; st.contre.intensity = contre;
  st.scene.background = new THREE.Color(fond); st.scene.fog.color.set(fond); st.scene.fog.near = fog[0]; st.scene.fog.far = fog[1];
}
function roles(t, liste) { const actifs = []; for (const [q, def] of liste || []) if (def) { jouer(q, t, def); actifs.push(q); } seuls(actifs); }
function miseCagna(t, o = {}) {
  decor(cagna, { ciel: 0.7, cle: 0.25, contre: 0.3, fog: [6, 18] });
  st.ciel.color.set("#B8C0C8"); st.ciel.groundColor.set("#2A2218");
  jour.intensity = 3 * (o.lum ?? 1);
  casques(!o.sansCasque);
  roles(t, o.roles);
}
/** The trench: o.nuit 0..1 (the soup comes at night). */
function miseTranchee(t, o = {}) {
  const nuit = o.nuit ?? 0;
  decor(tranchee, { ciel: lerp(1.15, 0.7, nuit), cle: lerp(0.55, 0.3, nuit), contre: lerp(0.4, 0.45, nuit), fond: nuit > 0.5 ? "#10161C" : "#8A9298", fog: nuit > 0.5 ? [6, 30] : [10, 70] });
  st.ciel.color.set(nuit > 0.5 ? "#8A9CB0" : "#D0D6DA"); st.ciel.groundColor.set("#3A3026"); st.key.position.set(-5, 10, 4); st.key.target.position.set(0, 0, -6); st.key.color.set("#DDE2E6");
  rat.visible = o.rat != null; if (o.rat != null) { rat.position.set(0.12, 0.05, o.rat); rat.rotation.y = Math.PI; rat.scale.setScalar(1.5); }
  casques(true);
  roles(t, o.roles);
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


const GOUTTES = (() => { const r = rng(17); return Array.from({ length: 240 }, () => ({ x: r() * W, v: 1500 + r() * 700, ph: r(), l: 40 + r() * 50 })); })();
function pluie(t, a = 1) {   // fine rain over the picture (thin off-white streaks, nothing bright)
  ctx.save(); ctx.strokeStyle = "rgba(215,222,228,.2)"; ctx.lineWidth = 2; ctx.globalAlpha = a; ctx.beginPath();
  for (const g of GOUTTES) { const y = ((t * g.v + g.ph * H * 1.3) % (H * 1.3)) - 150, x = g.x + y * 0.05; ctx.moveTo(x, y); ctx.lineTo(x + g.l * 0.05, y + g.l); }
  ctx.stroke(); ctx.restore();
}
/** The periscope: everything dark except a framed rectangle (the top mirror seen through the tube). */
function masquePeriscope(k) {
  if (k <= 0) return;
  if (!masquePeriscope.c) {
    const c = masquePeriscope.c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#030303"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "destination-out"; x.beginPath(); x.roundRect(150, 620, 780, 560, 18); x.fill();
    x.globalCompositeOperation = "source-over"; x.strokeStyle = "#2A2C2E"; x.lineWidth = 22; x.beginPath(); x.roundRect(150, 620, 780, 560, 18); x.stroke();
  }
  ctx.save(); ctx.globalAlpha = k; ctx.drawImage(masquePeriscope.c, 0, 0); ctx.restore();
}

// ---------------------------------------------------------------- the map: the front line from the North Sea to Switzerland
const FRONT = [[2.6, 51.12], [2.88, 50.85], [2.78, 50.35], [2.75, 49.95], [2.95, 49.6], [3.0, 49.42], [3.5, 49.42], [4.03, 49.27], [4.6, 49.18], [5.15, 49.2], [5.4, 49.12], [5.55, 48.9], [5.9, 48.78], [6.45, 48.62], [7.0, 48.25], [7.05, 47.9], [7.15, 47.5]];
const CARTE_V = () => vue(30, 300, 1020, 1300, 4.6, 49.1, 150);
function carte(t, p) {
  const V = CARTE_V();
  fondCarte(ctx, V, { trait: 2.4, france: "#3E4448", terre: "#2A2E30", bordFrance: "#C8C8C4" });
  if (p > 0) {
    const pts = FRONT.map(V.p);
    const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])), L = seg.reduce((a, b) => a + b, 0);
    ctx.save(); ctx.strokeStyle = BLEU; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([2, 22]);
    let reste = L * Math.min(1, p); ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length && reste > 0; i++) { const k = Math.min(1, reste / seg[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); reste -= seg[i - 1]; }
    ctx.stroke(); ctx.restore();
  }
}

// ---------------------------------------------------------------- waking in the dugout
const OEIL_LIT = { pos: [LIT.x + 0.08, LIT.y + 0.36, -0.55], cible: [LIT.x + 0.2, 1.7, 0.3], fov: 62 };
const VERS_SORTIE = { pos: [LIT.x + 0.12, LIT.y + 0.4, -0.55], cible: [0, 1.2, 2.4], fov: 62 };
const SERG_CAGNA = { x: 0, z: 1.9, ry: -2.47, pose: "debout" };
const GASTON_ASSIS = { x: 1.22, z: 0.2, y: 0.02, ry: -Math.PI / 2, pose: "assis" };
scene("hook", {
  dessin(t) {
    filmer(t, [P(-1, glisse(OEIL_LIT, VERS_SORTIE), t => miseCagna(t, { lum: 0.7, sansCasque: true, roles: [[gaston, { x: 1.6, y: 0.53, z: 0.75, rx: -Math.PI / 2, ry: Math.PI, expr: ["joie", 0.9] }]] }))], E("hook") + 0.4);
    paupieres(1 - va(t, 0.2, 1.4) + 0.5 * Math.max(0, Math.sin(clamp((t - 2.0) / 0.35) * Math.PI)));
  },
  texte(t) {
    const tr = EP.T.reveals[0];
    texte("ÉMILE", CX, 420, 140, t, mot("hook", "Émile", 1) - 0.1, { fin: tr - 0.3 });
    texte("19 ANS · SOLDAT", CX, 540, ajuste("19 ANS · SOLDAT", 64), t, mot("hook", "dix-neuf", 2) - 0.3, { fin: tr - 0.3, alpha: 0.85 });
    texte("UN TROU", CX, 420, 120, t, tr + 0.1);
    texte("CREUSÉ DANS LA TERRE", CX, 1300, ajuste("CREUSÉ DANS LA TERRE", 70), t, mot("hook", "creusé", 7) - 0.3, { couleur: BLEU });
  },
});
scene("contexte", {
  dessin(t) { carte(t, va(t, mot("contexte", "tranchées", 8) - 0.4, 3.0)); },
  texte(t) {
    const t0 = S("contexte"), tg = mot("contexte", "guerre", 3) - 0.3, tt = mot("contexte", "tranchées", 8) - 0.4, tf = mot("contexte", "traversent", 13) - 0.4;
    texte("NOVEMBRE 1916", CX, 400, ajuste("NOVEMBRE 1916", 110), t, t0 + 0.05, { fin: tt - 0.3 });
    texte("LA GUERRE DURE DEPUIS 2 ANS", CX, 1300, ajuste("LA GUERRE DURE DEPUIS 2 ANS", 60), t, tg, { fin: tt - 0.3 });
    texte("LES TRANCHÉES", CX, 400, ajuste("LES TRANCHÉES", 110), t, tt, { couleur: BLEU });
    texte("= DE LONGS FOSSÉS", CX, 510, ajuste("= DE LONGS FOSSÉS", 64), t, mot("contexte", "fossés", 10) - 0.4, { alpha: 0.85, fin: tf - 0.3 });
    texte("DE LA MER DU NORD", CX, 1300, ajuste("DE LA MER DU NORD", 66), t, tf);
    texte("JUSQU'À LA SUISSE", CX, 1390, ajuste("JUSQU'À LA SUISSE", 66), t, mot("contexte", "Suisse", 16) - 0.4);
  },
});
const POILUS_LIGNE = t => copains.map((q, i) => [q, { x: (i % 2 ? 0.42 : -0.42), z: -2 - i * 2.4, ry: (i % 2 ? -1 : 1) * Math.PI / 2 + (i % 3 - 1) * 0.3, pose: i === 2 ? "brasCroises" : "debout", phase: i * 1.4, expr: ["tristesse", 0.3] }]);
scene("poilus", {
  dessin(t) {
    filmer(t, [P(-1, marche({ pos: [0, 1.62, 6], cible: [0, 1.2, -30], fov: 60 }, { pos: [0, 1.62, 1.5], cible: [0, 1.2, -30], fov: 60 }), t => miseTranchee(t, { roles: POILUS_LIGNE(t) }))], E("poilus"));
    pluie(t);
  },
  texte(t) {
    texte("LES POILUS", CX, 400, ajuste("LES POILUS", 120), t, mot("poilus", "poilus", 2) - 0.3, { couleur: BLEU });
    texte("= DES HOMMES COURAGEUX", CX, 1300, ajuste("= DES HOMMES COURAGEUX", 62), t, mot("poilus", "courageux", 6) - 0.5);
  },
});
scene("reveil", {
  dessin(t) {
    const t0 = S("reveil"), t1 = S("sergent1"), t2 = S("gaston1");
    const mise = t => miseCagna(t, { roles: [
      [sergent, t > t0 + 1.5 ? { ...SERG_CAGNA, z: lerp(2.6, 1.9, va(t, t0 + 1.5, 1.5)), pose: t < t0 + 3 ? "marche" : "debout", phase: t * 2, parle: bouche("sergent1", t), expr: ["colere", 0.25] } : null],
      [gaston, { ...GASTON_ASSIS, parle: bouche("gaston1", t), expr: ["peur", 0.3 * va(t, t2, 0.4)], regard: [0.1, 0] }],
    ] });
    filmer(t, [
      P(-1, glisse(VERS_SORTIE, { ...VERS_SORTIE, cible: [0.3, 1.3, 2.4] }), mise),
      P(t1 - 0.15, glisse({ pos: [LIT.x + 0.3, 1.05, 0.0], cible: [0, 1.6, 1.9], fov: 50 }, { pos: [LIT.x + 0.35, 1.05, 0.0], cible: [0, 1.62, 1.9], fov: 46 }), mise),
      P(t2 - 0.15, glisse({ pos: [-1.2, 1.05, 0.15], cible: [1.22, 1.08, 0.2], fov: 40 }, { pos: [-1.15, 1.05, 0.15], cible: [1.22, 1.08, 0.2], fov: 36 }), mise),
    ], E("gaston1"));
  },
  texte(t) {
    const t0 = S("reveil"), tc = mot("reveil", "cagna", 4) - 0.4, t1 = S("sergent1");
    texte("05:00", CX, 420, 150, t, t0 + 0.05, { fin: tc - 0.3 });
    texte("LA CAGNA", CX, 400, ajuste("LA CAGNA", 120), t, tc, { fin: t1 - 0.2, couleur: BLEU });
    texte("= L'ABRI SOUS LA TERRE", CX, 510, ajuste("= L'ABRI SOUS LA TERRE", 60), t, tc + 0.4, { fin: t1 - 0.2, alpha: 0.85 });
    texte("LE GUET", CX, 420, 120, t, mot("sergent1", "guet", 2) - 0.3, { fin: S("gaston1") - 0.2 });
  },
});

// ---------------------------------------------------------------- the trench by day: mud, the periscope, no man's land, the rats
const MARCHE_T = [{ pos: [0, 1.62, 6], cible: [0, 0.5, -10], fov: 62 }, { pos: [0, 1.62, -4.2], cible: [0, 0.6, -14], fov: 62 }];
const SUR_MARCHE = { pos: [0.52, 2.12, -6], cible: [0.4, 2.3, -9], fov: 62 };
const PERISCOPE = { pos: [0.5, 2.85, -6], cible: [0.6, 2.25, -42], fov: 24 };
const SERG_TR = { x: -0.3, z: -7.9, ry: 0.4, pose: "debout" };
scene("boue", {
  dessin(t) {
    const t0 = S("boue"), tp = S("periscope"), tv = mot("periscope", "tube", 9) - 0.6, tn = S("nomans"), t2 = S("sergent2"), t3 = S("emile1"), tc = S("canons"), tr = mot("canons", "rats", 8) - 0.6;
    const leve = va(t, tp + 0.3, 0.9);
    const mise = t => miseTranchee(t, { rat: t > tr - 1 ? -11 + (t - tr + 1) * 0.8 : null, roles: [
      [sergent, t > tp - 0.5 ? { ...SERG_TR, parle: bouche("sergent2", t), regard: [0, 0.15] } : null],
      ...POILUS_LIGNE(t).slice(3),
    ] });
    filmer(t, [
      P(-1, marche(MARCHE_T[0], MARCHE_T[1]), mise),
      P(tp - 0.2, glisse({ ...SUR_MARCHE }, { ...SUR_MARCHE, cible: [0.5, 2.6, -9] }), mise, { mains: () => ({ quoi: "periscope", leve }) }),
      P(tv + 0.2, glisse(PERISCOPE, { ...PERISCOPE, cible: [0.2, 2.3, -42], fov: 20 }), mise, { apres: t => masquePeriscope(1) }),
      P(t2 - 0.3, glisse({ pos: [0.52, 2.0, -6], cible: [-0.3, 1.65, -7.9], fov: 44 }), mise),
      P(tc - 0.2, glisse({ pos: [0.52, 2.0, -6], cible: [-0.3, 2.6, -14], fov: 58 }, { pos: [0.52, 2.0, -6], cible: [-0.3, 1.8, -14], fov: 56 }), mise),
      P(tr - 0.2, glisse({ pos: [0.5, 1.9, -6], cible: [-0.25, 0.1, -9.5], fov: 50 }, { pos: [0.5, 1.9, -6], cible: [-0.25, 0.1, -7.6], fov: 48 }), mise),
    ], E("canons"));
    pluie(t, t > tv + 0.2 && t < t2 - 0.3 ? 0.6 : 1);
  },
  texte(t) {
    const t0 = S("boue"), tb = mot("boue", "boue", 3) - 0.3, tcb = mot("boue", "caillebotis", 9) - 0.4, tp = S("periscope"), tm = mot("periscope", "miroirs", 13) - 0.6, tn = S("nomans"), tnm = mot("nomans", "no", 18) - 0.3, t2 = S("sergent2"), tc = S("canons"), tt = mot("canons", "totos", 20) - 0.4;
    texte("LA BOUE", CX, 420, 120, t, tb, { fin: tcb - 0.3 });
    texte("LES CAILLEBOTIS", CX, 400, ajuste("LES CAILLEBOTIS", 100), t, tcb, { fin: tp - 0.2, couleur: BLEU });
    texte("= DES PLANCHES DE BOIS", CX, 510, ajuste("= DES PLANCHES DE BOIS", 60), t, tcb + 0.3, { fin: tp - 0.2, alpha: 0.85 });
    texte("LE PÉRISCOPE", CX, 400, ajuste("LE PÉRISCOPE", 110), t, mot("periscope", "périscope", 7) - 0.4, { fin: tn - 0.2 });
    texte("= UN TUBE À MIROIRS", CX, 510, ajuste("= UN TUBE À MIROIRS", 60), t, tm, { fin: tn - 0.2, alpha: 0.85 });
    texte("NO MAN'S LAND", CX, 400, ajuste("NO MAN'S LAND", 110), t, tnm, { fin: t2 - 0.4, couleur: BLEU });
    texte("= LA TERRE DE PERSONNE", CX, 1330, ajuste("= LA TERRE DE PERSONNE", 60), t, mot("nomans", "terre", 22) - 0.4, { fin: t2 - 0.4 });
    texte("LES CANONS, AU LOIN", CX, 420, ajuste("LES CANONS, AU LOIN", 76), t, tc + 0.05, { fin: tt - 0.3 });
    texte("LES TOTOS", CX, 400, ajuste("LES TOTOS", 120), t, tt, { couleur: BLEU });
    texte("= LES POUX", CX, 510, 72, t, tt + 0.3, { alpha: 0.85 });
  },
});

// ---------------------------------------------------------------- the soup, at night
scene("soupe", {
  dessin(t) {
    const t0 = S("soupe"), tp = S("porteur"), tg = S("gaston2");
    const mise = t => miseTranchee(t, { nuit: 1, roles: [
      ...porteurs.map((q, i) => [q, { x: i ? 0.2 : -0.15, z: Math.min(-1.9 - i * 1.4, lerp(-22 - i * 1.4, -1.9 - i * 1.4, va(t, t0 + 1.2, tp - t0 - 0.6))), ry: 0, pose: t < tp - 0.2 ? "marche" : "debout", phase: t * 2 + i, parle: i ? 0 : bouche("porteur", t), expr: ["joie", 0.4] }]),
      [gaston, { x: 0.35, z: -1.2, ry: -0.6, pose: "debout", parle: bouche("gaston2", t), expr: ["joie", 0.6 * va(t, tg, 0.4)], phase: 1 }],
      ...POILUS_LIGNE(t).slice(4),
    ] });
    filmer(t, [
      P(-1, glisse({ pos: [0, 1.62, 1.2], cible: [0, 1.4, -24], fov: 58 }, { pos: [0, 1.62, 1.0], cible: [0, 1.4, -24], fov: 56 }), mise),
      P(tp - 0.15, glisse({ pos: [0, 1.62, 0.2], cible: [-0.15, 1.5, -1.9], fov: 52 }), mise, { mains: () => ({ quoi: "gamelle" }) }),
      P(tg - 0.15, glisse({ pos: [-0.25, 1.6, 0.1], cible: [0.35, 1.55, -1.2], fov: 46 }), mise, { mains: () => ({ quoi: "gamelle" }) }),
    ], E("gaston2"));
    pluie(t, 0.6);
  },
  texte(t) {
    const t0 = S("soupe"), tf = mot("soupe", "froide", 11) - 0.5, tp = S("porteur");
    texte("LA SOUPE", CX, 400, ajuste("LA SOUPE", 120), t, t0 + 0.05, { fin: tf - 0.3 });
    texte("ARRIVE LA NUIT", CX, 510, ajuste("ARRIVE LA NUIT", 70), t, mot("soupe", "noir", 4) - 0.3, { fin: tf - 0.3, alpha: 0.85 });
    texte("SOUVENT FROIDE", CX, 1300, ajuste("SOUVENT FROIDE", 84), t, tf, { fin: tp - 0.2, couleur: BLEU });
  },
});

// ---------------------------------------------------------------- the letter from Louise; the answer
const A_TABLE = { pos: [0, 1.15, -1.25], cible: [0, 0.72, -1.95], fov: 60 };
scene("courrier", {
  dessin(t) {
    const tl = mot("courrier", "lettre", 4) - 0.3, tr = S("reponse"), te = mot("reponse", "réponds", 8) - 0.6;
    filmer(t, [P(-1, glisse({ pos: [0, 1.2, -0.9], cible: [0, 0.9, -2.3], fov: 60 }, A_TABLE), t => miseCagna(t, { lum: 0.6, roles: [[gaston, { ...GASTON_ASSIS, z: 0.6, regard: [0.3, 0.2], phase: 2 }]] }), { mains: () => ({ quoi: "vide" }) })], E("reponse"));
    feuillePapier(t, va(t, tl + 0.2, 0.7) * (1 - va(t, tr + 0.2, 0.4)) + va(t, te, 0.6));
  },
  texte(t) {
    const t0 = S("courrier"), tl = mot("courrier", "lettre", 4) - 0.3, tr = S("reponse"), te = mot("reponse", "réponds", 8) - 0.6, tp = mot("reponse", "permission", 1) - 0.3;
    texte("19:00", CX, 420, 150, t, t0 + 0.05, { fin: tl });
    if (t > tl + 0.3 && t < tr + 0.3) {
      const y0 = 470;
      ligneEcrite("Mon Émile,", y0, t, tl + 0.6, 26, { taille: 58 });
      ligneEcrite("je compte les jours jusqu'à", y0 + 148, t, mot("louise", "compte", 2) - 0.3, 26);
      ligneEcrite("ta permission.", y0 + 222, t, mot("louise", "permission", 4) - 0.4, 22);
      ligneEcrite("Ici, tout le monde", y0 + 296, t, mot("louise", "Ici", 5) - 0.2, 24);
      ligneEcrite("pense à toi.", y0 + 370, t, mot("louise", "pense", 6) - 0.3, 22);
      ligneEcrite("Je t'attends.", y0 + 444, t, mot("louise", "attends", 9) - 0.6, 22);
      ligneEcrite("Louise", y0 + 592, t, E("louise") - 1.0, 14, { taille: 60 });
    }
    texte("LA PERMISSION", CX, 400, ajuste("LA PERMISSION", 100), t, tp, { fin: te - 0.3, couleur: BLEU });
    texte("= QUELQUES JOURS", CX, 510, ajuste("= QUELQUES JOURS", 66), t, tp + 0.4, { fin: te - 0.3, alpha: 0.85 });
    texte("À LA MAISON", CX, 590, ajuste("À LA MAISON", 66), t, tp + 0.6, { fin: te - 0.3, alpha: 0.85 });
    if (t > te) {
      const y0 = 470;
      ligneEcrite("Ma chère Louise,", y0, t, te + 0.2, 22, { taille: 58 });
      ligneEcrite("tout va bien ici.", y0 + 148, t, te + 1.3, 18);
      ligneEcrite("Ne t'inquiète pas.", y0 + 222, t, te + 2.5, 18);
    }
  },
});

// ---------------------------------------------------------------- the night: sleeping in turns
scene("nuit", {
  dessin(t) {
    const t0 = S("nuit"), t1 = S("gaston3"), t2 = S("emile2");
    const mise = t => miseCagna(t, { lum: 0.55, sansCasque: true, roles: [[gaston, { x: 1.6, y: 0.53, z: 0.75, rx: -Math.PI / 2, ry: Math.PI, parle: bouche("gaston3", t), expr: ["tristesse", 0.5], regard: [-0.6, 0] }], [copains[0], { x: 1.6, y: 1.28, z: 0.75, rx: -Math.PI / 2, ry: Math.PI, expr: ["joie", 0.9] }]] });
    filmer(t, [
      P(-1, glisse({ ...OEIL_LIT, cible: [LIT.x + 0.2, 1.7, 0.3] }, { ...OEIL_LIT, cible: [1.0, 1.2, 0.3] }), mise),
      P(t1 - 0.15, glisse({ pos: [LIT.x + 0.15, LIT.y + 0.4, -0.55], cible: [1.6, 0.62, -0.97], fov: 30 }, { pos: [LIT.x + 0.15, LIT.y + 0.4, -0.55], cible: [1.6, 0.62, -0.97], fov: 27 }), mise),
    ], E("emile2"));
    paupieres(va(t, E("emile2") - 2.2, 1.8));
  },
  texte(t) {
    texte("22:00", CX, 420, 150, t, S("nuit") + 0.05, { fin: S("gaston3") - 0.2 });
    texte("UN ŒIL OUVERT", CX, 1300, ajuste("UN ŒIL OUVERT", 80), t, mot("nuit", "œil", 6) - 0.4, { fin: S("gaston3") - 0.2, couleur: BLEU });
  },
});

// ---------------------------------------------------------------- the end: 11 November 1918
scene("fin", {
  dessin(t) {
    filmer(t, [P(-1, glisse({ pos: [0, 1.62, 3], cible: [0, 1.3, -30], fov: 58 }, { pos: [0, 1.62, 1.8], cible: [0, 1.35, -30], fov: 58 }), t => miseTranchee(t, { nuit: 0.4, roles: [] }))], EP.DUREE);
    pluie(t, 0.7);
    ctx.fillStyle = "rgba(4,5,6,.55)"; ctx.fillRect(0, 0, W, H);
  },
  texte(t) {
    const t0 = S("fin"), t2 = mot("fin", "deux", 3) - 0.4, tn = mot("fin", "onze", 6) - 0.4, ta = phrase("fin", 3).start, tq = phrase("fin", 4).start;
    texte("ON NE LE SAIT PAS ENCORE", CX, 420, ajuste("ON NE LE SAIT PAS ENCORE", 64), t, t0 + 0.05, { fin: t2 - 0.3, alpha: 0.85 });
    texte("ENCORE 2 ANS", CX, 760, ajuste("ENCORE 2 ANS", 120), t, t2, { fin: tn - 0.3 });
    texte("11 NOVEMBRE 1918", CX, 760, ajuste("11 NOVEMBRE 1918", 110), t, tn, { fin: tq - 0.5 });
    texte("ON SE SOUVIENT D'EUX", CX, 900, ajuste("ON SE SOUVIENT D'EUX", 70), t, ta, { fin: tq - 0.5, couleur: BLEU });
    texte("ET TOI ?", CX, 740, 130, t, tq);
    texte("UN POILU", CX, 880, ajuste("UN POILU", 84), t, mot("fin", "poilu", 15) - 0.4, { couleur: BLEU });
    texte("DANS TA FAMILLE ?", CX, 980, ajuste("DANS TA FAMILLE ?", 76), t, mot("fin", "famille", 16) - 0.4);
  },
});

// ---------------------------------------------------------------- interface: the time at the top (log book)
const HEURES = () => [[S("contexte"), "NOVEMBRE 1916"], [S("reveil"), "NOVEMBRE 1916 — 05:00"], [S("boue"), "NOVEMBRE 1916 — 07:00"], [S("soupe"), "NOVEMBRE 1916 — 17:30"], [S("courrier"), "NOVEMBRE 1916 — 19:00"], [S("nuit"), "NOVEMBRE 1916 — 22:00"], [S("fin"), null]];
function heureDe(t) { let s = null; for (const [a, v] of HEURES()) if (t >= a) s = v; return s; }
function journal(t) {
  const s = heureDe(t);
  let avant = null, tc = -9;
  for (let k = 1; k <= 10; k++) { const u = t - k * 0.05, x = u < 0 ? null : heureDe(u); if (x !== s) { avant = x; tc = t - (k - 0.5) * 0.05; break; } }
  const p = sort(t, tc, 0.45);
  if (avant && p < 1) ecrire(avant, ZONE.x0, 176 - 22 * p, TAILLE_MIN, { align: "left", alpha: 0.85 * (1 - p) });
  if (s) ecrire(s, ZONE.x0, 176 + 22 * (1 - p), TAILLE_MIN, { align: "left", alpha: 0.85 * (avant ? p : 1) });
}

// ---------------------------------------------------------------- sound
const IDS = ["hook", "contexte", "poilus", "reveil", "sergent1", "gaston1", "boue", "periscope", "nomans", "sergent2", "emile1", "canons", "soupe", "porteur", "gaston2", "courrier", "louise", "reponse", "nuit", "gaston3", "emile2", "fin"];
lancer({
  accent: BLEU, boite: "#3E4650", motsCles: ["tranchée", "poilu", "boue", "cagna", "caillebotis", "périscope", "no", "totos", "soupe", "permission", "louise", "novembre"],
  carteMots: 3, carteMax: 15,
  decors: { sergent1: "reveil", gaston1: "reveil", periscope: "boue", nomans: "boue", sergent2: "boue", emile1: "boue", canons: "boue", porteur: "soupe", gaston2: "soupe", louise: "courrier", reponse: "courrier", gaston3: "nuit", emile2: "nuit" },
  flou: 2, grain: 0.035,
  mention: [ZONE.x0, 240, "left"],
  mentions: Object.fromEntries(IDS.map(id => [id, ["contexte", "fin"].includes(id) ? "ILLUSTRATION" : "RECONSTITUTION"])),
  sources: { titre: "SOURCES", duree: 6, lignes: ["Musée de l'Armée, fiches pédagogiques sur les tranchées.", "Archives de la Marne, « Poilus et tranchées ».", "Émile, Gaston, le sergent, les porteurs et Louise sont inventés.", "Voix de synthèse, images d'illustration."] },
  interface(t) { journal(t); },
  musique: () => ({ style: "dark", root: 36, room: true }),
  silences: () => [[phrase("fin", 2).end + 0.08, phrase("fin", 3).start - 0.08, 1.4]],
  sons() {
    EP.ORDRE.forEach((id, i) => { if (i && decorDe(id) !== decorDe(EP.ORDRE[i - 1])) sfx(S(id) - 0.25, "swish", { gain: 0.1 }); });
    for (const [a, b, g] of [[S("poilus"), E("poilus"), 0.45], [S("boue"), E("canons"), 0.5], [S("soupe"), E("gaston2"), 0.35], [S("fin"), E("fin"), 0.3]]) sfx(a - 0.2, "pluie", { dur: +(b - a + 0.3).toFixed(2), gain: g });
    for (let x = S("canons") + 0.3; x < E("canons") - 3; x += 3.8) sfx(+x.toFixed(2), "rumble", { dur: 3.5, gain: 0.22 });
    for (const x of [S("boue") + 1, S("periscope") + 2, S("contexte") + 6]) sfx(x, "rumble", { dur: 3.0, gain: 0.14 });
    for (let x = S("boue") + 0.3; x < S("periscope") - 0.6; x += 0.55) sfx(+x.toFixed(2), "step", { gain: 0.1 });
    for (let x = S("poilus") + 0.2; x < E("poilus") - 0.4; x += 0.6) sfx(+x.toFixed(2), "step", { gain: 0.08 });
    sfx(mot("courrier", "lettre", 4) - 0.2, "paper", { gain: 0.25 }); sfx(mot("reponse", "réponds", 8) - 0.6, "paper", { gain: 0.2 });
    sfx(mot("reponse", "réponds", 8) - 0.3, "scribble", { dur: 3.0, gain: 0.25 });
  },
  voix: { bed: 0.19, duck: 0.65 },
});
