// La Troisième Vague (Palo Alto, April 1967), played by the PS2-style characters (lib/ps2.js) in dark low-poly sets:
// a classroom of the time and a hall. Same voice, sound, counter, subtitles and export as v13-troisieme-vague
// (lib/epure.js): the 3D picture is rendered at full size (nothing enlarged), texts stay vector, one bold font, safe
// zones, the heart faster every day, total silence twice. Palette: black, off-white, greys, one red accent (the wave,
// the marks, the one who says no). No Nazi symbol: the film of the last day is rows of plain pictograms. Nobody speaks.
import * as THREE from "three";
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidamPS2, creerFoulePS2, qualitePS2, texturePS2, eleve1967, prof1967 } from "../lib/ps2.js";

const TAU = Math.PI * 2;
qualitePS2(3);
const st = creerStudio({ antialias: true });
st.sol.visible = false; st.gl.shadowMap.enabled = false; st.key.castShadow = false;
st.scene.fog = new THREE.Fog("#050506", 9, 30);
st.key.position.set(-6, 5, 1.5); st.key.target.position.set(0, 1, 1); st.key.color.set("#E4E8EE");
st.ciel.color.set("#C4C9D2"); st.ciel.groundColor.set("#2E2C2A");
st.contre.position.set(4, 3, -6); st.contre.color.set("#D8DCE4");
const lam = o => new THREE.MeshLambertMaterial(o);
const FILTRE = "saturate(0.72) contrast(1.1)";

// ---------------------------------------------------------------- painted textures of the sets
function peint(w, h, f, rx = 1, ry = 1) { const t = texturePS2(w, h, f); t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function grainDe(x, w, h, a, graine, n = 500) { const r = rng(graine); for (let i = 0; i < n; i++) { const v = r(); x.fillStyle = v > 0.5 ? `rgba(255,255,255,${a * v})` : `rgba(0,0,0,${a * 1.6 * (1 - v)})`; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 2); } }
const solP = (x, w, h) => { x.fillStyle = "#34322F"; x.fillRect(0, 0, w, h); x.fillStyle = "#2A2927"; x.fillRect(0, 0, w / 2, h / 2); x.fillRect(w / 2, h / 2, w / 2, h / 2); grainDe(x, w, h, 0.1, 3, 700); };
const murP = (x, w, h) => { x.fillStyle = "#8A867C"; x.fillRect(0, 0, w, h); x.fillStyle = "#4A4843"; x.fillRect(0, h * 0.62, w, h * 0.38); x.fillStyle = "#2C2B28"; x.fillRect(0, h * 0.62, w, 3); grainDe(x, w, h, 0.07, 5, 900); };
const boisP = (x, w, h) => { x.fillStyle = "#6A6256"; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + 0.08 * ((i * 7) % 5) / 5})`; x.fillRect(0, i * h / 14, w, 2); } grainDe(x, w, h, 0.08, 9, 300); };

function piece(lx, z0, z1, h) {
  const g = new THREE.Group(), lz = z1 - z0, zc = (z0 + z1) / 2;
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), lam({ map: peint(64, 64, solP, lx / 1.2, lz / 1.2) })); sol.rotation.x = -Math.PI / 2; sol.position.set(0, 0, zc); g.add(sol);
  const mur = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam({ map: peint(64, 128, murP, w / 1.6, 1) })); m.position.set(x, h / 2, z); m.rotation.y = ry; g.add(m); };
  mur(lx, 0, z0, 0); mur(lx, 0, z1, Math.PI); mur(lz, -lx / 2, zc, Math.PI / 2); mur(lz, lx / 2, zc, -Math.PI / 2);
  const plafond = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), lam({ color: "#1B1B1D" })); plafond.rotation.x = Math.PI / 2; plafond.position.set(0, h, zc); g.add(plafond);
  return g;
}
const boite = (g, m, w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
function serie(g, geo, m, places) { const im = new THREE.InstancedMesh(geo, m, places.length), M = new THREE.Matrix4(); places.forEach(([x, y, z], i) => { M.makeTranslation(x, y, z); im.setMatrixAt(i, M); }); im.frustumCulled = false; g.add(im); return im; }
/** A television set of the 1960s on a cart; returns its group, the screen's material and its light. */
function televiseur() {
  const g = new THREE.Group(), sombre = lam({ color: "#3A3A40" }), metal = lam({ color: "#55565C" });
  boite(g, sombre, 0.86, 0.66, 0.5, 0, 1.33, 0);
  const ecran = lam({ color: "#2C3134", emissive: "#EDE7DA", emissiveIntensity: 0 });
  const e = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.46), ecran); e.position.set(-0.07, 1.34, 0.252); g.add(e);
  boite(g, metal, 0.1, 0.36, 0.01, 0.33, 1.34, 0.252);
  boite(g, metal, 0.9, 0.04, 0.54, 0, 0.98, 0); boite(g, metal, 0.9, 0.04, 0.54, 0, 0.3, 0);
  for (const x of [-0.42, 0.42]) for (const z of [-0.24, 0.24]) boite(g, metal, 0.03, 1.0, 0.03, x, 0.5, z);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 5), metal); a.position.set(s * 0.14, 1.9, 0); a.rotation.z = -s * 0.45; g.add(a); }
  const feu = new THREE.PointLight("#EDE7DA", 0, 0, 1.6); feu.position.set(-0.07, 1.4, 0.9); g.add(feu);
  return { g, ecran, feu };
}

// ---------------------------------------------------------------- the classroom
const LX = 5.8, Z0 = -5.4, Z1 = 9.6, HAUT = 3.1;
const COLS = [-1.5, -0.5, 0.5, 1.5];
const SIEGES = Array.from({ length: 32 }, (_, i) => ({ i, c: i % 4, r: Math.floor(i / 4), x: COLS[i % 4], zd: -1.9 + Math.floor(i / 4), z: -1.42 + Math.floor(i / 4) }));
const classe = piece(LX, Z0, Z1, HAUT);
st.plateau.add(classe);
{
  const bois = lam({ map: peint(64, 64, boisP) }), metal = lam({ color: "#2B2C30" }), chaise = lam({ color: "#3B3A37" });
  serie(classe, new THREE.BoxGeometry(0.62, 0.04, 0.44), bois, SIEGES.map(s => [s.x, 0.73, s.zd]));
  serie(classe, new THREE.BoxGeometry(0.04, 0.71, 0.38), metal, SIEGES.flatMap(s => [[s.x - 0.27, 0.355, s.zd], [s.x + 0.27, 0.355, s.zd]]));
  serie(classe, new THREE.BoxGeometry(0.4, 0.04, 0.4), chaise, SIEGES.map(s => [s.x, 0.43, s.z + 0.04]));
  serie(classe, new THREE.BoxGeometry(0.4, 0.4, 0.04), chaise, SIEGES.map(s => [s.x, 0.74, s.z + 0.25]));
  serie(classe, new THREE.BoxGeometry(0.03, 0.43, 0.03), metal, SIEGES.flatMap(s => [[s.x - 0.17, 0.215, s.z - 0.12], [s.x + 0.17, 0.215, s.z - 0.12], [s.x - 0.17, 0.215, s.z + 0.22], [s.x + 0.17, 0.215, s.z + 0.22]]));
  boite(classe, bois, 1.35, 0.06, 0.7, -1.75, 0.76, -4.25); boite(classe, lam({ color: "#4A453C" }), 1.25, 0.72, 0.6, -1.75, 0.37, -4.25);   // the teacher's desk
  boite(classe, lam({ color: "#3A342C" }), 4.4, 1.45, 0.06, 0, 1.72, Z0 + 0.03);   // blackboard frame
  for (const z of [-1.2, 2.2, 5.6]) { boite(classe, lam({ color: "#2A2927" }), 0.08, 1.5, 1.8, -LX / 2 + 0.03, 1.85, z); }   // window frames
}
// the blackboard: chalk dust, and the red wave drawn progressively
const tabCanvas = Object.assign(document.createElement("canvas"), { width: 1280, height: 384 });
const tabTex = new THREE.CanvasTexture(tabCanvas); tabTex.colorSpace = THREE.SRGBColorSpace;
{ const t = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.26), lam({ map: tabTex, emissive: "#FFFFFF", emissiveMap: tabTex, emissiveIntensity: 0.5 })); t.position.set(0, 1.72, Z0 + 0.07); classe.add(t); }
let craieP = -1;
function ardoise(p) {
  p = Math.round(clamp(p) * 80) / 80;
  if (p === craieP) return;
  craieP = p;
  const x = tabCanvas.getContext("2d"), r = rng(4);
  x.fillStyle = "#141615"; x.fillRect(0, 0, 1280, 384);
  for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(230,228,220,${0.015 + 0.03 * r()})`; x.lineWidth = 20 + r() * 50; x.beginPath(); const y = r() * 384, x0 = r() * 1280; x.moveTo(x0, y); x.lineTo(x0 + 150 + r() * 300, y + (r() - 0.5) * 40); x.stroke(); }
  if (p > 0) {
    x.lineCap = "round"; x.lineJoin = "round";
    x.strokeStyle = "rgba(235,230,220,.92)"; x.lineWidth = 9; x.beginPath(); x.arc(640, 192, 150, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p * 2)); x.stroke();
    const q = clamp(p * 2 - 1);
    if (q > 0) { x.strokeStyle = "#D0141F"; x.lineWidth = 20; x.beginPath(); for (let u = 0; u <= q; u += 0.01) { const px = 540 + 200 * u, py = 192 + 46 * Math.sin(u * TAU * 2); if (u === 0) x.moveTo(px, py); else x.lineTo(px, py); } x.stroke(); }
  }
  tabTex.needsUpdate = true;
}
const vitres = lam({ color: "#0A0B0D", emissive: "#7C8794", emissiveIntensity: 0.9 });
for (const z of [-1.2, 2.2, 5.6]) { const v = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), vitres); v.rotation.y = Math.PI / 2; v.position.set(-LX / 2 + 0.08, 1.85, z); classe.add(v); boite(classe, lam({ color: "#2A2927" }), 0.1, 1.3, 0.05, -LX / 2 + 0.09, 1.85, z); }
const tubes = lam({ color: "#111", emissive: "#E8E6DC", emissiveIntensity: 0.5 });
for (const z of [-3, 0.5, 4, 7.5]) boite(classe, tubes, 1.3, 0.05, 0.12, 0, HAUT - 0.04, z);
// the door on the right, near the board: a lit corridor behind it
const couloir = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.05), lam({ color: "#000", emissive: "#D8D4C8", emissiveIntensity: 0.75 })); couloir.rotation.y = -Math.PI / 2; couloir.position.set(LX / 2 - 0.02, 1.025, -3.9); classe.add(couloir);
const gond = new THREE.Group(); gond.position.set(LX / 2 - 0.04, 0, -4.375); classe.add(gond);
{ const p = boite(gond, lam({ color: "#3E3A33" }), 0.05, 2.05, 0.95, 0, 1.025, 0.475); boite(gond, lam({ color: "#8A8478" }), 0.02, 0.05, 0.12, -0.035, 1.0, 0.82); }
const tvClasse = televiseur(); tvClasse.g.position.set(1.55, 0, -4.45); tvClasse.g.rotation.y = -0.25; classe.add(tvClasse.g);

// ---------------------------------------------------------------- the hall of the last day
const salle = piece(8.6, -10.2, 11, 4.6);
st.plateau.add(salle);
boite(salle, lam({ color: "#2E2D2B" }), 8.6, 0.5, 2.6, 0, 0.25, -8.9);   // the stage
const tvSalle = televiseur(); tvSalle.g.position.set(0, 0.5, -8.3); salle.add(tvSalle.g);
// the film: rows of the same plain pictograms, drawn large (no symbol of any kind)
const filmCanvas = Object.assign(document.createElement("canvas"), { width: 1280, height: 800 });
{
  const x = filmCanvas.getContext("2d");
  x.fillStyle = "#3A3A3C"; x.fillRect(0, 0, 1280, 800);
  const g = x.createRadialGradient(640, 400, 100, 640, 400, 760); g.addColorStop(0, "rgba(255,255,255,.12)"); g.addColorStop(1, "rgba(0,0,0,.5)"); x.fillStyle = g; x.fillRect(0, 0, 1280, 800);
  x.fillStyle = "#E9E3D6";
  for (let r = 0; r < 6; r++) for (let c = 0; c < 15; c++) { const px = 80 + c * 80, py = 150 + r * 110; x.beginPath(); x.arc(px, py - 31, 15, 0, TAU); x.fill(); x.beginPath(); x.roundRect(px - 26, py - 11, 52, 40, [22, 22, 7, 7]); x.fill(); }
}
const filmTex = new THREE.CanvasTexture(filmCanvas); filmTex.colorSpace = THREE.SRGBColorSpace;
const toile = lam({ color: "#151516", emissive: "#FFFFFF", emissiveMap: filmTex, emissiveIntensity: 0 });
{ const e = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.375), toile); e.position.set(0, 2.85, -10.1); salle.add(e); boite(salle, lam({ color: "#1A1A1B" }), 4.0, 2.56, 0.04, 0, 2.85, -10.16); }
const feuFilm = new THREE.PointLight("#D8D6D0", 0, 0, 1.4); feuFilm.position.set(0, 3, -8.6); salle.add(feuFilm);
const PLACES = Array.from({ length: 200 }, (_, i) => ({ c: i % 10, r: Math.floor(i / 10), x: (i % 10 - 4.5) * 0.66, z: -5.6 + Math.floor(i / 10) * 0.78, ry: Math.PI }));
const DEVANT = PLACES.filter(p => p.r < 2 && p.c >= 2 && p.c <= 7);   // the twelve nearest the stage: full characters
const foule = creerFoulePS2(PLACES.filter(p => !DEVANT.includes(p)), { graine: 3 });
salle.add(foule.groupe);
// in the classroom, the ones who came from other classes and stand at the back (Thursday)
const DEBOUT = [...Array.from({ length: 30 }, (_, i) => ({ x: -2.25 + (i % 6) * 0.9, z: 6.7 + Math.floor(i / 6) * 0.55 + (i % 2) * 0.12, ry: Math.PI })), ...Array.from({ length: 7 }, (_, i) => ({ x: -2.5, z: -0.6 + i * 0.95, ry: Math.PI * 0.75 }))];
const fouleClasse = creerFoulePS2(DEBOUT, { graine: 8 });
classe.add(fouleClasse.groupe);

// ---------------------------------------------------------------- the cast
const acteurs = new THREE.Group(); st.plateau.add(acteurs);
const carteTex = (croix) => texturePS2(128, 86, (x, w, h) => {
  x.fillStyle = "#EDE7DA"; x.fillRect(0, 0, w, h); x.strokeStyle = "#B5121E"; x.lineWidth = 7; x.lineCap = "round"; x.beginPath();
  for (let u = 0; u <= 1; u += 0.02) { const px = 24 + 80 * u, py = 34 + 12 * Math.sin(u * TAU * 2); if (u === 0) x.moveTo(px, py); else x.lineTo(px, py); } x.stroke();
  x.fillStyle = "rgba(20,20,22,.45)"; x.fillRect(24, 60, 80, 6);
  if (croix) { x.strokeStyle = "#B5121E"; x.lineWidth = 12; x.beginPath(); x.moveTo(30, 12); x.lineTo(98, 74); x.moveTo(98, 12); x.lineTo(30, 74); x.stroke(); }
});
const matCarte = lam({ map: carteTex(false) }), matCarteX = lam({ map: carteTex(true) });
const TROIS = [2, 6, 10];   // the three told to report: one behind the other
function acteur(graine, design, taille = 1) {
  const q = creerQuidamPS2({ role: "foule", graine, design, taille });
  q.carte = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.088, 0.004), matCarte); q.carte.position.set(0, -0.1, 0.03); q.carte.visible = false; q.articulations.mainG.add(q.carte);
  acteurs.add(q.objet);
  return q;
}
const eleves = Array.from({ length: 30 }, (_, i) => acteur(100 + i, eleve1967(100 + i), 0.94 + 0.08 * ((i * 7) % 5) / 5));
TROIS.forEach(i => (eleves[i].carte.material = matCarteX));
const nouveaux = Array.from({ length: 13 }, (_, i) => acteur(200 + i, eleve1967(200 + i), 0.95 + 0.06 * (i % 3) / 2));
const prof = acteur(7, prof1967(), 1.04);
const rebelle = acteur(113, eleve1967(113, { rouge: true }), eleves[13].objet.children[0].scale.x);   // the same student as eleves[13], in red
const JEU = (() => { const r = rng(21); return eleves.map(() => ({ tourne: (r() - 0.5) * 0.9, penche: 0.12 + r() * 0.3, tete: (r() - 0.5) * 0.5, nuque: r() * 0.35, retard: r() })); })();
// where the newcomers stand once inside (right wall, then the back)
const ARRIVEE = [...Array.from({ length: 9 }, (_, i) => ({ x: 2.45, z: -0.6 + i * 0.85, ry: -Math.PI * 0.72 })), ...Array.from({ length: 4 }, (_, i) => ({ x: -1.35 + i * 0.9, z: 6.25, ry: Math.PI }))];

// ---------------------------------------------------------------- gestures added to the poses of lib/quidams.js
const vers = (o, cle, v, k) => { o.rotation[cle] = lerp(o.rotation[cle], v, k); };
/** The salute of the Third Wave: the right hand cupped, brought up to the shoulder (not an outstretched arm). */
function salut(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -0.5, k); vers(a.epauleD, "z", -0.32, k); vers(a.coudeD, "x", -2.45, k); }
function leveMain(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -0.1, k); vers(a.epauleD, "z", -2.8, k); vers(a.coudeD, "x", -0.16, k); }
function montreCarte(q, k) {
  q.carte.visible = k > 0.02;
  if (k <= 0.02) return;
  const a = q.articulations; vers(a.epauleG, "x", -1.0, k); vers(a.epauleG, "z", 0.12, k); vers(a.coudeG, "x", -1.3, k);
  q.carte.rotation.x = -(a.epauleG.rotation.x + a.coudeG.rotation.x) - 1.57;   // the card stays facing forward
}
function jouer(q, t, o = {}) {
  q.objet.visible = !o.cache;
  if (o.cache) return;
  q.objet.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); q.objet.rotation.y = o.ry ?? 0;
  if (Array.isArray(o.pose)) q.transitionPose(o.pose[0], o.pose[1], o.pose[2]); else q.pose(o.pose || "debout");
  if (o.expr) q.expression(o.expr[0], o.expr[1]); else q.expression("neutre", 0);
  q.regarder(...(o.regard || [0, 0])); q.parler(o.parle || 0);
  q.animer(t + (o.phase || 0));
  const a = q.articulations;
  if (o.mou) { const J = o.jeu; a.buste.rotation.x += J.penche * o.mou; a.cou.rotation.z += J.tete * o.mou; a.cou.rotation.x += J.nuque * o.mou; }
  leveMain(q, o.main || 0); salut(q, o.salut || 0); montreCarte(q, o.carte || 0);
}
/** A student at seat i: seated (o.leve stands up in the aisle), facing the board. */
function asseoir(q, i, t, o = {}) {
  const s = SIEGES[i], J = JEU[i % JEU.length], leve = o.leve || 0;
  jouer(q, t, { ...o, x: s.x + 0.47 * leve * (s.c % 2 ? -1 : 1), z: s.z, ry: Math.PI + J.tourne * (o.mou || 0), pose: ["assis", "debout", leve], phase: i * 0.7, jeu: J });
}
/** The classroom at t. eleve(i, s) gives each student's options; the rest sets the teacher, light and props. */
function miseClasse(t, { eleve = () => ({}), profo = {}, arrives = null, fond = 0, porte = 0, tv = 0, craie = 0, nuit = 0, vide = false, refus = null } = {}) {
  classe.visible = true; salle.visible = false;
  st.ciel.intensity = lerp(1.25, 0.42, nuit); st.key.intensity = lerp(1.9, 0.65, nuit); st.contre.intensity = lerp(0.6, 0.3, nuit);
  vitres.emissiveIntensity = lerp(0.9, 0.22, nuit); tubes.emissiveIntensity = lerp(0.55, 0.2, nuit);
  st.scene.fog.near = 9; st.scene.fog.far = lerp(32, 22, nuit);
  eleves.forEach((q, i) => (vide || (refus && i === 13) ? (q.objet.visible = false) : asseoir(q, i, t, eleve(i, SIEGES[i]) || {})));
  if (refus) asseoir(rebelle, 13, t, refus); else rebelle.objet.visible = false;
  nouveaux.forEach((q, i) => jouer(q, t, arrives ? { ...arrives(i), phase: i * 1.3 } : { cache: true }));
  fouleClasse.groupe.visible = fond > 0; if (fond > 0) fouleClasse.animer(t);
  jouer(prof, t, { x: 0.5, z: -4.1, ry: 0, ...profo });
  gond.rotation.y = -1.35 * porte; couloir.material.emissiveIntensity = 0.75 * porte;
  tvClasse.g.visible = tv > 0; tvClasse.ecran.emissiveIntensity = 0.07; tvClasse.feu.intensity = 0;
  ardoise(craie);
}
/** The hall at t: the crowd in ranks facing the stage, twelve full characters in front, the teacher by the set. */
function miseSalle(t, { devant = () => ({}), profo = null, allume = 0, film = 0, desordre = 0, tv = true } = {}) {
  classe.visible = false; salle.visible = true;
  st.ciel.intensity = 0.55; st.key.intensity = 0.7; st.contre.intensity = 0.35;
  st.scene.fog.near = 12; st.scene.fog.far = 46;
  foule.animer(t, { desordre });
  eleves.forEach((q, i) => {
    if (i >= DEVANT.length) { q.objet.visible = false; return; }
    const p = DEVANT[i], o = devant(i, p) || {};
    jouer(q, t, { x: p.x + desordre * (JEU[i].tete) * 0.5, z: p.z + desordre * (JEU[i].tourne) * 0.3, ry: Math.PI + desordre * JEU[i].tourne * 1.2, phase: i * 0.7, ...o });
  });
  rebelle.objet.visible = false; nouveaux.forEach(q => (q.objet.visible = false));
  jouer(prof, t, profo ? { y: 0.5, ...profo } : { cache: true });
  tvSalle.g.visible = tv; tvSalle.ecran.emissiveIntensity = 1.1 * allume; tvSalle.feu.intensity = 15 * allume;
  toile.emissiveIntensity = 0.95 * film; feuFilm.intensity = 30 * film;
}

// ---------------------------------------------------------------- camera: shots inside a scene, joined by a short dissolve
const tampon = Object.assign(document.createElement("canvas"), { width: W, height: H });
const doux = u => u * u * (3 - 2 * u);
/** A shot drifting from camera a to camera b, eased. */
const glisse = (a, b = a) => u => { const k = doux(u); return { fov: lerp(a.fov ?? 50, b.fov ?? a.fov ?? 50, k), pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), cible: a.cible.map((v, i) => lerp(v, b.cible[i], k)) }; };
const P = (t0, cam, mise) => ({ t0, cam, mise });
function prise(t, p, fin) { p.mise(t); const c = typeof p.cam === "function" ? p.cam(clamp((t - p.t0) / Math.max(0.01, fin - p.t0)), t) : p.cam; st.tourner(ctx, 0, 0, W, H, { fov: c.fov ?? 50, pos: c.pos, cible: c.cible, filtre: FILTRE }); }
function filmer(t, liste, fin) {
  let i = 0;
  while (i + 1 < liste.length && t >= liste[i + 1].t0) i++;
  const bout = j => (j + 1 < liste.length ? liste[j + 1].t0 : fin), d = t - liste[i].t0;
  if (i > 0 && d < 0.3) {   // the previous shot under the new one fading in: every pixel goes straight from one to the other
    prise(t, liste[i - 1], bout(i - 1) + 0.3); tampon.getContext("2d").drawImage(cv, 0, 0);
    prise(t, liste[i], bout(i));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - d / 0.3; ctx.drawImage(tampon, 0, 0); ctx.restore();
  } else prise(t, liste[i], bout(i));
  // text sits on the dark top and bottom of the picture
  let g = ctx.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, "rgba(3,3,4,.9)"); g.addColorStop(0.62, "rgba(3,3,4,.5)"); g.addColorStop(1, "rgba(3,3,4,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 800);
  g = ctx.createLinearGradient(0, 1080, 0, H); g.addColorStop(0, "rgba(3,3,4,0)"); g.addColorStop(0.45, "rgba(3,3,4,.42)"); g.addColorStop(1, "rgba(3,3,4,.82)"); ctx.fillStyle = g; ctx.fillRect(0, 1080, W, H - 1080);
}
const FACE = { pos: [0, 2.75, -4.95], cible: [0, 0.35, 1.2], fov: 56 }, FACE2 = { pos: [0, 2.6, -4.6], cible: [0, 0.35, 1.2], fov: 56 };
const DOS = { pos: [0.3, 2.5, 8.2], cible: [0, 0.4, -4.5], fov: 50 }, DOS2 = { pos: [0.2, 2.35, 6.9], cible: [0, 0.4, -4.5], fov: 50 };

// ---------------------------------------------------------------- 2D marks over the picture
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
function vague(x0, x1, y, amp, periode, p) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = ROUGE; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
  const fin = x0 + (x1 - x0) * Math.min(1, p);
  for (let x = x0; x <= fin; x += 3) { const yy = y + amp * Math.sin((x - x0) / periode * TAU); if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------- 1967: one day planned, five days
scene("hook", {
  dessin(t) {
    const tc = mot("hook", "professeur", 2.8) - 0.2, tr = EP.T.reveals[0];
    const cours = t => miseClasse(t, { eleve: () => ({ mou: 0.75 }), profo: { pose: "debout" } });
    filmer(t, [
      P(-1, glisse({ pos: [0.3, 2.6, 9.0], cible: [0, 0.6, -4.5], fov: 50 }, DOS2), cours),
      P(tc, glisse(FACE, FACE2), cours),
      // five days later: the whole school in ranks, and he is small in front of them
      P(tr - 0.25, glisse({ pos: [0, 5.4, -9.9], cible: [0, -2.4, 0.8], fov: 58 }, { pos: [0, 6.2, -10.1], cible: [0, -2.4, 0.8], fov: 58 }), t => miseSalle(t, { profo: { x: 0, y: 0, z: -6.75, ry: 0, pose: "debout" }, tv: false })),
    ], E("hook"));
    vague(CX - 300, CX + 300, 668, 16, 150, va(t, EP.T.reveals[0] + 0.7, 0.9));
  },
  texte(t) {
    const tc = mot("hook", "professeur", 2.8) - 0.2, tr = EP.T.reveals[0];
    const m = va(t, tc - 0.3, 0.8), k = lerp(1.1, 1, sort(t, -0.6, 1.4)) * lerp(1, 0.5, m);
    ctx.save(); ctx.translate(CX, lerp(600, 420, m)); ctx.scale(k, k);
    ecrire("1967", 0, 0, 300, { alpha: sort(t, -0.5, 0.6) * (1 - va(t, tr - 0.25, 0.4)) });
    ctx.restore();
    texte("CALIFORNIE", CX, 800, 60, t, mot("hook", "Californie", 2) - 0.2, { espace: 16, fin: tc - 0.25, alpha: 0.8 });
    texte("PRÉVU : 1 JOUR", CX, 1400, 60, t, mot("hook", "devait", 6), { fin: tr - 0.3, alpha: 0.85 });
    texte("LA TROISIÈME", CX, 380, ajuste("LA TROISIÈME", 96), t, tr + 0.35);
    texte("VAGUE", CX, 540, 210, t, tr + 0.5, { monte: 40 });
    texte("5 JOURS", CX, 1400, 84, t, tr + 0.05, { couleur: ROUGE });
  },
});

// ---------------------------------------------------------------- a student's question; the teacher and his aim
scene("question", {
  dessin(t) {
    const t0 = S("question"), tq = mot("question", "question", 0.8), t3 = phrase("question", 3).start, t4 = mot("question", "but", 11) - 0.25;
    const lui = 5, main = va(t, tq - 0.1, 0.5) * (1 - va(t, t3 - 0.6, 0.5));
    const cours = (profo) => t => miseClasse(t, { eleve: i => (i === lui ? { main, mou: 0.2, expr: ["doute", 0.7] } : { mou: 0.6, regard: [(SIEGES[i].x < SIEGES[lui].x ? -0.6 : 0.6) * main, 0] }), profo });
    filmer(t, [
      P(-1, glisse(FACE, FACE2), cours({})),
      P(t3 - 0.2, glisse({ pos: [0.9, 1.62, -1.9], cible: [0.5, 1.84, -4.1], fov: 38 }, { pos: [0.8, 1.62, -2.1], cible: [0.5, 1.84, -4.1], fov: 38 }), cours({ pose: ["debout", "hausseEpaules", 0.55 * va(t, t3, 0.5)], expr: ["doute", 1], regard: [0.3, -0.2] })),
      P(t4 - 0.1, glisse(DOS, DOS2), cours({ pose: ["debout", "pointer", va(t, t4, 0.6)] })),
    ], E("question"));
  },
  texte(t) {
    const t0 = S("question"), t1 = mot("question", "Comment", 1.8), t2 = mot("question", "puis", 4.2), t3 = phrase("question", 3).start, t4 = mot("question", "but", 11) - 0.25;
    ecrire("?", CX, 400, 300, { alpha: sort(t, t0 + 0.1, 0.6) * (1 - va(t, t3 - 0.3, 0.4)) });
    texte("COMMENT ONT-ILS PU", CX, 600, ajuste("COMMENT ONT-ILS PU", 64), t, t1, { fin: t2 - 0.3 });
    texte("SUIVRE ?", CX, 680, 64, t, t1 + 0.6, { fin: t2 - 0.3 });
    texte("PUIS DIRE :", CX, 600, 56, t, t2, { fin: t3 - 0.3, alpha: 0.8 });
    texte("« ON NE SAVAIT RIEN »", CX, 680, ajuste("« ON NE SAVAIT RIEN »", 60), t, t2 + 0.35, { fin: t3 - 0.3 });
    texte("RON JONES", CX, 400, 110, t, t3);
    texte("PROFESSEUR D'HISTOIRE", CX, 510, ajuste("PROFESSEUR D'HISTOIRE", 58), t, t3 + 0.2);
    texte("PALO ALTO, CALIFORNIE", CX, 585, 48, t, t3 + 0.35, { alpha: 0.65 });
    texte("SON BUT", CX, 1210, 60, t, t4, { couleur: ROUGE });
    texte("MONTRER COMMENT", CX, 1290, 64, t, t4 + 0.25);
    texte("UN GROUPE BASCULE", CX, 1370, ajuste("UN GROUPE BASCULE", 64), t, t4 + 0.45);
  },
});

// ---------------------------------------------------------------- Monday: discipline
scene("lundi", {
  dessin(t) {
    const td = mot("lundi", "discipline", 2) - 0.15, ts = phrase("lundi", 2).start, tl = phrase("lundi", 3).start, tm = phrase("lundi", 4).start, te = phrase("lundi", 5).start;
    const lui = 5, leve = va(t, tl + 0.1, 0.7) * (1 - va(t, te - 0.5, 0.6));
    const parle = prog(t, tm, tm + 1.3) > 0 && t < tm + 1.35 ? Math.max(0, Math.sin((t - tm) * TAU * 2.3)) : 0;   // three words
    const cours = profo => t => miseClasse(t, { eleve: (i, s) => ({ mou: 1 - vif(t, td + s.r * 0.07, 0.55), ...(i === lui ? { leve, parle } : {}) }), profo });
    filmer(t, [
      P(-1, glisse(FACE, FACE2), cours({})),
      P(tl - 0.15, glisse({ pos: [-0.25, 1.5, -3.5], cible: [-0.9, 1.32, -0.42], fov: 42 }, { pos: [-0.35, 1.5, -3.2], cible: [-0.95, 1.38, -0.42], fov: 42 }), cours({})),
      P(tm - 0.1, glisse({ pos: [-0.62, 1.58, -2.45], cible: [-0.97, 1.6, -0.42], fov: 36 }, { pos: [-0.66, 1.58, -2.25], cible: [-0.97, 1.6, -0.42], fov: 36 }), cours({})),
      P(te - 0.2, glisse(DOS, DOS2), cours({ pose: ["debout", "brasCroises", va(t, te, 0.6)] })),
    ], E("lundi"));
    for (let k = 0; k < 3; k++) { const a = sort(t, tm + 0.15 + k * 0.4, 0.25) * (1 - va(t, te - 0.3, 0.3)); if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = ROUGE; ctx.beginPath(); ctx.roundRect(690 + k * 70, 1010, 54, 16, 8); ctx.fill(); ctx.restore(); } }
    [[ts, 1230], [tl, 1305], [tm, 1380]].forEach(([a, y]) => coche(112, y, 30, va(t, a + 0.2, 0.3)));
  },
  texte(t) {
    const t0 = S("lundi"), td = mot("lundi", "discipline", 2) - 0.15;
    texte("LUNDI", CX, 370, 150, t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, td - 0.5, { alpha: 0.75 });
    texte("LA DISCIPLINE", CX, 582, 76, t, td - 0.3, { couleur: ROUGE });
    texte("SE TENIR DROIT", 160, 1230, 52, t, phrase("lundi", 2).start, { align: "left" });
    texte("SE LEVER POUR PARLER", 160, 1305, 52, t, phrase("lundi", 3).start, { align: "left" });
    texte("RÉPONDRE EN 3 MOTS", 160, 1380, 52, t, phrase("lundi", 4).start, { align: "left" });
  },
});

// ---------------------------------------------------------------- Tuesday: community, a name, a salute, slogans
scene("mardi", {
  dessin(t) {
    const tn = mot("mardi", "nom", 3.9) - 0.3, tsal = mot("mardi", "salut", 5.7) - 0.1, tslo = mot("mardi", "slogans", 8) - 0.1;
    const chante = va(t, tslo, 0.3) * (0.5 + 0.5 * Math.sin((t - tslo) * TAU * 2.2));
    const cours = t => miseClasse(t, {
      eleve: (i, s) => ({ salut: va(t, tsal + s.r * 0.13 + s.c * 0.05, 0.45), parle: chante * (i % 3 ? 1 : 0.7) }),
      profo: { x: 1.0, z: -4.75, ry: -0.75, pose: ["debout", "pointer", va(t, tn - 0.2, 0.6) * (1 - va(t, tsal - 0.3, 0.4))] }, craie: va(t, tn, 1.5),
    });
    filmer(t, [
      P(-1, glisse({ pos: [-0.2, 1.7, -0.4], cible: [0.4, 1.98, -5.3], fov: 52 }, { pos: [-0.1, 1.7, -0.9], cible: [0.4, 1.98, -5.3], fov: 52 }), cours),
      P(tsal - 0.3, glisse(FACE, FACE2), cours),
      P(tslo - 0.15, glisse({ pos: [-1.3, 1.25, -3.5], cible: [-0.9, 1.3, -1.42], fov: 48 }, { pos: [0.9, 1.25, -3.5], cible: [1.3, 1.3, -1.42], fov: 48 }), cours),
    ], E("mardi"));
  },
  texte(t) {
    const t0 = S("mardi"), tc = mot("mardi", "communauté", 2) - 0.15, tslo = mot("mardi", "slogans", 8) - 0.1;
    texte("MARDI", CX, 370, 150, t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, tc - 0.5, { alpha: 0.75 });
    texte("LA COMMUNAUTÉ", CX, 582, 72, t, tc - 0.3, { couleur: ROUGE });
    texte("LA TROISIÈME VAGUE", CX, 1345, ajuste("LA TROISIÈME VAGUE", 66), t, mot("mardi", "Troisième", 4.5) - 0.15, { fin: tslo - 0.2 });
    texte("TOUS ENSEMBLE", CX, 1290, 60, t, mot("mardi", "répétés", 8.6) - 0.1);
  },
});

// ---------------------------------------------------------------- Wednesday: cards, three informers… and twenty more
const VINGT = (() => { const r = rng(5), l = SIEGES.slice(0, 30).map(s => s.i).filter(i => !TROIS.includes(i)); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, 20); })();
const ENTREE = [[4.6, -3.9], [2.3, -3.9], [2.3, 7]];
function marcheur(i, t, ta) {   // through the door, then up the right-hand aisle
  const d = Math.max(0, 1.25 * (t - ta - 0.2 - i * 0.5)), l1 = ENTREE[0][0] - ENTREE[1][0];
  return d < l1 ? { x: ENTREE[0][0] - d, z: -3.9, ry: -Math.PI / 2, pose: "marche" } : { x: 2.3, z: -3.9 + (d - l1), ry: 0, pose: "marche" };
}
scene("mercredi", {
  dessin(t) {
    const tcar = mot("mercredi", "carte", 2.5) - 0.5, t3 = mot("mercredi", "Trois", 3.7) - 0.1, t20 = mot("mercredi", "vingtaine", 10.4) - 0.3, ta = mot("mercredi", "autres", 13.6) - 0.5;
    const cartes = (i, s) => va(t, tcar + s.r * 0.1 + s.c * 0.05, 0.4) * (1 - va(t, t3 - 0.4 + (TROIS.includes(i) ? 99 : 0), 0.4));
    const cours = (o = {}) => t => miseClasse(t, {
      eleve: (i, s) => ({ carte: Math.min(1, cartes(i, s)) * (1 - va(t, t20 - 0.4, 0.4)), regard: TROIS.includes(i) ? [0.8 * Math.sin((t - t3) * 1.1 + i), 0] : [0, 0], main: VINGT.includes(i) ? va(t, t20 + VINGT.indexOf(i) * 0.08, 0.4) * (1 - va(t, ta - 0.5, 0.4)) : 0 }),
      profo: { expr: ["doute", va(t, t20, 0.5)] }, craie: 1, ...o,
    });
    const tfin = ta + 1.75;
    filmer(t, [
      P(-1, glisse(FACE, FACE2), cours()),
      // the three: a slow push-in that lasts through the silence
      P(t3 - 0.2, glisse({ pos: [-0.35, 1.5, -3.9], cible: [0.5, 1.12, -0.6], fov: 40 }, { pos: [-0.2, 1.46, -3.3], cible: [0.5, 1.12, -0.6], fov: 40 }), cours()),
      P(t20 - 0.35, glisse(DOS, DOS2), cours()),
      P(ta - 0.3, glisse({ pos: [-1.6, 1.6, -2.3], cible: [2.5, 1.75, -4.0], fov: 46 }, { pos: [-1.4, 1.6, -2.1], cible: [2.5, 1.75, -4.0], fov: 46 }), cours({ porte: va(t, ta - 0.3, 0.6), arrives: i => (i < 6 ? marcheur(i, t, ta - 0.55) : { cache: true }) })),
      P(tfin, glisse({ pos: [0.3, 2.6, 8.6], cible: [0, 0.4, -4.5], fov: 54 }, { pos: [0.2, 2.5, 7.9], cible: [0, 0.4, -4.5], fov: 54 }), cours({ porte: 1, arrives: i => ARRIVEE[i] })),
    ], E("mercredi"));
  },
  texte(t) {
    const t0 = S("mercredi"), tm = phrase("mercredi", 1).start, t3 = mot("mercredi", "Trois", 3.7) - 0.1, t20 = mot("mercredi", "vingtaine", 10.4) - 0.3, ta = mot("mercredi", "autres", 13.6) - 0.5;
    texte("MERCREDI", CX, 370, ajuste("MERCREDI", 150), t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, tm - 0.4, { alpha: 0.75 });
    texte("L'ACTION", CX, 582, 76, t, tm - 0.2, { couleur: ROUGE });
    texte("3 CHARGÉS DE SIGNALER", CX, 1290, ajuste("3 CHARGÉS DE SIGNALER", 56), t, t3 + 0.3, { fin: t20 - 0.2 });
    texte("UNE VINGTAINE LE FONT", CX, 1250, ajuste("UNE VINGTAINE LE FONT", 58), t, t20 + 0.3, { couleur: ROUGE, fin: ta - 0.2 });
    texte("SANS QU'ON LE DEMANDE", CX, 1335, ajuste("SANS QU'ON LE DEMANDE", 52), t, mot("mercredi", "sans", 11.3) - 0.1, { fin: ta - 0.2 });
    const n = Math.round(lerp(30, 43, va(t, ta + 1.9, 1.0)));
    texte(`${n} ÉLÈVES`, CX, 1260, 76, t, ta + 1.8);
    texte("AU LIEU DE 30", CX, 1340, 48, t, ta + 2.2, { alpha: 0.65 });
  },
});

// ---------------------------------------------------------------- Thursday: it slips away; he announces a national leader
scene("jeudi", {
  dessin(t) {
    const t0 = S("jeudi"), ta = mot("jeudi", "annonce", 3.6) - 0.3, tv = mot("jeudi", "chef", 7) - 0.5;
    const cours = profo => t => miseClasse(t, { eleve: () => ({ salut: 1 }), arrives: i => ({ ...ARRIVEE[i] }), fond: 1, nuit: 0.45, craie: 1, tv: 1, porte: 1, profo });
    const peur = { expr: ["peur", va(t, t0 + 0.5, 0.6)], regard: [0.7 * Math.sin(t * 1.3), 0.1] };
    filmer(t, [
      // the room is full, to the back wall; he stands small in front of them
      P(-1, glisse({ pos: [0.2, 2.75, -5.2], cible: [0.1, 0.3, 1.2], fov: 58 }, { pos: [0.2, 2.6, -5.0], cible: [0.1, 0.3, 1.2], fov: 58 }), cours({ x: 0.3, z: -3.3, ...peur })),
      P(t0 + 1.5, glisse({ pos: [0.75, 1.62, -1.8], cible: [0.3, 1.82, -3.4], fov: 34 }, { pos: [0.65, 1.62, -2.05], cible: [0.3, 1.82, -3.4], fov: 34 }), cours({ x: 0.3, z: -3.3, ...peur })),
      P(ta - 0.2, glisse(DOS, DOS2), cours({ x: 0.3, z: -3.9, pose: ["debout", "pointer", va(t, ta, 0.6)] })),
      P(tv - 0.3, glisse({ pos: [0.9, 1.45, -1.7], cible: [1.22, 1.5, -4.4], fov: 46 }, { pos: [0.95, 1.45, -2.0], cible: [1.22, 1.5, -4.4], fov: 46 }), cours({ x: 0.85, z: -4.35, ry: 0.9, pose: ["debout", "pointer", 0.85] })),
    ], E("jeudi"));
  },
  texte(t) {
    const t0 = S("jeudi"), ta = mot("jeudi", "annonce", 3.6) - 0.3, tv = mot("jeudi", "chef", 7) - 0.5;
    texte("JEUDI", CX, 370, 150, t, t0 + 0.05);
    texte("LA FORCE PAR", CX, 500, 52, t, t0 + 0.5, { alpha: 0.75, fin: ta - 0.2 });
    texte("LA FIERTÉ", CX, 582, 76, t, t0 + 0.7, { couleur: ROUGE, fin: ta - 0.2 });
    texte("IL ANNONCE :", CX, 500, 52, t, ta + 0.15, { alpha: 0.75, fin: tv - 0.2 });
    texte("UN MOUVEMENT NATIONAL", CX, 582, ajuste("UN MOUVEMENT NATIONAL", 60), t, mot("jeudi", "mouvement", 5.7) - 0.3, { fin: tv - 0.2 });
    texte("LE CHEF PARLERA", CX, 500, ajuste("LE CHEF PARLERA", 60), t, tv + 0.1, { alpha: 0.85 });
    texte("DEMAIN, MIDI", CX, 590, ajuste("DEMAIN, MIDI", 88), t, mot("jeudi", "demain", 7.9) - 0.2, { couleur: ROUGE });
  },
});

// ---------------------------------------------------------------- Friday noon: the screen stays empty; then the film
scene("vendredi", {
  dessin(t) {
    const ton = mot("vendredi", "allume", 5) + 0.25, tsil = phrase("vendredi", 2).end, tr = EP.T.reveals[1], tj = mot("vendredi", "jamais", 12.4);
    const tfilm = mot("film", "film", 1.8) - 0.6, tcomme = mot("film", "Exactement", 6.9);
    const allume = va(t, ton, 0.9) * (1 - va(t, tj + 0.4, 1.6)), film = va(t, tfilm + 0.2, 1.2), defait = va(t, tj, 1.3) * (1 - va(t, tfilm - 0.2, 1.2));
    const rang = (o = {}) => t => miseSalle(t, {
      allume, film, desordre: defait,
      devant: i => ({ expr: t < tcomme ? ["choc", va(t, tr - 0.1 + (i % 4) * 0.08, 0.4)] : ["tristesse", 1], regard: [0, 0.25 * (1 - va(t, tcomme - 0.2, 0.6))], pose: ["debout", "teteBaissee", va(t, tcomme + (i % 5) * 0.1, 0.7)] }),
      profo: { x: 1.0, z: -8.25, ry: -1.1, pose: ["debout", "pointer", va(t, ton - 0.8, 0.5) * (1 - va(t, ton + 0.6, 0.6))], expr: ["tristesse", va(t, tr, 0.6)] }, ...o,
    });
    filmer(t, [
      P(-1, glisse({ pos: [0, 4.6, 10.4], cible: [0, 0.2, -8.3], fov: 50 }, { pos: [0, 4.2, 9.4], cible: [0, 0.2, -8.3], fov: 50 }), rang()),
      P(mot("vendredi", "professeur", 4.3) - 0.3, glisse({ pos: [-1.5, 2.0, -5.5], cible: [0.48, 2.2, -8.3], fov: 42 }, { pos: [-1.3, 2.0, -5.9], cible: [0.48, 2.2, -8.3], fov: 42 }), rang()),
      // the silence: their faces in the light of an empty screen
      P(tsil + 0.1, glisse({ pos: [0, 1.95, -7.6], cible: [0, 1.9, -3.5], fov: 52 }, { pos: [0, 1.9, -7.2], cible: [0, 1.9, -3.5], fov: 52 }), rang()),
      P(tr - 0.15, glisse({ pos: [0.5, 1.62, -6.9], cible: [-0.1, 1.7, -5.0], fov: 36 }, { pos: [0.3, 1.62, -6.7], cible: [-0.1, 1.7, -5.0], fov: 36 }), rang()),
      P(tj + 0.2, glisse({ pos: [0, 4.4, -9.6], cible: [0, -0.9, 0], fov: 58 }, { pos: [0, 5.0, -9.9], cible: [0, -0.9, 0], fov: 58 }), rang()),
      // the film: rows on the screen, and their heads in front of it
      P(tfilm, glisse({ pos: [0.2, 2.5, 3.6], cible: [0, 3.9, -10], fov: 46 }, { pos: [0.1, 2.5, 2.2], cible: [0, 3.9, -10], fov: 46 }), rang({ profo: null })),
      P(tcomme - 0.25, glisse({ pos: [0.2, 1.75, -7.5], cible: [0, 1.75, -4.6], fov: 44 }, { pos: [0.1, 1.72, -7.15], cible: [0, 1.75, -4.6], fov: 44 }), rang({ profo: null })),
    ], E("film"));
  },
  texte(t) {
    const t0 = S("vendredi"), trien = mot("vendredi", "Rien", 8), tr = EP.T.reveals[1], tj = mot("vendredi", "jamais", 12.4), tf = S("film");
    const tfilm = mot("film", "film", 1.8) - 0.6, tcomme = mot("film", "Exactement", 6.9), tsil = phrase("vendredi", 2).end;
    texte("VENDREDI", CX, 360, 120, t, t0 + 0.05, { fin: tsil - 0.1 });
    texte("12:00", CX, 460, 76, t, mot("vendredi", "midi", 0.8) - 0.2, { couleur: ROUGE, fin: tsil - 0.1 });
    texte("RIEN.", CX, 470, 170, t, trien - 0.05, { fin: tr - 0.4, duree: 0.3 });
    texte("IL N'Y A", CX, 400, 72, t, tr, { fin: tf + 0.1 });
    texte("PAS DE CHEF.", CX, 510, ajuste("PAS DE CHEF.", 104), t, tr + 0.15, { couleur: ROUGE, fin: tf + 0.1 });
    texte("PAS DE MOUVEMENT.", CX, 620, ajuste("PAS DE MOUVEMENT.", 64), t, tj - 0.1, { fin: tf + 0.1 });
    texte("ALLEMAGNE,", CX, 370, 76, t, mot("film", "Allemagne", 2.2) - 0.3, { fin: tcomme - 0.3 });
    texte("ANNÉES 30", CX, 458, 76, t, mot("film", "années", 3.1) - 0.2, { fin: tcomme - 0.3 });
    texte("COMME EUX,", CX, 400, 84, t, tcomme + 0.1, { couleur: ROUGE });
    texte("CETTE SEMAINE", CX, 500, ajuste("CETTE SEMAINE", 72), t, mot("film", "cette", 8.2) - 0.1);
  },
});

// ---------------------------------------------------------------- the lesson: the empty classroom
scene("lecon", {
  dessin(t) {
    filmer(t, [P(-1, glisse({ pos: [0.1, 1.7, 7.2], cible: [0, 0.9, -5.3], fov: 48 }, { pos: [0, 1.7, 3.4], cible: [0, 0.9, -5.3], fov: 48 }), t => miseClasse(t, { vide: true, profo: { cache: true }, nuit: 0.55, craie: 1 }))], E("lecon") + 0.4);
  },
  texte(t) {
    const tp = mot("lecon", "Personne", 0.8) - 0.2;
    texte("LA LEÇON ?", CX, 290, 60, t, S("lecon") + 0.05, { alpha: 0.75 });
    texte("PERSONNE", CX, 420, 140, t, tp);
    texte("N'EST À L'ABRI.", CX, 545, ajuste("N'EST À L'ABRI.", 84), t, tp + 0.3);
    texte("UN GROUPE", CX, 1200, 68, t, mot("lecon", "groupe", 3.3) - 0.2);
    texte("UN CHEF", CX, 1285, 68, t, mot("lecon", "chef", 4) - 0.2);
    texte("L'ENVIE D'EN FAIRE PARTIE", CX, 1370, ajuste("L'ENVIE D'EN FAIRE PARTIE", 60), t, mot("lecon", "envie", 4.5) - 0.2, { couleur: ROUGE });
  },
});

// ---------------------------------------------------------------- where the story comes from: the teacher, alone
scene("nuance", {
  dessin(t) {
    filmer(t, [P(-1, glisse({ pos: [0.6, 1.7, -1.5], cible: [-1.6, 1.78, -3.6], fov: 42 }, { pos: [0.3, 1.68, -1.9], cible: [-1.6, 1.78, -3.6], fov: 42 }),
      t => miseClasse(t, { vide: true, nuit: 0.5, craie: 1, profo: { x: -1.6, z: -3.6, ry: 0.75, pose: "noter" } }))], E("nuance") + 0.4);
    coche(118, 1330, 34, va(t, mot("nuance", "anciens", 4.8) - 0.1, 0.4), { trait: 10 });
  },
  texte(t) {
    const t1 = mot("nuance", "professeur", 1.5) - 0.5, t2 = mot("nuance", "détails", 3.2) - 0.3, t3 = mot("nuance", "anciens", 4.8) - 0.3;
    texte("D'OÙ VIENT CE RÉCIT ?", CX, 330, ajuste("D'OÙ VIENT CE RÉCIT ?", 64), t, S("nuance") + 0.05);
    texte("SON PROPRE RÉCIT", CX, 460, 64, t, t1);
    texte("ÉCRIT EN 1976", CX, 535, 48, t, t1 + 0.25, { alpha: 0.65 });
    texte("DES DÉTAILS DISCUTÉS", CX, 1210, ajuste("DES DÉTAILS DISCUTÉS", 58), t, t2, { fin: t3 - 0.2 });
    texte("CONFIRMÉ PAR", 170, 1300, 56, t, t3, { align: "left" });
    texte("D'ANCIENS ÉLÈVES", 170, 1370, 56, t, t3 + 0.15, { align: "left" });
    texte("DOCUMENTAIRE, 2010", 170, 1440, 48, t, mot("nuance", "confirmé", 6.3), { align: "left", alpha: 0.65 });
  },
});

// ---------------------------------------------------------------- and you? the one who says no
scene("cta", {
  dessin(t) {
    const tn = mot("cta", "non", 2.1) - 0.45, td = mot("cta", "Dis-le", 2.5) - 0.2, non = va(t, tn, 0.8);
    filmer(t, [P(-1, glisse(FACE, { pos: [-0.5, 2.3, -2.6], cible: [-0.8, 0.95, 1.5], fov: 50 }),
      t => miseClasse(t, { eleve: () => ({ salut: 1 }), refus: { salut: 1 - non, leve: non, expr: ["colere", 0.5 * non] }, craie: 1, profo: { cache: true } }))], E("cta"));
    const p = va(t, td, 0.6);
    if (p > 0) { ctx.save(); ctx.globalAlpha = p; ctx.fillStyle = BLANC; ctx.beginPath(); ctx.roundRect(CX - 400, 1350 + (1 - p) * 20, 800, 100, 50); ctx.fill(); ctx.restore(); }
  },
  texte(t) {
    const t0 = S("cta"), td = mot("cta", "Dis-le", 2.5) - 0.2;
    texte("ET TOI ?", CX, 380, 150, t, t0 + 0.05);
    texte("TU AURAIS SUIVI ?", CX, 530, ajuste("TU AURAIS SUIVI ?", 72), t, mot("cta", "suivi", 1) - 0.5);
    texte("OU DIT NON ?", CX, 630, ajuste("OU DIT NON ?", 84), t, mot("cta", "ou", 1.4) - 0.1, { couleur: ROUGE });
    texte("DIS-LE EN COMMENTAIRE", CX, 1404, 52, t, td + 0.1, { couleur: NOIR, contour: false, monte: 20 });
  },
});

// ---------------------------------------------------------------- sound: the heart, faster every day, and the silences (as in v13)
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
  flou: 3,
  mentions: Object.fromEntries(["hook", "question", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "film", "lecon", "nuance", "cta"].map(id => [id, JOURS[id] && id !== "film" ? "RECONSTITUTION" : "ILLUSTRATION"])),
  sources: { titre: "SOURCES", duree: 5.5, lignes: ["Ron Jones, « The Third Wave », 1976.", "Documentaire « Lesson Plan », 2010.", "Wikipédia, « La Troisième Vague ».", "Voix de synthèse, images d'illustration."] },
  musique: () => ({ style: "dark", root: 36 }),
  battements, coeur: 1.5,
  silences: () => [[phrase("mercredi", 2).end + 0.05, phrase("mercredi", 3).start - 0.05, 0.6], [phrase("vendredi", 2).end + 0.05, phrase("vendredi", 5).end + 0.1, 2.5]],
  sons() { EP.ORDRE.forEach((id, i) => { if (i && decorDe(id) !== decorDe(EP.ORDRE[i - 1])) sfx(S(id) - 0.25, "swish", { gain: 0.14 }); }); },
  voix: { bed: 0.19, duck: 0.65 },
});
