// « Le nuage qui s'est arrêté à la frontière » — Chernobyl seen from a village in the east of France, 1986.
// Same montage as v14 (lib/epure.js + the PS2 characters of lib/ps2.js in low-poly sets, vector text, export
// settings), dressed as 1986: scan lines of a cathode-ray set, weather maps, teleprinters, a log-book date at the
// top. Palette: black, washed grey-green, off-white; ONE accent, the radioactive yellow-green, kept for the cloud
// (the particles on the maps and in the sky, the traces of the rain) and the key words of the subtitles.
// The family (father, mother, the child of ten), the Swedish technicians, the German neighbour and the woman in court
// are invented. Real people (the weather presenter, the head of radiation protection) are faceless silhouettes on a
// TV screen and never speak. The cloud is always somewhere on screen: full map, TV, sky, or the radar inset.
import * as THREE from "three";
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidamPS2, creerFoulePS2, qualitePS2, texturePS2, eleve1967, PEINTURES } from "../lib/ps2.js";
import { ACC, vue, fondCarte, dessinerNuage, horsFrance, panneauStop, LIEUX, TACHES, FRANCE, CORSE } from "./carte.js";

const TAU = Math.PI * 2;
const GRIS = "#9AA59A", VERT = "#3A453E";
qualitePS2(3);
const st = creerStudio({ antialias: true });
st.sol.visible = false; st.gl.shadowMap.enabled = false; st.key.castShadow = false;
st.scene.fog = new THREE.Fog("#050506", 9, 30);
const lam = o => new THREE.MeshLambertMaterial(o);
const FILTRE = "saturate(0.5) sepia(0.12) contrast(1.08)";

// ---------------------------------------------------------------- painted textures
function peint(w, h, f, rx = 1, ry = 1) { const t = texturePS2(w, h, f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
function grainDe(x, w, h, a, graine, n = 500) { const r = rng(graine); for (let i = 0; i < n; i++) { const v = r(); x.fillStyle = v > 0.5 ? `rgba(255,255,255,${a * v})` : `rgba(0,0,0,${a * 1.6 * (1 - v)})`; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 2); } }
const papierPeint = (fond, raie) => (x, w, h) => { x.fillStyle = fond; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = raie; x.fillRect(i * w / 8 + 2, 0, 3, h); x.fillRect(i * w / 8 + 9, 0, 1, h); } x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(0, h * 0.8, w, h * 0.2); grainDe(x, w, h, 0.05, 5, 600); };
const parquet = (x, w, h) => { x.fillStyle = "#5A5044"; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#4E463C" : "#625749"; x.fillRect(0, i * h / 8, w, h / 8 - 1); x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(((i * 37) % 64) / 64 * w, i * h / 8, 2, h / 8); } grainDe(x, w, h, 0.07, 9, 500); };
const beton = (x, w, h) => { x.fillStyle = "#6E726C"; x.fillRect(0, 0, w, h); grainDe(x, w, h, 0.09, 3, 900); x.strokeStyle = "rgba(0,0,0,.25)"; x.strokeRect(0.5, 0.5, w - 1, h - 1); };
const crepi = c => (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); grainDe(x, w, h, 0.08, 13, 900); };
const boisSombre = (x, w, h) => { x.fillStyle = "#4A3C30"; x.fillRect(0, 0, w, h); for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(0,0,0,${0.06 + 0.1 * ((i * 7) % 4) / 4})`; x.fillRect(i * w / 10, 0, 2, h); } x.strokeStyle = "rgba(255,255,255,.06)"; x.strokeRect(4, 4, w - 8, h - 8); grainDe(x, w, h, 0.07, 21, 400); };
const tuiles = (x, w, h) => { x.fillStyle = "#4A4440"; x.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) { x.fillStyle = "rgba(0,0,0,.3)"; x.fillRect(0, j * h / 8, w, 2); for (let i = 0; i < 8; i++) x.fillRect(i * w / 8 + (j % 2) * w / 16, j * h / 8, 2, h / 8); } grainDe(x, w, h, 0.06, 4, 400); };

const boite = (g, m, w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
const plan = (g, m, w, h, x, y, z, ry = 0, rx = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); g.add(p); return p; };
const cylindre = (g, m, r1, r2, h, x, y, z, n = 12) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), m); c.position.set(x, y, z); g.add(c); return c; };
function piece(g, x0, x1, z0, z1, h, mur, sol, plafond = "#1A1C1B") {
  const lx = x1 - x0, lz = z1 - z0, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  plan(g, lam({ map: peint(64, 64, sol, lx / 1.5, lz / 1.5) }), lx, lz, xc, 0, zc, 0, -Math.PI / 2);
  const m = (w, x, z, ry) => plan(g, lam({ map: peint(64, 128, mur, w / 1.4, 1) }), w, h, x, h / 2, z, ry);
  m(lx, xc, z0, 0); m(lx, xc, z1, Math.PI); m(lz, x0, zc, Math.PI / 2); m(lz, x1, zc, -Math.PI / 2);
  plan(g, lam({ color: plafond }), lx, lz, xc, h, zc, 0, Math.PI / 2);
}
/** A cathode-ray television of the 1980s, its screen drawn from a canvas. */
function televiseur(g, x, y, z, ry = 0, ecranCanvas) {
  const tv = new THREE.Group(); tv.position.set(x, y, z); tv.rotation.y = ry; g.add(tv);
  const caisse = lam({ color: "#2E302D" }), facade = lam({ color: "#3B3E3A" });
  boite(tv, caisse, 0.78, 0.6, 0.55, 0, 0.3, -0.05);
  boite(tv, facade, 0.8, 0.62, 0.04, 0, 0.3, 0.24);
  boite(tv, lam({ color: "#1C1D1C" }), 0.12, 0.4, 0.01, 0.31, 0.3, 0.262);
  for (let i = 0; i < 3; i++) cylindre(tv, lam({ color: "#8A8E86" }), 0.018, 0.018, 0.02, 0.31, 0.42 - i * 0.07, 0.27, 8).rotation.x = Math.PI / 2;
  const tex = new THREE.CanvasTexture(ecranCanvas); tex.colorSpace = THREE.SRGBColorSpace;
  const ecran = lam({ color: "#0C0E0D", emissive: "#FFFFFF", emissiveMap: tex, emissiveIntensity: 0 });
  const e = plan(tv, ecran, 0.56, 0.42, -0.06, 0.31, 0.262);
  const feu = new THREE.PointLight("#C9D2C6", 0, 0, 1.5); feu.position.set(-0.06, 0.4, 1.0); tv.add(feu);
  return { tv, ecran, tex, feu, monde: () => e.getWorldPosition(new THREE.Vector3()) };
}

// ---------------------------------------------------------------- the house, 1986: living room with the dining table
const maison = new THREE.Group(); st.plateau.add(maison);
const tvCanvas = Object.assign(document.createElement("canvas"), { width: 1600, height: 1200 }), tvc = tvCanvas.getContext("2d");
let fenetreSalon;
{
  piece(maison, -3.2, 3.2, -3, 5.6, 2.55, papierPeint("#7E8676", "#6E7668"), parquet);
  const tissu = lam({ map: peint(64, 64, crepi("#5E6658")) }), bois = lam({ map: peint(64, 64, boisSombre) });
  boite(maison, bois, 1.3, 0.56, 0.5, 0, 0.28, -2.65);                              // TV cabinet
  boite(maison, tissu, 2.3, 0.36, 0.9, 0, 0.18, 1.55); boite(maison, tissu, 2.2, 0.12, 0.78, 0, 0.42, 1.5);   // sofa seat
  boite(maison, tissu, 2.3, 0.55, 0.22, 0, 0.6, 2.0); boite(maison, tissu, 0.2, 0.62, 0.9, -1.25, 0.31, 1.55); boite(maison, tissu, 0.2, 0.62, 0.9, 1.25, 0.31, 1.55);
  boite(maison, bois, 1.0, 0.06, 0.55, 0, 0.4, 0.35); for (const sx of [-0.45, 0.45]) for (const sz of [0.12, 0.58]) boite(maison, bois, 0.05, 0.38, 0.05, sx, 0.19, sz);
  // the lamp, a clock, frames
  boite(maison, bois, 0.45, 0.55, 0.45, 1.75, 0.27, 1.9); cylindre(maison, lam({ color: "#3A3C38" }), 0.02, 0.02, 0.45, 1.75, 0.78, 1.9);
  cylindre(maison, lam({ color: "#BDBCA8", emissive: "#E8E2C8", emissiveIntensity: 0.6 }), 0.13, 0.2, 0.24, 1.75, 1.08, 1.9);
  cylindre(maison, lam({ color: "#D8D6CA" }), 0.17, 0.17, 0.03, 0, 2.0, -2.97, 20).rotation.x = Math.PI / 2;
  for (const [x, w, h] of [[-1.8, 0.5, 0.65], [1.7, 0.7, 0.5]]) { boite(maison, bois, w, h, 0.03, x, 1.65, -2.97); boite(maison, lam({ color: "#8E9488" }), w - 0.1, h - 0.1, 0.01, x, 1.65, -2.95); }
  // window on the left wall, with curtains
  fenetreSalon = lam({ color: "#0A0C0E", emissive: "#202A30", emissiveIntensity: 1 });
  plan(maison, fenetreSalon, 1.3, 1.3, -3.18, 1.45, 0.4, Math.PI / 2);
  boite(maison, bois, 0.06, 1.4, 0.06, -3.15, 1.45, 0.4); boite(maison, bois, 0.06, 0.06, 1.4, -3.15, 1.45, 0.4);
  for (const z of [-0.45, 1.25]) boite(maison, lam({ color: "#6A6F60" }), 0.08, 1.9, 0.45, -3.1, 1.4, z);
  // the dining table at the back of the room
  boite(maison, bois, 1.7, 0.05, 0.95, 0, 0.74, 4.4); for (const sx of [-0.78, 0.78]) for (const sz of [4.0, 4.8]) boite(maison, bois, 0.06, 0.72, 0.06, sx, 0.36, sz);
  for (const [x, z] of [[-0.45, 4.98], [0.45, 4.98], [0, 4.98]]) { boite(maison, bois, 0.42, 0.04, 0.42, x, 0.46, z); boite(maison, bois, 0.42, 0.5, 0.04, x, 0.72, z + 0.2); }
  boite(maison, lam({ color: "#D9D6CC" }), 1.2, 0.01, 0.7, 0, 0.77, 4.4);      // tablecloth
}
const tvSalon = televiseur(maison, 0, 0.56, -2.62, 0, tvCanvas);
const lampe = new THREE.PointLight("#E8DDBE", 0, 0, 1.6); lampe.position.set(1.75, 1.15, 1.6); maison.add(lampe);
const verre = cylindre(maison, lam({ color: "#E8E6DE", emissive: "#2A2A28" }), 0.035, 0.03, 0.12, 0, 0.83, 4.5);
const saladier = cylindre(maison, lam({ color: "#6E7A5A" }), 0.16, 0.09, 0.09, 0.45, 0.82, 4.3);

// ---------------------------------------------------------------- the child's bedroom
const chambre = new THREE.Group(); st.plateau.add(chambre);
let fenetreNuit;
{
  piece(chambre, -2.2, 2.2, -2.2, 2.4, 2.45, papierPeint("#6E7868", "#5E6858"), parquet);
  const bois = lam({ map: peint(64, 64, boisSombre) });
  boite(chambre, bois, 1.05, 0.38, 2.1, -1.4, 0.19, -0.1); boite(chambre, bois, 1.05, 0.75, 0.08, -1.4, 0.38, -1.15);
  boite(chambre, lam({ color: "#C8C6BA" }), 0.95, 0.1, 2.0, -1.4, 0.43, -0.1);                 // mattress
  boite(chambre, lam({ color: "#E2DFD4" }), 0.55, 0.1, 0.32, -1.4, 0.53, -0.9);                // pillow
  boite(chambre, lam({ map: peint(64, 64, crepi("#7A8670")) }), 1.0, 0.14, 1.3, -1.4, 0.6, 0.38); // blanket
  boite(chambre, bois, 0.9, 0.05, 0.5, 1.4, 0.72, -1.9); boite(chambre, bois, 0.4, 0.4, 0.4, 0.6, 0.2, -1.9);
  boite(chambre, lam({ color: "#9AA090" }), 0.55, 0.75, 0.01, 1.4, 1.6, -2.18);                // a poster
  fenetreNuit = lam({ color: "#0A0C0E", emissive: "#1E2A34", emissiveIntensity: 1 });
  plan(chambre, fenetreNuit, 1.0, 1.15, 0.1, 1.5, -2.18);
  boite(chambre, bois, 1.08, 0.06, 0.06, 0.1, 1.5, -2.16); boite(chambre, bois, 0.06, 1.2, 0.06, 0.1, 1.5, -2.16);
}
const veilleuse = new THREE.PointLight("#9FB0C0", 0, 0, 1.4); veilleuse.position.set(0.1, 1.6, -1.2); chambre.add(veilleuse);

// ---------------------------------------------------------------- the village street (east of France; the same street plays the German side)
const rue = new THREE.Group(); st.plateau.add(rue);
const fenetresRue = [];
const portes = [];
{
  plan(rue, lam({ map: peint(64, 64, beton, 3, 30) }), 6, 80, 0, 0, -20, 0, -Math.PI / 2);
  for (const s of [-1, 1]) plan(rue, lam({ map: peint(64, 64, crepi("#7E827A"), 1, 30) }), 1.6, 80, s * 3.8, 0.01, -20, 0, -Math.PI / 2);
  plan(rue, lam({ map: peint(64, 64, crepi("#46523E"), 10, 30) }), 40, 80, 0, -0.01, -20, 0, -Math.PI / 2);
  const toit = lam({ map: peint(64, 64, tuiles, 2, 2) });
  const triangle = new THREE.Shape([new THREE.Vector2(-3.4, 0), new THREE.Vector2(3.4, 0), new THREE.Vector2(0, 2.3)]);
  const prisme = new THREE.ExtrudeGeometry(triangle, { depth: 7.2, bevelEnabled: false });
  const coul = ["#8E9284", "#9A988A", "#7E8678", "#A29E90", "#868C80"];
  let k = 0;
  for (const s of [-1, 1]) for (let z = 12; z > -44; z -= 8.5) {
    const xc = s * 8, murs = lam({ map: peint(64, 64, crepi(coul[k++ % coul.length]), 3, 2) });
    boite(rue, murs, 6, 5, 7, xc, 2.5, z);
    const r = new THREE.Mesh(prisme, toit); r.position.set(xc, 5, z - 3.6); rue.add(r);
    const fx = xc - s * 3.02, ry = -s * Math.PI / 2;
    const porte = plan(rue, lam({ color: "#2A2622", emissive: "#E2D6B4", emissiveIntensity: 0 }), 1.0, 2.1, fx, 1.05, z + 1.6, ry);
    portes.push({ s, z: z + 1.6, x: fx, porte });
    for (const [dz, y] of [[-1.6, 1.5], [-1.6, 3.6], [1.6, 3.6]]) {
      const f = lam({ color: "#14181A", emissive: "#D8CCA8", emissiveIntensity: 0 });
      plan(rue, f, 1.1, 1.0, fx, y, z + dz, ry); fenetresRue.push(f);
      boite(rue, lam({ color: "#3A3C38" }), 0.08, 1.15, 1.25, fx + s * 0.02, y, z + dz);
    }
  }
}
// the muguet stand at the corner and the milk bottles on the German doorsteps
const stand = new THREE.Group(); rue.add(stand); stand.position.set(-3.3, 0, 3.2);
{
  const bois = lam({ map: peint(64, 64, boisSombre) });
  boite(stand, bois, 0.9, 0.05, 0.5, 0, 0.72, 0); for (const sx of [-0.4, 0.4]) boite(stand, bois, 0.05, 0.72, 0.45, sx, 0.36, 0);
  for (let i = 0; i < 5; i++) { cylindre(stand, lam({ color: "#4E5A44" }), 0.06, 0.05, 0.1, -0.3 + i * 0.15, 0.8, 0, 8); for (let b = 0; b < 4; b++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), lam({ color: "#F2F0E6", emissive: "#3A3A36" })); s.position.set(-0.3 + i * 0.15 + (b - 1.5) * 0.02, 0.9 + b * 0.03, 0.01); stand.add(s); } }
}
const bouteilles = new THREE.Group(); rue.add(bouteilles);
for (const p of portes) for (let i = 0; i < 2; i++) cylindre(bouteilles, lam({ color: "#E6E4DA", emissive: "#2A2A28" }), 0.04, 0.045, 0.26, p.x - p.s * 0.3, 0.13, p.z + 0.65 + i * 0.12, 8);

// ---------------------------------------------------------------- the Swedish power station: the hall with the radiation portal
const centrale = new THREE.Group(); st.plateau.add(centrale);
let alarme, feuAlarme;
{
  piece(centrale, -8, 8, -12, 7, 8, crepi("#7C8278"), beton, "#2A2C2A");
  const metal = lam({ color: "#5E625C" }), clair = lam({ color: "#9A9E96" });
  for (const y of [3.2, 4.0, 4.8]) { const c = cylindre(centrale, metal, 0.28, 0.28, 16, 0, y, -11.4, 14); c.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 9; i++) boite(centrale, lam({ color: i % 2 ? "#6A7068" : "#626860" }), 0.55, 1.9, 0.5, -7.6, 0.95, -6 + i * 0.6);
  boite(centrale, metal, 0.28, 2.3, 0.45, -0.62, 1.15, 0); boite(centrale, metal, 0.28, 2.3, 0.45, 0.62, 1.15, 0); boite(centrale, clair, 1.52, 0.32, 0.5, 0, 2.45, 0);
  boite(centrale, lam({ color: "#2A2E2A", emissive: "#6A8A70", emissiveIntensity: 0.4 }), 0.18, 0.5, 0.02, -0.62, 1.4, 0.24);
  alarme = lam({ color: "#3A1612", emissive: "#E0422E", emissiveIntensity: 0 });
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), alarme); a.position.set(0, 2.72, 0); centrale.add(a);
  feuAlarme = new THREE.PointLight("#E05A40", 0, 0, 1.4); feuAlarme.position.set(0, 2.6, 0.6); centrale.add(feuAlarme);
  // the control desk with its screens
  boite(centrale, lam({ color: "#4A4E48" }), 2.2, 0.85, 0.8, 3.0, 0.43, -2.4); boite(centrale, lam({ color: "#3A3E38" }), 2.2, 0.6, 0.12, 3.0, 1.15, -2.75);
  for (let i = 0; i < 3; i++) boite(centrale, lam({ color: "#0E1210", emissive: "#7A9A80", emissiveIntensity: 0.45 }), 0.5, 0.36, 0.02, 2.3 + i * 0.7, 1.17, -2.68);
  for (const x of [-5, 0, 5]) boite(centrale, lam({ color: "#111", emissive: "#E8E6DA", emissiveIntensity: 0.6 }), 2.4, 0.08, 0.3, x, 7.9, -3);
}

// ---------------------------------------------------------------- the office of the teleprinters
const bureau = new THREE.Group(); st.plateau.add(bureau);
const papierCanvas = Object.assign(document.createElement("canvas"), { width: 256, height: 512 });
const papierTex = new THREE.CanvasTexture(papierCanvas); papierTex.colorSpace = THREE.SRGBColorSpace;
let papier3d;
{
  piece(bureau, -3, 3, -3, 3, 2.9, papierPeint("#6E766A", "#646C60"), parquet);
  const bois = lam({ map: peint(64, 64, boisSombre) });
  boite(bureau, bois, 1.6, 0.06, 0.8, 0, 0.75, -1.6); for (const sx of [-0.75, 0.75]) boite(bureau, bois, 0.06, 0.72, 0.75, sx, 0.36, -1.6);
  boite(bureau, lam({ color: "#5A5E58" }), 0.62, 0.28, 0.5, -0.2, 0.92, -1.65); boite(bureau, lam({ color: "#3A3E3A" }), 0.5, 0.06, 0.2, -0.2, 1.09, -1.72);
  for (let i = 0; i < 3; i++) boite(bureau, lam({ color: "#6A6E66" }), 0.6, 1.3, 0.6, -2.6, 0.65, -2.0 + i * 0.7);
  plan(bureau, lam({ color: "#0A0C0E", emissive: "#1C252C", emissiveIntensity: 1 }), 1.4, 1.2, 1.2, 1.6, -2.98);
  for (let i = 0; i < 9; i++) boite(bureau, lam({ color: "#4A4E48" }), 1.45, 0.03, 0.03, 1.2, 1.1 + i * 0.12, -2.95);
  cylindre(bureau, lam({ color: "#3A3C38" }), 0.02, 0.02, 0.4, 0.55, 0.98, -1.75); cylindre(bureau, lam({ color: "#5E6658", emissive: "#E8E0C0", emissiveIntensity: 0.7 }), 0.06, 0.14, 0.14, 0.55, 1.2, -1.75);
  papier3d = plan(bureau, lam({ color: "#D8D4C8", map: papierTex, emissive: "#FFFFFF", emissiveMap: papierTex, emissiveIntensity: 0.25, side: THREE.DoubleSide }), 0.36, 0.7, -0.2, 1.4, -1.82, 0, -0.18);
}
const lampeBureau = new THREE.PointLight("#E6DCB8", 0, 0, 1.6); lampeBureau.position.set(0.5, 1.15, -1.4); bureau.add(lampeBureau);

// ---------------------------------------------------------------- the courtroom
const tribunal = new THREE.Group(); st.plateau.add(tribunal);
const maillet = new THREE.Group();
{
  piece(tribunal, -6, 6, -8, 8, 6, boisSombre, parquet, "#1E1A16");
  const bois = lam({ map: peint(64, 64, boisSombre) });
  boite(tribunal, bois, 12, 0.45, 2.6, 0, 0.22, -6.7);                       // the platform
  boite(tribunal, bois, 6.5, 1.15, 0.5, 0, 1.0, -5.65);                      // the bench
  for (let i = 0; i < 3; i++) boite(tribunal, lam({ color: "#2A2420" }), 0.7, 1.5, 0.12, -1.6 + i * 1.6, 1.2, -7.3);   // tall chairs
  for (let r = 0; r < 5; r++) { boite(tribunal, bois, 7, 0.08, 0.45, 0, 0.45, -0.6 + r * 1.4); boite(tribunal, bois, 7, 0.5, 0.06, 0, 0.7, -0.38 + r * 1.4); }
  for (let i = 0; i < 4; i++) plan(tribunal, lam({ color: "#0A0C0E", emissive: "#B8C0B4", emissiveIntensity: 0.55 }), 1.2, 2.8, -5.98, 3.2, -4 + i * 3.2, Math.PI / 2);
  maillet.position.set(0.25, 1.6, -5.6); tribunal.add(maillet);
  const m = lam({ color: "#3A2C22" });
  const manche = cylindre(maillet, m, 0.015, 0.015, 0.28, 0.14, 0, 0, 8); manche.rotation.z = Math.PI / 2;
  const tete = cylindre(maillet, m, 0.04, 0.04, 0.14, 0, 0, 0, 10); tete.rotation.x = Math.PI / 2;
  boite(tribunal, m, 0.16, 0.03, 0.16, 0.25, 1.59, -5.6);
}
const PUBLIC = Array.from({ length: 34 }, (_, i) => ({ x: -3 + (i % 9) * 0.75 + (Math.floor(i / 9) % 2) * 0.2, z: -0.25 + 1.4 * (1 + Math.floor(i / 9)), ry: Math.PI }));
const publicFoule = creerFoulePS2(PUBLIC, { graine: 4 }); tribunal.add(publicFoule.groupe);

// ---------------------------------------------------------------- the cast (all invented)
const acteurs = new THREE.Group(); st.plateau.add(acteurs);
function acteur(graine, design, taille = 1, role = "foule") { const q = creerQuidamPS2({ role, graine, design, taille }); acteurs.add(q.objet); return q; }
const famille = (cheveux = {}) => ({
  pere: { peau: "#E3B994", iris: "#4A3A2A", cheveux: cheveux.pere || "#3A2A1E", coiffure: "court", levres: "#A0705A", haut: PEINTURES.chemise({ couleur: "#7C8672", poches: true }), hautCouleur: "#7C8672", manche: { couleur: "#7C8672" }, bas: PEINTURES.jean({ couleur: "#3E4A58" }), basCouleur: "#3E4A58", chaussure: { couleur: "#3A2E24", semelle: "#1E1812", lacets: "#1E1812" } },
  mere: { peau: "#EBC6A6", iris: "#3E5A4A", cheveux: cheveux.mere || "#4A2E1E", coiffure: "carre", levres: "#A8605A", haut: PEINTURES.tricot({ couleurs: ["#9AA08E", "#7E8676", "#B5B8A8"], bord: "#5E6658" }), hautCouleur: "#9AA08E", manche: { couleur: "#9AA08E" }, bas: PEINTURES.uni({ couleur: "#3A3C38" }), basCouleur: "#3A3C38", chaussure: { couleur: "#2A2A2A" } },
});
const F = famille(), V = famille({ pere: "#B9B5AD", mere: "#CFCAC0" });
const pere = acteur(11, F.pere, 1.03), mere = acteur(12, F.mere, 0.97);
const vieuxPere = acteur(11, { ...V.pere, lunettes: true }, 1.0), vieilleMere = acteur(12, V.mere, 0.95);
const enfant = acteur(13, { peau: "#F0CDB0", iris: "#4A6A8A", cheveux: "#7A5634", coiffure: "court", levres: "#C08070", haut: PEINTURES.sweat({ couleur: "#8E9A86", zip: false, cordons: "#DADCD0" }), hautCouleur: "#8E9A86", manche: { couleur: "#8E9A86" }, bas: PEINTURES.jean({ couleur: "#4A5A70" }), basCouleur: "#4A5A70", chaussure: { couleur: "#DADAD2", semelle: "#5A5A5A" } }, 0.7);
const blouse = (cheveux, lunettes) => ({ peau: "#F2D2B8", iris: "#4A6A8A", cheveux, coiffure: "court", levres: "#B07060", lunettes, blouse: true, haut: PEINTURES.blouse({ chemise: "#7A8A86", cravate: "#3A4440" }), hautCouleur: "#EDEDE8", manche: { couleur: "#EDEDE8" }, bas: PEINTURES.uni({ couleur: "#3E434C" }), basCouleur: "#3E434C", chaussure: { couleur: "#D8D8D0", semelle: "#8A8A84", lacets: "#8A8A84" } });
const tech1 = acteur(21, blouse("#C2A878", false), 1.02, "chercheur"), tech2 = acteur(22, blouse("#4A3A2E", true), 0.98, "chercheur");
const ouvrier = acteur(23, { peau: "#EACBB0", iris: "#3E5A4A", cheveux: "#8A7458", coiffure: "ras", levres: "#A07060", haut: PEINTURES.chemise({ couleur: "#8A9488", poches: true }), hautCouleur: "#8A9488", manche: { couleur: "#8A9488" }, bas: PEINTURES.uni({ couleur: "#4A5048" }), basCouleur: "#4A5048", chaussure: { couleur: "#2A2A28" } }, 1.0);
const voisine = acteur(31, { peau: "#EFCDB0", iris: "#4A6A8A", cheveux: "#A88A5A", coiffure: "queue", levres: "#B06A60", haut: PEINTURES.chemise({ couleur: "#B5B3A6", poches: false }), hautCouleur: "#B5B3A6", manche: { couleur: "#B5B3A6" }, bas: PEINTURES.uni({ couleur: "#4A4C46" }), basCouleur: "#4A4C46", jupe: true, mollet: PEINTURES.jambe({ peau: "#EFCDB0" }), chaussure: { couleur: "#2A2622" } }, 0.98);
const gamins = [0, 1, 2, 3].map(i => acteur(40 + i, eleve1967(40 + i), 0.66 + 0.04 * (i % 2)));
const petitsVoisins = [0, 1].map(i => acteur(50 + i, eleve1967(50 + i), 0.64 + 0.05 * i));
const malade = acteur(61, { peau: "#EAC4A4", iris: "#3E5A4A", cheveux: "#3A2618", coiffure: "meches", levres: "#A8605A", haut: PEINTURES.tricot({ couleurs: ["#7E8676", "#9AA08E", "#6A7266"], bord: "#4E564A" }), hautCouleur: "#7E8676", manche: { couleur: "#7E8676" }, bas: PEINTURES.jean({ couleur: "#3E4A58" }), basCouleur: "#3E4A58", chaussure: { couleur: "#2A2622" } }, 0.97);
const robe = c => ({ peau: "#D8B496", iris: "#2A2A2A", cheveux: c, coiffure: "ras", levres: "#8A5A4A", haut: PEINTURES.uni({ couleur: "#141416" }), hautCouleur: "#141416", manche: { couleur: "#141416" }, bas: PEINTURES.uni({ couleur: "#141416" }), basCouleur: "#141416", chaussure: { couleur: "#0E0E10" } });
const juges = [0, 1, 2].map(i => acteur(70 + i, robe(["#8A8A88", "#2A2A2E", "#5A4A3A"][i]), 1.0));
const assisTribunal = Array.from({ length: 7 }, (_, i) => acteur(80 + i, eleve1967(80 + i), 1.0));
const TOUS = [pere, mere, vieuxPere, vieilleMere, enfant, tech1, tech2, ouvrier, voisine, ...gamins, ...petitsVoisins, malade, ...juges, ...assisTribunal];
// a sprig of muguet in the child's right hand
const brin = new THREE.Group(); enfant.articulations.mainD.add(brin); brin.position.set(0, -0.06, 0.03);
{ cylindre(brin, lam({ color: "#4E6A44" }), 0.006, 0.006, 0.2, 0, 0.08, 0, 5); for (let b = 0; b < 5; b++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), lam({ color: "#F4F2EA", emissive: "#4A4A46" })); s.position.set(0.012 * (b % 2 ? 1 : -1), 0.12 + b * 0.025, 0.006); brin.add(s); } }

// ---------------------------------------------------------------- gestures
const vers = (o, cle, v, k) => { o.rotation[cle] = lerp(o.rotation[cle], v, k); };
function leveBrin(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -0.9, k); vers(a.epauleD, "z", -0.15, k); vers(a.coudeD, "x", -1.1, k); }
function boire(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -1.2, k); vers(a.epauleD, "z", 0.25, k); vers(a.coudeD, "x", -2.0, k); vers(a.tete, "x", -0.15 * k, 1); }
function appelle(q, k) { if (k <= 0) return; const a = q.articulations; vers(a.epauleD, "x", -0.4, k); vers(a.epauleD, "z", -1.1, k); vers(a.coudeD, "x", -1.5, k); }
function jouer(q, t, o = {}) {
  q.objet.visible = !o.cache;
  if (o.cache) return;
  q.objet.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); q.objet.rotation.set(o.rx || 0, o.ry ?? 0, 0);
  if (Array.isArray(o.pose)) q.transitionPose(o.pose[0], o.pose[1], o.pose[2]); else q.pose(o.pose || "debout");
  if (o.expr) q.expression(o.expr[0], o.expr[1]); else q.expression("neutre", 0);
  q.regarder(...(o.regard || [0, 0])); q.parler(o.parle || 0);
  q.animer(t + (o.phase || 0));
  leveBrin(q, o.brin || 0); boire(q, o.boit || 0); appelle(q, o.appel || 0);
  if (o.tete) { q.articulations.cou.rotation.y += o.tete; }
}
/** Mouth of a character: open and close on the words of segment id (the voice timings). */
function bouche(id, t) {
  const sg = EP.SEG[id];
  if (!sg || t < sg.start || t > sg.next) return 0;
  for (const s of sg.sentences) for (const w of s.words) if (t >= w.s - 0.04 && t <= w.e + 0.02) return 0.35 + 0.65 * Math.abs(Math.sin((t - w.s) * TAU * 3.2));
  return 0;
}
function seuls(liste) { for (const q of TOUS) if (!liste.includes(q)) q.objet.visible = false; }

// ---------------------------------------------------------------- the sets at time t
function decor(g, { ciel, cle, contre, fond = "#050506", fog = [9, 30] }) {
  for (const x of [maison, chambre, rue, centrale, bureau, tribunal]) x.visible = x === g;
  st.ciel.intensity = ciel; st.key.intensity = cle; st.contre.intensity = contre;
  st.scene.background = new THREE.Color(fond); st.scene.fog.color.set(fond); st.scene.fog.near = fog[0]; st.scene.fog.far = fog[1];
}
/** The living room: o.tv ("meteo" | "aveu" | "off"), o.nuit, who sits where. */
function miseSalon(t, o = {}) {
  const nuit = o.nuit ?? 1;
  decor(maison, { ciel: lerp(1.2, 0.5, nuit), cle: lerp(1.6, 0.3, nuit), contre: lerp(0.5, 0.25, nuit), fog: [10, 30] });
  st.key.position.set(-6, 4, 1); st.key.target.position.set(0, 1, 1); st.key.color.set("#DCE2DA");
  st.ciel.color.set("#C9CEC4"); st.ciel.groundColor.set("#2C2A26");
  fenetreSalon.emissive.set(nuit > 0.5 ? "#1C262E" : "#A8B2A8"); fenetreSalon.emissiveIntensity = 1;
  lampe.intensity = 6 * nuit;
  const allume = o.tv === "off" ? 0 : 1;
  ecranTele(t, o.tv || "off", o.tvT ?? t);
  tvSalon.ecran.emissiveIntensity = 0.12 + 0.95 * allume; tvSalon.feu.intensity = (o.feuTv ?? 9) * allume * (0.92 + 0.08 * Math.sin(t * 9.0));
  brin.visible = false; verre.visible = !!o.table; saladier.visible = !!o.table;
  const roles = o.roles || {};
  const actifs = [];
  for (const [q, def] of [[pere, roles.pere], [mere, roles.mere], [enfant, roles.enfant], [vieuxPere, roles.vieuxPere], [vieilleMere, roles.vieilleMere]]) {
    if (!def) { q.objet.visible = false; continue; }
    jouer(q, t, def); actifs.push(q);
  }
  seuls(actifs);
}
const CANAPE = { pere: { x: -0.62, z: 1.47, ry: Math.PI, pose: "assis", phase: 1 }, enfant: { x: 0.04, z: 1.42, y: 0.03, ry: Math.PI, pose: "assis", phase: 2 }, mere: { x: 0.66, z: 1.47, ry: Math.PI, pose: "assis", phase: 3 } };
const TABLE = { pere: { x: -0.45, z: 4.82, ry: Math.PI, pose: "assis", phase: 1 }, mere: { x: 0.45, z: 4.82, ry: Math.PI, pose: "assis", phase: 3 }, enfant: { x: 0, z: 4.82, y: 0.2, ry: Math.PI, pose: "assis", phase: 2 } };
function miseChambre(t) {
  decor(chambre, { ciel: 0.42, cle: 0.25, contre: 0.35, fog: [8, 20] });
  st.key.position.set(0.1, 3, -4); st.key.target.position.set(-1.4, 0.4, 0);
  veilleuse.intensity = 6;
  jouer(enfant, t, { x: -1.4, y: 0.53, z: 0.55, rx: -Math.PI / 2, ry: 0, expr: ["joie", 0.85], phase: 0 });
  enfant.objet.rotation.set(-Math.PI / 2, 0, 0);
  brin.visible = false;
  seuls([enfant]);
}
/** The street: o.nuit, o.pluie (wet light), o.allemagne (the same street on the other side: doors shut, bottles out). */
function miseRue(t, o = {}) {
  const nuit = o.nuit ?? 0;
  decor(rue, { ciel: lerp(1.15, 0.75, nuit), cle: lerp(0.9, 0.35, nuit), contre: lerp(0.5, 0.45, nuit), fond: nuit > 0.5 ? "#141A1E" : "#7E867E", fog: nuit > 0.5 ? [10, 48] : [10, 55] });
  st.key.position.set(-10, 12, 8); st.key.target.position.set(0, 0, -5); st.key.color.set("#D8DED6");
  st.ciel.color.set(nuit > 0.5 ? "#7A8A9A" : "#C4CABE"); st.ciel.groundColor.set("#2A2C28");
  fenetresRue.forEach((f, i) => (f.emissiveIntensity = nuit > 0.5 ? (i % 3 === 1 ? 0 : 0.85) : (o.allemagne && i % 2 ? 0.25 : 0.06)));
  portes.forEach((p, i) => (p.porte.material.emissiveIntensity = o.porteOuverte === i ? 0.7 : 0));
  stand.visible = !o.allemagne && !nuit; bouteilles.visible = !!o.allemagne;
  const actifs = [];
  for (const [q, def] of o.roles || []) { if (def) { jouer(q, t, def); actifs.push(q); } }
  brin.visible = actifs.includes(enfant);
  seuls(actifs);
}
function miseCentrale(t, o = {}) {
  decor(centrale, { ciel: 0.85, cle: 0.9, contre: 0.4, fond: "#0A0B0A", fog: [12, 34] });
  st.key.position.set(5, 9, 6); st.key.target.position.set(0, 0, -2); st.key.color.set("#E2E6DE");
  st.ciel.color.set("#C2C8BE"); st.ciel.groundColor.set("#2C2E2A");
  const a = o.alarme || 0, pouls = 0.5 - 0.5 * Math.cos(t * TAU * 1.0);    // one slow pulse a second
  alarme.emissiveIntensity = a * (0.25 + 1.1 * pouls); feuAlarme.intensity = a * 10 * pouls;
  const actifs = [];
  for (const [q, def] of o.roles || []) { if (def) { jouer(q, t, def); actifs.push(q); } }
  seuls(actifs);
}
function miseBureau(t, o = {}) {
  decor(bureau, { ciel: 0.45, cle: 0.3, contre: 0.25, fog: [8, 20] });
  st.key.position.set(2, 4, 2); st.key.target.position.set(0, 0.8, -1.6);
  lampeBureau.intensity = 5;
  brin.visible = false;
  const L = 0.15 + 0.55 * (o.papier || 0); papier3d.scale.y = L / 0.7; papier3d.position.y = 1.1 + L / 2 * Math.cos(0.18);
  seuls([]);
}
function miseTribunal(t, o = {}) {
  decor(tribunal, { ciel: 1.35, cle: 1.0, contre: 0.5, fond: "#08070A", fog: [18, 42] });
  st.key.position.set(-8, 7, 0); st.key.target.position.set(0, 0, -2); st.key.color.set("#D8DCD0");
  st.ciel.color.set("#C0C4B8"); st.ciel.groundColor.set("#2A2420");
  publicFoule.groupe.visible = !o.vide; if (!o.vide) publicFoule.animer(t);
  maillet.rotation.z = -0.9 * (o.maillet || 0);
  const actifs = [];
  juges.forEach((q, i) => { if (o.juges !== false) { jouer(q, t, { x: -1.6 + i * 1.6, y: 0.45, z: -6.95, ry: 0, pose: "assis", phase: i }); actifs.push(q); } });
  if (!o.vide) assisTribunal.forEach((q, i) => { jouer(q, t, { x: -2.4 + i * 0.8, z: -0.42, ry: Math.PI, pose: "assis", phase: i * 0.7, regard: [0, -0.1] }); actifs.push(q); });
  if (o.malade) { jouer(malade, t, o.malade); actifs.push(malade); }
  seuls(actifs);
}

// ---------------------------------------------------------------- the TV screen (a canvas: map, faceless presenter)
function silhouetteTV(c, x, y, s) {   // a faceless figure: head and shoulders in flat grey, nothing else
  c.save(); c.fillStyle = "#1A1E1C"; c.beginPath(); c.ellipse(x, y, 34 * s, 42 * s, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x - 110 * s, y + 200 * s); c.quadraticCurveTo(x - 100 * s, y + 60 * s, x, y + 52 * s); c.quadraticCurveTo(x + 100 * s, y + 60 * s, x + 110 * s, y + 200 * s); c.fill(); c.restore();
}
let tvCle = "";
function ecranTele(t, mode, tm) {
  const cle = mode + Math.round(tm * 15);
  if (cle === tvCle) return;
  tvCle = cle;
  const c = tvc; c.save(); c.setTransform(2.5, 0, 0, 2.5, 0, 0);
  c.fillStyle = "#08100C"; c.fillRect(0, 0, 640, 480);
  if (mode === "meteo" || mode === "aveu") {
    const V = vue(80, 0, 560, 480, 2.2, 46.6, 40);
    fondCarte(c, V, { terre: "#2E3A33", france: "#4A5A4E", bordFrance: "#E4E2D4", trait: 2.2 });
    if (mode === "meteo") {
      dessinerNuage(c, V, 4.6 + 0.05 * Math.sin(tm * 0.3), { taille: 7, alpha: 0.5, clip: horsFrance(V) });
      const [sx, sy] = V.p(LIEUX.stop); panneauStop(c, sx + 6, sy - 20, 34);
      c.fillStyle = "#E4E2D4"; c.font = "64px MontX"; c.textAlign = "center"; c.textBaseline = "middle";
      const [ax, ay] = V.p([-6.5, 45.5]); c.fillText("A", ax, ay);
    } else {
      c.save(); c.beginPath(); c.rect(0, 0, 640, 480); c.clip();
      c.fillStyle = ACC; c.globalAlpha = 0.55; c.beginPath(); FRANCE.forEach((q, i) => { const [a, b] = V.p(q); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.closePath(); c.fill();
      c.beginPath(); CORSE.forEach((q, i) => { const [a, b] = V.p(q); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.closePath(); c.fill(); c.restore();
      dessinerNuage(c, V, 7.5, { taille: 6, alpha: 0.3 });
    }
    silhouetteTV(c, 70, 250, 1.1);
  }
  // scan lines of the tube
  c.fillStyle = "rgba(0,0,0,.28)"; for (let y = 0; y < 480; y += 4) c.fillRect(0, y, 640, 2);
  const g = c.createRadialGradient(320, 240, 120, 320, 240, 420); g.addColorStop(0, "rgba(255,255,255,.06)"); g.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = g; c.fillRect(0, 0, 640, 480);
  c.restore();
  tvSalon.tex.needsUpdate = true;
}
function ecritPapier(lignes, n) {   // the teleprinter paper texture in 3D (a few dark lines)
  const c = papierCanvas.getContext("2d"); c.fillStyle = "#E4E0D4"; c.fillRect(0, 0, 256, 512);
  c.fillStyle = "#2A2C2A"; for (let i = 0; i < Math.min(lignes, n); i++) c.fillRect(20, 470 - i * 34, 120 + ((i * 53) % 90), 10);
  papierTex.needsUpdate = true;
}

// ---------------------------------------------------------------- camera: shots joined by a short dissolve (as in v14)
const tampon = Object.assign(document.createElement("canvas"), { width: W, height: H });
const doux = u => u * u * (3 - 2 * u);
const glisse = (a, b = a) => u => { const k = doux(u); return { fov: lerp(a.fov ?? 50, b.fov ?? a.fov ?? 50, k), pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), cible: a.cible.map((v, i) => lerp(v, b.cible[i], k)) }; };
const P = (t0, cam, mise, apres) => ({ t0, cam, mise, apres });
function prise(t, p, fin) {
  if (p.cam === "2d") { p.mise(t); return; }
  p.mise(t);
  const c = typeof p.cam === "function" ? p.cam(clamp((t - p.t0) / Math.max(0.01, fin - p.t0)), t) : p.cam;
  st.tourner(ctx, 0, 0, W, H, { fov: c.fov ?? 50, pos: c.pos, cible: c.cible, filtre: FILTRE });
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
  let g = ctx.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, "rgba(3,4,3,.9)"); g.addColorStop(0.62, "rgba(3,4,3,.45)"); g.addColorStop(1, "rgba(3,4,3,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 800);
  g = ctx.createLinearGradient(0, 1080, 0, H); g.addColorStop(0, "rgba(3,4,3,0)"); g.addColorStop(0.45, "rgba(3,4,3,.42)"); g.addColorStop(1, "rgba(3,4,3,.85)"); ctx.fillStyle = g; ctx.fillRect(0, 1080, W, H - 1080);
}
/** Split screen: the left and right halves filmed separately, a dashed border between them. */
function deuxPays(t, gauche, droite, k = 1) {
  const w = Math.round(W / 2 * k + W / 2 * (1 - k) * 0);
  gauche.mise(t); st.tourner(ctx, 0, 0, W / 2, H, { ...gauche.cam, filtre: FILTRE });
  droite.mise(t); st.tourner(ctx, W / 2, 0, W / 2, H, { ...droite.cam, filtre: FILTRE });
  ctx.save(); ctx.fillStyle = "#050506"; ctx.fillRect(W / 2 - 4, 0, 8, H);
  ctx.strokeStyle = "rgba(237,231,218,.85)"; ctx.lineWidth = 4; ctx.setLineDash([22, 16]); ctx.beginPath(); ctx.moveTo(W / 2, 140); ctx.lineTo(W / 2, 1680); ctx.stroke(); ctx.restore();
  degradesTexte();
}

// ---------------------------------------------------------------- 2D: the map full screen, the rain, the haze of the cloud in the sky
const EUROPE_V = () => vue(30, 300, 1020, 1300, 15.5, 53.5, 24);
function grandeCarte(t, V, d, o = {}) {
  fondCarte(ctx, V, { alpha: o.alpha ?? 1, france: o.france, trait: 2 });
  if (d != null) dessinerNuage(ctx, V, d, { taille: o.taille ?? 7, alpha: (o.alphaNuage ?? 0.36) * (o.alpha ?? 1), depart: o.depart, clip: o.clip });
}
function point(x, y, k, couleur = BLANC) {   // a place lighting up: a dot and a soft halo that grows (never a flash)
  if (k <= 0) return;
  ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, 60 * k); g.addColorStop(0, "rgba(237,231,218,.45)"); g.addColorStop(1, "rgba(237,231,218,0)");
  ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140); ctx.fillStyle = couleur; ctx.globalAlpha = Math.min(1, k * 1.4); ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.restore();
}
function pointilles(a, b, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = o.couleur || BLANC; ctx.globalAlpha = o.alpha ?? 0.85; ctx.lineWidth = 5; ctx.setLineDash([4, 14]); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], p), lerp(a[1], b[1], p)); ctx.stroke(); ctx.restore();
}
function maisonnette(x, y, s, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = BLANC; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 0.9); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.75, y); ctx.lineTo(x + s * 0.75, y + s * 0.8); ctx.lineTo(x - s * 0.75, y + s * 0.8); ctx.lineTo(x - s * 0.75, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#050506"; ctx.fillRect(x - s * 0.18, y + s * 0.3, s * 0.36, s * 0.5); ctx.restore();
}
const GOUTTES = (() => { const r = rng(17); return Array.from({ length: 260 }, () => ({ x: r() * W, v: 1500 + r() * 700, ph: r(), l: 40 + r() * 50 })); })();
const TRACES = (() => { const r = rng(23); return Array.from({ length: 900 }, (_, i) => ({ t: i * 0.035 + r() * 0.03, x: 60 + r() * 940, y: r(), s: 0.6 + r() * 0.8 })); })();
/** Fine rain over the picture, and where each drop lands a yellow-green trace that stays (o.y0: ground line). */
function pluie(t, t0, o = {}) {
  const a = o.alpha ?? 1, y0 = o.sol ?? 1150, x0 = o.x0 ?? 0, x1 = o.x1 ?? W;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
  ctx.strokeStyle = "rgba(220,226,216,.22)"; ctx.lineWidth = 2; ctx.globalAlpha = a; ctx.beginPath();
  for (const g of GOUTTES) { const y = ((t * g.v + g.ph * H * 1.3) % (H * 1.3)) - 150, x = g.x + y * 0.06; ctx.moveTo(x, y); ctx.lineTo(x + g.l * 0.06, y + g.l); }
  ctx.stroke();
  if (o.traces !== false) {
    ctx.fillStyle = ACC;
    for (const tr of TRACES) {
      const age = t - t0 - tr.t; if (age < 0) break;
      if (tr.x < x0 || tr.x > x1) continue;
      const y = y0 + tr.y * (H - 250 - y0), k = Math.min(1, age / 0.25), s = tr.s * (0.6 + 0.6 * (y - y0) / (H - y0));
      ctx.globalAlpha = a * (0.16 + 0.5 * Math.exp(-age * 1.4)) * k;
      ctx.beginPath(); ctx.ellipse(tr.x, y, 14 * s * (0.6 + 0.4 * k), 4.5 * s, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
/** The cloud over the roofs at night: slow yellow-green haze in the upper part of the frame. */
function brume(t, a, y1 = 900) {
  if (a <= 0) return;
  const r = rng(31);
  ctx.save(); ctx.fillStyle = ACC;
  for (let i = 0; i < 420; i++) {
    const bx = r() * 1300 - 110, by = r() * y1, vx = 8 + r() * 14, s = 3 + r() * 7, ph = r() * TAU;
    const x = ((bx + t * vx) % 1300) - 110, y = by + 12 * Math.sin(t * 0.4 + ph) + t * 4 % 40;
    ctx.globalAlpha = a * (0.1 + 0.25 * r()) * Math.min(1, (y1 - y) / 300);
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function bouteilleBarree(x, y, s, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = BLANC;
  ctx.beginPath(); ctx.roundRect(x - s * 0.32, y - s * 0.3, s * 0.64, s * 1.1, s * 0.12); ctx.fill(); ctx.fillRect(x - s * 0.14, y - s * 0.62, s * 0.28, s * 0.36);
  ctx.strokeStyle = BLANC; ctx.lineWidth = s * 0.12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - s * 0.8, y + s * 0.85); ctx.lineTo(x + s * 0.8, y - s * 0.75); ctx.stroke();
  ctx.strokeStyle = "#050506"; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(x - s * 0.8, y + s * 0.85); ctx.lineTo(x + s * 0.8, y - s * 0.75); ctx.stroke();
  ctx.restore();
}
function tracer(pts, p, o = {}) {
  if (p <= 0) return;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let reste = seg.reduce((a, b) => a + b, 0) * Math.min(1, p);
  ctx.save(); ctx.strokeStyle = o.couleur || BLANC; ctx.lineWidth = o.trait || 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && reste > 0; i++) { const k = Math.min(1, reste / seg[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); reste -= seg[i - 1]; }
  ctx.stroke(); ctx.restore();
}
const RAD = 6.2832 / 360;
function fleche(a, b, p, o = {}) {   // a curved arrow drawn progressively (the wind)
  if (p <= 0) return;
  const pts = []; for (let u = 0; u <= 1.0001; u += 0.05) { const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * (o.courbe ?? 60); pts.push([x, y]); }
  tracer(pts, p, { trait: 7, alpha: 0.85, ...o });
  if (p > 0.97) { const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 3], an = Math.atan2(y1 - y0, x1 - x0); tracer([[x1 - 26 * Math.cos(an - 0.5), y1 - 26 * Math.sin(an - 0.5)], [x1, y1], [x1 - 26 * Math.cos(an + 0.5), y1 - 26 * Math.sin(an + 0.5)]], 1, { trait: 7, alpha: 0.85, ...o }); }
}

// ---------------------------------------------------------------- the hook: the sentence is written, cracks, and falls to dust
const PHRASE = ["« LE NUAGE", "DE TCHERNOBYL", "S'EST ARRÊTÉ", "À LA FRONTIÈRE »"], PH_Y = 640, PH_PAS = 118, PH_T = () => Math.min(...PHRASE.map(l => ajuste(l, 100)));
let POUSSIERE = null;
function poussiere() {   // the sentence sampled into specks (drawn once, offscreen)
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  PHRASE.forEach((l, i) => { x.font = `${PH_T()}px MontX`; x.fillText(l, CX, PH_Y + i * PH_PAS); });
  const d = x.getImageData(0, 0, W, H).data, out = [], r = rng(3);
  for (let y = 0; y < H; y += 4) for (let xx = 0; xx < W; xx += 4) if (d[(y * W + xx) * 4 + 3] > 128) out.push({ x: xx, y, dl: (xx - 70) / 860 * 0.9 + r() * 0.35, vx: (r() - 0.5) * 40, g: 500 + r() * 500 });
  return out;
}
scene("hook", {
  dessin(t) {
    const tb = EP.T.reveals[0];
    grandeCarte(t, EUROPE_V(), 6 + 0.04 * t, { alpha: 0.4 + 0.1 * va(t, tb, 1.5) });
    if (t > tb) {
      POUSSIERE = POUSSIERE || poussiere();
      ctx.save(); ctx.fillStyle = BLANC;
      for (const p of POUSSIERE) { const u = t - tb - p.dl; if (u < 0) { ctx.globalAlpha = 1; ctx.fillRect(p.x, p.y, 3, 3); continue; } const a = 1 - u / 1.6; if (a <= 0) continue; ctx.globalAlpha = a; ctx.fillRect(p.x + p.vx * u, p.y + 0.5 * p.g * u * u, 3, 3); }
      ctx.restore();
    }
  },
  texte(t) {
    const tb = EP.T.reveals[0], tf = phrase("hook", 3).start, fin = phrase("hook", 0).end;
    if (t < tb) {
      const total = PHRASE.join("").length, n = Math.floor(total * prog(t, 0.45, fin - 0.2));
      let reste = n;
      PHRASE.forEach((l, i) => { const s = l.slice(0, Math.max(0, Math.min(l.length, reste))); reste -= l.length; if (s) ecrire(s, CX - (ctxLargeur(l) - ctxLargeur(s)) / 2, PH_Y + i * PH_PAS, PH_T()); });
      // cracks run across the words
      const k = va(t, tf, tb - tf);
      tracer([[110, 590], [260, 650], [330, 620], [470, 720], [560, 690], [700, 790], [820, 760], [960, 860]], k, { couleur: "#050506", trait: 7 });
      tracer([[180, 900], [320, 820], [430, 860], [590, 760], [650, 800], [760, 700]], k * 1.1 - 0.1, { couleur: "#050506", trait: 6 });
    }
    texte("PERSONNE", CX, 400, 120, t, tb + 0.3);
    texte("NE L'A JAMAIS PRONONCÉE", CX, 505, ajuste("NE L'A JAMAIS PRONONCÉE", 60), t, tb + 0.55);
    texte("LA VRAIE HISTOIRE", CX, 1250, ajuste("LA VRAIE HISTOIRE", 70), t, mot("hook", "vraie", 10) - 0.2);
    texte("EST PIRE.", CX, 1340, 70, t, mot("hook", "inquiétante", 11) - 0.3, { couleur: ACC });
  },
});
function ctxLargeur(s) { ctx.save(); ctx.font = `${PH_T()}px MontX`; const w = ctx.measureText(s).width; ctx.restore(); return w; }

// ---------------------------------------------------------------- 26 April 1986, 01:23: the point, the cloud, 2 000 km
scene("explosion", {
  dessin(t) {
    const V = EUROPE_V(), te = mot("explosion", "explose", 5) - 0.1;
    grandeCarte(t, V, Math.max(0, (t - te) * 0.06));
    const [x, y] = V.p(LIEUX.tchernobyl); point(x, y, va(t, te - 0.2, 0.9));
  },
  texte(t) {
    const V = EUROPE_V(), [x, y] = V.p(LIEUX.tchernobyl), te = mot("explosion", "explose", 5) - 0.1;
    const tr = S("radio"), tp = mot("radio", "poussières", 1.5) - 0.3, tm = mot("radio", "malade", 7) - 0.4;
    texte("26 AVRIL 1986", CX, 380, ajuste("26 AVRIL 1986", 110), t, S("explosion") + 0.05, { fin: tr - 0.3 });
    texte("01:23", CX, 500, 96, t, mot("explosion", "heure", 2) - 0.2, { alpha: 0.85, fin: tr - 0.3 });
    texte("UNE CENTRALE NUCLÉAIRE", CX, 1270, ajuste("UNE CENTRALE NUCLÉAIRE", 64), t, mot("explosion", "centrale", 3) - 0.3, { fin: te - 0.3 });
    texte("= DE L'ÉLECTRICITÉ", CX, 1360, ajuste("= DE L'ÉLECTRICITÉ", 56), t, mot("explosion", "électricité", 5) - 0.4, { fin: te - 0.3, alpha: 0.85 });
    texte("RÉACTEUR N°4", x - 30, y + 80, 48, t, mot("explosion", "réacteur", 6) - 0.2, { align: "right" });
    texte("TCHERNOBYL", x - 30, y + 140, 52, t, te + 0.2, { align: "right" });
    texte("UN NUAGE INVISIBLE", CX, 400, ajuste("UN NUAGE INVISIBLE", 84), t, tr + 0.05);
    texte("POUSSIÈRES RADIOACTIVES", CX, 1270, ajuste("POUSSIÈRES RADIOACTIVES", 60), t, tp, { couleur: ACC, fin: tm - 0.3 });
    texte("EN GRANDE QUANTITÉ :", CX, 1270, ajuste("EN GRANDE QUANTITÉ :", 60), t, tm - 0.2, { alpha: 0.85 });
    texte("ELLES RENDENT MALADE", CX, 1360, ajuste("ELLES RENDENT MALADE", 64), t, tm);
  },
});
scene("chambre", {
  dessin(t) {
    const V = EUROPE_V(), td = mot("chambre", "dors", 3) - 0.35, tk = mot("chambre", "village", 4) - 0.3;
    const d = 0.25 + (t - S("chambre")) * 0.04;
    if (t < td + 0.3) {
      grandeCarte(t, V, d);
      const a = V.p(LIEUX.tchernobyl), b = V.p(LIEUX.village);
      point(a[0], a[1], 1); pointilles(a, b, va(t, S("chambre") + 0.2, 1.6)); maisonnette(b[0], b[1] - 8, 26, sort(t, S("chambre") + 1.5, 0.5));
    }
    if (t >= td) {
      const k = va(t, td, 0.3);
      ctx.save(); ctx.globalAlpha = k;
      filmer(t, [P(td, glisse({ pos: [-0.2, 1.45, 0.9], cible: [-1.4, 0.6, -0.6], fov: 44 }, { pos: [-0.45, 1.3, 0.45], cible: [-1.4, 0.6, -0.65], fov: 40 }), miseChambre)], E("chambre"));
      ctx.restore();
    }
  },
  texte(t) {
    const V = EUROPE_V(), td = mot("chambre", "dors", 3) - 0.35, b = V.p(LIEUX.village);
    texte("TOI, 10 ANS", CX, 400, 96, t, S("chambre") + 0.05, { fin: td - 0.3 });
    texte("≈ 2 000 KM", b[0] + 10, b[1] + 70, 64, t, mot("chambre", "deux", 6) - 0.3, { fin: td - 0.3 });
    texte("UN VILLAGE", CX, 1250, 60, t, td + 0.3, { alpha: 0.85 });
    texte("DE L'EST DE LA FRANCE", CX, 1330, ajuste("DE L'EST DE LA FRANCE", 60), t, td + 0.5, { alpha: 0.85 });
  },
});
scene("moscou", {
  dessin(t) {
    const V = EUROPE_V(), t0 = S("moscou"), d = 0.4 + 1.6 * va(t, t0, E("moscou") - t0);
    grandeCarte(t, V, d);
    const m = V.p(LIEUX.moscou); point(m[0], m[1], va(t, t0 + 0.2, 0.6));
  },
  texte(t) {
    const V = EUROPE_V(), t0 = S("moscou"), m = V.p(LIEUX.moscou), tj = mot("moscou", "jours", 2.4) - 0.4;
    texte("MOSCOU", m[0] - 20, m[1] - 60, 56, t, t0 + 0.2, { align: "right" });
    texte("SE TAIT", m[0] - 20, m[1] + 2, 56, t, t0 + 0.5, { align: "right", alpha: 0.75 });
    const h = Math.round(48 * va(t, tj, E("moscou") - tj - 0.5));
    texte(`${h} H`, CX, 420, 150, t, tj);
    texte("LE MONDE NE SAIT RIEN", CX, 545, ajuste("LE MONDE NE SAIT RIEN", 62), t, mot("moscou", "monde", 3) - 0.2);
  },
});

// ---------------------------------------------------------------- 28 April: Sweden, the alarm at the portal
const PORTIQUE = { pos: [3.6, 1.9, 5.4], cible: [0, 1.3, -0.5], fov: 50 };
scene("suede", {
  dessin(t) {
    const t0 = S("suede"), ta = mot("suede", "alarmes", 2) - 0.3, tc = mot("suede", "cherchent", 4) - 0.3, t1 = S("tech1"), t2 = S("tech2");
    const marche = clamp((t - t0 - 0.2) / 3.2), arrete = t > t0 + 3.4;
    const roles = () => [
      [ouvrier, { x: 0, z: lerp(-5.5, -0.15, marche), ry: 0, pose: arrete ? ["marche", "debout", va(t, t0 + 3.4, 0.4)] : "marche", phase: t * 2.2, expr: ["doute", va(t, ta + 0.4, 0.6)], regard: [0, 0.4 * va(t, ta + 0.5, 0.6)] }],
      [tech1, { x: 1.35, z: 0.9, ry: -2.1, pose: ["debout", "pointer", va(t, tc + 1.2, 0.5) * (1 - va(t, t1 - 0.2, 0.4))], parle: bouche("tech1", t), expr: ["choc", va(t, t1, 0.4) * 0.8], regard: [0.3, 0] }],
      [tech2, { x: 2.6, z: -1.4, ry: -1.1, pose: ["debout", "noter", 1 - va(t, t2 - 0.3, 0.5)], parle: bouche("tech2", t), expr: ["doute", 0.6], regard: [-0.4, 0] }],
    ];
    const mise = t => miseCentrale(t, { alarme: va(t, ta, 0.8), roles: roles() });
    filmer(t, [
      P(-1, glisse({ pos: [4.4, 2.6, 7.4], cible: [0, 1.2, -2], fov: 52 }, PORTIQUE), mise, lueur),
      P(tc, glisse({ pos: [-1.0, 0.6, 1.6], cible: [0, 0.2, -0.3], fov: 40 }, { pos: [-0.8, 0.7, 1.3], cible: [0, 0.25, -0.2], fov: 40 }), mise, lueur),
      P(t1 - 0.15, glisse({ pos: [0.05, 1.62, 0.65], cible: [1.35, 1.6, 0.9], fov: 36 }, { pos: [0.15, 1.62, 0.7], cible: [1.35, 1.6, 0.9], fov: 36 }), mise, lueur),
      P(t2 - 0.15, glisse({ pos: [1.4, 1.58, 0.1], cible: [2.6, 1.55, -1.4], fov: 34 }, { pos: [1.55, 1.58, 0.0], cible: [2.6, 1.55, -1.4], fov: 34 }), mise, lueur),
    ], E("tech2"));
  },
  texte(t) {
    const t0 = S("suede"), ta = mot("suede", "alarmes", 2) - 0.3, t1 = S("tech1");
    texte("28 AVRIL", CX, 380, 110, t, t0 + 0.05, { fin: t1 - 0.3 });
    texte("SUÈDE", CX, 490, 64, t, mot("suede", "Suède", 1) - 0.2, { alpha: 0.85, fin: t1 - 0.3 });
    texte("CENTRALE DE FORSMARK", CX, 1300, ajuste("CENTRALE DE FORSMARK", 58), t, ta, { fin: t1 - 0.3 });
  },
});
function lueur(t) {   // the alarm's soft red glow around the lamp (one slow pulse a second)
  const a = va(t, mot("suede", "alarmes", 2) - 0.3, 0.8); if (a <= 0) return;
  const p = st.projeter([0, 2.72, 0]); if (!p.devant) return;
  const k = a * (0.5 - 0.5 * Math.cos(t * TAU));
  ctx.save(); const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 220); g.addColorStop(0, `rgba(200,60,44,${0.4 * k})`); g.addColorStop(1, "rgba(200,60,44,0)"); ctx.fillStyle = g; ctx.fillRect(p.x - 230, p.y - 230, 460, 460); ctx.restore();
}
scene("suede2", {
  dessin(t) {
    const V = EUROPE_V(), t0 = S("suede2"), te = mot("suede2", "est", 3.5) - 0.3;
    grandeCarte(t, V, 2.0 + 0.6 * va(t, t0, E("suede2") - t0));
    const f = V.p(LIEUX.forsmark), c = V.p(LIEUX.tchernobyl);
    point(f[0], f[1], va(t, t0, 0.5)); point(c[0], c[1], va(t, te, 0.5));
    fleche(c, f, va(t, te, 1.2), { courbe: -70 });
  },
  texte(t) {
    const t0 = S("suede2"), te = mot("suede2", "est", 3.5) - 0.3, ts = mot("suede2", "soir", 6) - 0.3, tl = mot("suede2", "lignes", 8) - 0.6;
    texte("PAS DE FUITE", CX, 400, 100, t, t0 + 0.05, { fin: ts - 0.3 });
    texte("ÇA VIENT DE L'EST", CX, 1300, ajuste("ÇA VIENT DE L'EST", 76), t, te, { fin: ts - 0.3 });
    texte("LE SOIR MÊME", CX, 380, 76, t, ts, { alpha: 0.8 });
    texte("MOSCOU AVOUE", CX, 480, ajuste("MOSCOU AVOUE", 100), t, mot("suede2", "avoue", 7) - 0.3);
    texte("EN QUELQUES LIGNES", CX, 1300, ajuste("EN QUELQUES LIGNES", 64), t, tl);
  },
});

// ---------------------------------------------------------------- 30 April, 20:00: the weather forecast in the living room
const DOS_CANAPE = { pos: [0.45, 1.5, 3.0], cible: [0, 0.85, -2.6], fov: 50 };
const ECRAN = { pos: [0.0, 0.9, -1.45], cible: [0.0, 0.88, -2.36], fov: 42 }, ECRAN_STOP = { pos: [0.05, 0.92, -1.75], cible: [0.07, 0.92, -2.36], fov: 40 };
scene("meteo", {
  dessin(t) {
    const t0 = S("meteo"), tp = mot("meteo", "panneau", 8) - 0.9, tx = mot("meteo", "présentatrice", 9) - 0.2, t1 = S("pere1"), t2 = S("mere1"), tsil = phrase("mere1", 1).end + 0.2;
    const sourit = va(t, t1 - 0.4, 0.5);
    const mise = t => miseSalon(t, {
      tv: "meteo", roles: {
        pere: { ...CANAPE.pere, parle: bouche("pere1", t), expr: ["joie", 0.8 * sourit], tete: 0.5 * sourit * (1 - va(t, t2 + 0.5, 0.6)) },
        enfant: { ...CANAPE.enfant, regard: [0.5 * va(t, t1, 0.4) * (1 - va(t, t2, 0.4)), 0.1], expr: ["joie", 0.4 * va(t, t1 + 0.3, 0.4)] },
        mere: { ...CANAPE.mere, parle: bouche("mere1", t), expr: ["joie", 0.5 * va(t, t2, 0.4)], tete: 0.35 * va(t, t2 - 0.2, 0.4) },
      },
    });
    filmer(t, [
      P(-1, glisse({ pos: [0.6, 1.6, 3.3], cible: [0, 0.9, -2.6], fov: 52 }, DOS_CANAPE), mise),
      P(tp, glisse(ECRAN, ECRAN_STOP), mise),
      P(tx, glisse(ECRAN_STOP, { pos: [0.04, 0.91, -1.68], cible: [0.06, 0.91, -2.36], fov: 40 }), mise),
      P(t1 - 0.25, glisse({ pos: [-0.15, 1.12, 0.35], cible: [-0.62, 1.12, 1.5], fov: 38 }, { pos: [-0.2, 1.12, 0.5], cible: [-0.62, 1.12, 1.5], fov: 38 }), mise),
      P(t2 - 0.2, glisse({ pos: [0.2, 1.12, 0.35], cible: [0.66, 1.1, 1.47], fov: 38 }, { pos: [0.25, 1.12, 0.5], cible: [0.66, 1.1, 1.47], fov: 38 }), mise),
      // the silence: the family in the light of the set, from the screen
      P(tsil, glisse({ pos: [0, 1.05, -1.6], cible: [0, 0.95, 1.5], fov: 50 }, { pos: [0, 1.05, -1.2], cible: [0, 0.95, 1.5], fov: 50 }), mise),
    ], E("mere1"));
  },
  texte(t) {
    const t0 = S("meteo"), tf = mot("meteo", "famille", 3) - 0.4, tp = mot("meteo", "panneau", 8) - 0.2, ta = mot("meteo", "anticyclone", 10) - 0.25, t1 = S("pere1");
    texte("LA MÉTÉO", CX, 400, 110, t, mot("meteo", "météo", 4) - 0.3, { fin: tp - 0.4 });
    texte("UN PANNEAU STOP", CX, 400, ajuste("UN PANNEAU STOP", 84), t, tp, { fin: ta - 0.3 });
    texte("UN ANTICYCLONE", CX, 380, ajuste("UN ANTICYCLONE", 80), t, ta, { fin: t1 - 0.3 });
    texte("= UNE ZONE DE BEAU TEMPS", CX, 470, ajuste("= UNE ZONE DE BEAU TEMPS", 56), t, mot("meteo", "zone", 11) - 0.3, { fin: t1 - 0.3, alpha: 0.85 });
    texte("PROTÈGE LA FRANCE", CX, 1300, ajuste("PROTÈGE LA FRANCE", 64), t, mot("meteo", "protège", 12) - 0.3, { fin: t1 - 0.3 });
    texte("POUR 3 JOURS", CX, 1390, 60, t, mot("meteo", "trois", 13) - 0.3, { fin: t1 - 0.3, alpha: 0.85 });
  },
});
scene("entree", {
  dessin(t) {
    const t0 = S("entree"), tw = phrase("entree", 0).start, te = mot("entree", "entrer", 5) - 1;
    const mise = t => miseRue(t, { nuit: 1, roles: [] });
    filmer(t, [P(-1, glisse({ pos: [0.5, 1.6, 14], cible: [-2, 3.2, -10], fov: 52 }, { pos: [0.3, 1.7, 9], cible: [-2, 3.0, -10], fov: 50 }), mise, t => brume(t, va(t, tw, 2.5) * 0.9 + 0.1, 1000))], E("entree"));
  },
  texte(t) {
    const tw = phrase("entree", 0).start, te = mot("entree", "déjà", 4) - 0.3;
    texte("CE SOIR-LÀ", CX, 400, 96, t, tw + 0.1, { alpha: 0.85 });
    texte("LE NUAGE ENTRE", CX, 1300, ajuste("LE NUAGE ENTRE", 84), t, te, { couleur: ACC });
    texte("EN FRANCE", CX, 1395, 72, t, te + 0.3);
  },
});

// ---------------------------------------------------------------- 1 May: the muguet, the fine rain, the glass of milk
const ENFANT_RUE = t => ({ x: 0.3 + 0.08 * Math.sin(t * 0.8), z: 4.6, ry: 0.32, pose: "debout", brin: 1, expr: ["joie", 0.7], regard: [0, 0.2], phase: 2 });
scene("mai", {
  dessin(t) {
    const t0 = S("mai"), tj = mot("mai", "joues", 4) - 0.4, t2 = S("mere2");
    const mise = t => miseRue(t, { nuit: 0, porteOuverte: 1, roles: [
      [enfant, t < t2 - 0.2 ? { ...ENFANT_RUE(t) } : { ...ENFANT_RUE(t), ry: -1.2, regard: [0.5, 0], expr: ["joie", 0.5] }],
      [mere, t > t2 - 1.5 ? { x: portes[1].x + 0.45, z: portes[1].z, ry: Math.PI / 2, appel: va(t, t2 - 0.2, 0.4) * (1 - va(t, E("mere2") - 0.6, 0.4)), parle: bouche("mere2", t), expr: ["doute", 0.5] } : null],
      ...gamins.slice(0, 2).map((q, i) => [q, { x: 1.6 + i * 0.8, z: 2.0 - i * 1.4, ry: -2.2 + i, pose: "debout", phase: i * 3, expr: ["joie", 0.6] }]),
    ] });
    filmer(t, [
      P(-1, glisse({ pos: [2.6, 1.5, 9.5], cible: [-1.5, 1.0, 2.5], fov: 50 }, { pos: [2.0, 1.4, 8.6], cible: [-1, 1.0, 2.5], fov: 50 }), mise, t => pluie(t, t0, { sol: 1180 })),
      P(tj, glisse({ pos: [0.95, 0.95, 6.5], cible: [0.3, 0.98, 4.6], fov: 40 }, { pos: [0.85, 0.92, 6.2], cible: [0.3, 0.98, 4.6], fov: 40 }), mise, t => pluie(t, t0, { sol: 1250 })),
      P(t2 - 0.2, glisse({ pos: [-1.2, 1.5, 8.6], cible: [portes[1].x + 0.4, 1.4, portes[1].z], fov: 40 }, { pos: [-1.4, 1.5, 8.2], cible: [portes[1].x + 0.4, 1.4, portes[1].z], fov: 40 }), mise, t => pluie(t, t0, { sol: 1250 })),
    ], E("mere2"));
  },
  texte(t) {
    const t0 = S("mai"), t2 = S("mere2");
    texte("1ER MAI", CX, 400, 130, t, t0 + 0.05, { fin: t2 - 0.3 });
    texte("JOUR FÉRIÉ", CX, 510, 64, t, mot("mai", "férié", 2) - 0.3, { alpha: 0.8, fin: t2 - 0.3 });
    texte("IL PLEUT UN PEU", CX, 1300, ajuste("IL PLEUT UN PEU", 64), t, mot("mai", "pleut", 5) - 0.3, { fin: t2 - 0.3 });
  },
});
scene("mai2", {
  dessin(t) {
    const t0 = S("mai2"), tm = mot("mai2", "maximum", 6) - 0.4;
    const mise = t => miseSalon(t, { tv: "off", nuit: 1, table: true, feuTv: 0, roles: { enfant: { ...TABLE.enfant, regard: [0, 0.35], expr: ["joie", 0.4] }, mere: { x: 1.15, z: 3.9, ry: -2.4, pose: "debout", phase: 3 } } });
    filmer(t, [
      P(-1, glisse({ pos: [0.9, 1.25, 3.2], cible: [0, 0.9, 4.75], fov: 42 }, { pos: [0.7, 1.2, 3.45], cible: [0, 0.9, 4.75], fov: 42 }), mise),
      P(mot("mai2", "salade", 3) - 0.3, glisse({ pos: [0.55, 1.15, 3.6], cible: [0.1, 0.92, 4.6], fov: 40 }, { pos: [0.5, 1.12, 3.7], cible: [0.1, 0.92, 4.6], fov: 40 }), mise),
      P(tm - 0.6, glisse({ pos: [0, 1.0, 3.5], cible: [0, 1.12, 4.8], fov: 44 }, { pos: [0, 1.0, 3.7], cible: [0, 1.12, 4.8], fov: 44 }), mise, t => brume(t, 0.35, 600)),
    ], E("mai2"));
  },
  texte(t) {
    const t0 = S("mai2"), tc = mot("mai2", "Ce", 4) - 0.2, tm = mot("mai2", "maximum", 6) - 0.4;
    texte("UN VERRE DE LAIT", CX, 400, ajuste("UN VERRE DE LAIT", 76), t, mot("mai2", "verre", 1) - 0.3, { fin: tc - 0.3 });
    texte("LA SALADE DU JARDIN", CX, 490, ajuste("LA SALADE DU JARDIN", 60), t, mot("mai2", "salade", 3) - 0.3, { fin: tc - 0.3, alpha: 0.85 });
    texte("LA PLUIE FAIT TOMBER", CX, 1300, ajuste("LA PLUIE FAIT TOMBER", 60), t, mot("mai2", "pluie", 3.5) - 0.3, { fin: tc - 0.3 });
    texte("LES POUSSIÈRES", CX, 1390, ajuste("LES POUSSIÈRES", 64), t, mot("mai2", "poussières", 4) - 0.3, { couleur: ACC, fin: tc - 0.3 });
    texte("CE JOUR-LÀ", CX, 380, 84, t, tc, { alpha: 0.85 });
    texte("RADIOACTIVITÉ DE L'AIR", CX, 480, ajuste("RADIOACTIVITÉ DE L'AIR", 60), t, mot("mai2", "radioactivité", 5) - 0.3);
    texte("AU MAXIMUM", CX, 1400, ajuste("AU MAXIMUM", 110), t, tm, { couleur: ACC });
  },
});

// ---------------------------------------------------------------- the same rain on both sides of the border
const RUE_G = { pos: [0.6, 1.3, 8.2], cible: [0, 0.9, 2.5], fov: 72 }, RUE_D = { pos: [1.2, 1.55, 10.4], cible: [4.3, 1.3, 5.1], fov: 70 };
const FRANCE_RUE = t => [[enfant, { ...ENFANT_RUE(t), x: 0.15, z: 3.4, ry: 0.3 }], ...gamins.map((q, i) => [q, { x: -0.9 + i * 0.6, z: 2.6 - i * 0.7, ry: (i % 2 ? 1 : -1) * 2.4, pose: i === 2 ? "marche" : "debout", phase: t * (i === 2 ? 2 : 1) + i, expr: ["joie", 0.6] }])];
const PORTE_VOISINE = 8;
const ALLEMAGNE_RUE = (t, parle = 0) => [[voisine, { x: portes[PORTE_VOISINE].x - 0.45, z: portes[PORTE_VOISINE].z, ry: -Math.PI / 2, appel: parle ? 0.6 : 0, parle, expr: ["doute", 0.6] }], ...petitsVoisins.map((q, i) => [q, { x: portes[PORTE_VOISINE].x - 0.1, z: portes[PORTE_VOISINE].z - 0.25 + i * 0.5, ry: -Math.PI / 2, expr: ["tristesse", 0.5] }])];
scene("frontiere", {
  dessin(t) {
    const t0 = S("frontiere"), tv = S("voisine"), t2 = S("frontiere2"), tm = mot("frontiere", "lait", 9) - 0.3;
    const gauche = { cam: RUE_G, mise: t => miseRue(t, { roles: FRANCE_RUE(t) }) }, droite = { cam: RUE_D, mise: t => miseRue(t, { allemagne: true, porteOuverte: PORTE_VOISINE, roles: ALLEMAGNE_RUE(t) }) };
    if (t < tv - 0.15 || t >= t2 - 0.15) {
      deuxPays(t, gauche, droite);
      pluie(t, t0, { sol: 1100, x0: 0, x1: W / 2 - 4 }); pluie(t, t0, { sol: 1100, x0: W / 2 + 4, x1: W, traces: true });
      bouteilleBarree(800, 1180, 60, sort(t, tm, 0.5) * (1 - va(t, tv - 0.5, 0.3)) + (t > t2 ? sort(t, t2, 0.5) : 0));
    } else {
      const pv = portes[PORTE_VOISINE];
      filmer(t, [P(tv - 0.15, glisse({ pos: [pv.x - 2.6, 1.55, pv.z + 1.3], cible: [pv.x - 0.45, 1.45, pv.z], fov: 38 }, { pos: [pv.x - 2.3, 1.55, pv.z + 1.1], cible: [pv.x - 0.45, 1.45, pv.z], fov: 38 }),
        t => miseRue(t, { allemagne: true, porteOuverte: PORTE_VOISINE, roles: ALLEMAGNE_RUE(t, bouche("voisine", t)) }), t => pluie(t, t0, { sol: 1250 }))], t2);
    }
  },
  texte(t) {
    const t0 = S("frontiere"), tv = S("voisine"), t2 = S("frontiere2"), tm = mot("frontiere", "lait", 9) - 0.3, tl = mot("frontiere", "légumes", 11) - 0.3;
    const split = t < tv - 0.15 || t >= t2 - 0.15;
    if (split) {
      texte("FRANCE", W / 4 + 20, 380, 60, t, t0 + 0.1);
      texte("ALLEMAGNE", 730, 380, ajuste("ALLEMAGNE", 60, 380), t, t0 + 0.3);
      texte("LAIT FRAIS", 730, 1290, ajuste("LAIT FRAIS", 56, 380), t, tm, { fin: tv - 0.4 });
      texte("DÉCONSEILLÉ", 730, 1360, ajuste("DÉCONSEILLÉ", 56, 380), t, tl, { fin: tv - 0.4 });
    }
    texte("MÊME PLUIE", W / 4 + 20, 1260, ajuste("MÊME PLUIE", 54, 400), t, mot("frontiere2", "pluie", 0.5) - 0.3);
    texte("MÊME VENT", 730, 1260, ajuste("MÊME VENT", 54, 380), t, mot("frontiere2", "vent", 1.2) - 0.3);
    texte("DEUX VÉRITÉS", CX, 500, ajuste("DEUX VÉRITÉS", 96), t, mot("frontiere2", "vérités", 2.6) - 0.4, { couleur: ACC });
  },
});

// ---------------------------------------------------------------- the teleprinters: "légère hausse… non significative", then "totalement épargné"
const TELEX1 = ["SCPRI — COMMUNIQUÉ", "LÉGÈRE HAUSSE", "DE LA RADIOACTIVITÉ", "NON SIGNIFICATIVE", "POUR LA SANTÉ"], TELEX2 = ["6 MAI 1986", "LE TERRITOIRE", "FRANÇAIS A ÉTÉ", "TOTALEMENT", "ÉPARGNÉ"];
function feuille(t, lignes, t0, cps, o = {}) {   // a sheet of teleprinter paper, lines typed one after the other
  const x0 = 110, x1 = 910, y0 = o.y0 ?? 330, pas = 92;
  const n = lignes.length, h = 120 + n * pas, monte = o.monte ?? 0;
  ctx.save(); ctx.translate(0, -monte);
  ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(x0 + 14, y0 + 16, x1 - x0, h);
  ctx.fillStyle = "#E2DED2"; ctx.fillRect(x0, y0, x1 - x0, h);
  ctx.fillStyle = "rgba(0,0,0,.06)"; for (let y = y0 + 20; y < y0 + h; y += 18) ctx.fillRect(x0, y, x1 - x0, 1);
  ctx.fillStyle = "rgba(0,0,0,.12)"; for (let y = y0 + 14; y < y0 + h; y += 36) { ctx.beginPath(); ctx.arc(x0 + 26, y, 7, 0, TAU); ctx.arc(x1 - 26, y, 7, 0, TAU); ctx.fill(); }
  ctx.restore();
  return { x0, y0: y0 - monte, pas };
}
scene("telex", {
  dessin(t) {
    const t0 = S("telex"), tc = mot("telex", "communiqué", 4) - 0.6, t6 = mot("telex", "six", 13) - 0.4;
    if (t < tc) {
      filmer(t, [P(-1, glisse({ pos: [1.4, 1.75, 0.8], cible: [-0.2, 1.0, -1.7], fov: 46 }, { pos: [0.9, 1.6, 0.0], cible: [-0.2, 1.05, -1.7], fov: 44 }), t => { miseBureau(t, { papier: prog(t, t0, tc) }); ecritPapier(14, Math.floor((t - t0) * 3)); })], tc);
      return;
    }
    fondNoir();
    const deux = t >= t6;
    const f = feuille(t, deux ? TELEX2 : TELEX1, deux ? t6 : tc, 18, { monte: deux ? 0 : 0 });
    if (!deux) {   // the line picked out
      const k = va(t, mot("telex", "hausse", 7) - 0.1, 0.6);
      if (k > 0) { ctx.save(); ctx.fillStyle = "rgba(20,24,22,.16)"; ctx.fillRect(f.x0 + 40, f.y0 + 160, (f.x1 ?? 910) - f.x0 - 80, f.pas * 3 * k - 10); ctx.restore(); }
    }
  },
  texte(t) {
    const t0 = S("telex"), tc = mot("telex", "communiqué", 4) - 0.6, t6 = mot("telex", "six", 13) - 0.4, te = mot("telex", "totalement", 17) - 0.5;
    if (t < tc) {
      texte("LES AUTORITÉS", CX, 400, ajuste("LES AUTORITÉS", 90), t, t0 + 0.05);
      texte("SAVENT", CX, 510, 110, t, mot("telex", "savent", 2) - 0.3, { couleur: BLANC });
      return;
    }
    const deux = t >= t6, L = deux ? TELEX2 : TELEX1, d0 = deux ? t6 : tc, y0 = 330 + 90;
    let tt = d0 + 0.2;
    L.forEach((l, i) => {
      const n = Math.floor(clamp((t - tt) * 22, 0, l.length)), gros = deux && i >= 3 ? lerp(1, 1.5, va(t, te + (i - 3) * 0.25, 0.8)) : 1;
      const taille = Math.min(ajuste(l, i === 0 ? 50 : 66, 740) * gros, ajuste(l, 140, 740));
      if (n > 0) ecrire(l.slice(0, n), 160, y0 + i * 92 + (deux && i >= 3 ? (i - 3) * 30 * (gros - 1) / 0.5 : 0), taille, { align: "left", couleur: "#141614", contour: false, alpha: i === 0 ? 0.65 : 1 });
      tt += l.length / 22 + 0.25;
    });
    texte("AUCUNE CONSIGNE", CX, 1300, ajuste("AUCUNE CONSIGNE", 70), t, mot("telex", "Aucune", 10) - 0.2, { fin: t6 - 0.3 });
    texte("AUCUNE PRÉCAUTION", CX, 1390, ajuste("AUCUNE PRÉCAUTION", 64), t, mot("telex", "précaution", 11) - 0.3, { fin: t6 - 0.3 });
  },
});
const TELEX_SONS = () => { const tc = mot("telex", "communiqué", 4) - 0.6, t6 = mot("telex", "six", 13) - 0.4; let tt = tc + 0.2; for (const l of TELEX1) { sfx(tt, "telex", { dur: +(l.length / 22).toFixed(2), gain: 0.22 }); tt += l.length / 22 + 0.25; } tt = t6 + 0.2; for (const l of TELEX2) { sfx(tt, "telex", { dur: +(l.length / 22).toFixed(2), gain: 0.22 }); tt += l.length / 22 + 0.25; } sfx(S("telex") + 0.4, "telex", { dur: 3.0, gain: 0.14 }); };

// ---------------------------------------------------------------- 10 May: the maps at last
scene("aveu", {
  dessin(t) {
    const t0 = S("aveu"), tc = mot("aveu", "cartes", 6) - 0.9, t1 = S("mere3"), t2 = S("pere2");
    const mise = t => miseSalon(t, { tv: "aveu", nuit: 0.15, feuTv: 4, roles: {
      pere: { ...TABLE.pere, parle: bouche("pere2", t), expr: ["tristesse", va(t, t2 - 0.3, 0.5)], tete: 0.6 * va(t, t1 + 0.6, 0.5) },
      mere: { ...TABLE.mere, parle: bouche("mere3", t), expr: ["choc", va(t, tc + 0.8, 0.5) * 0.8], tete: -0.6 * va(t, t1, 0.5) * (1 - va(t, E("pere2") - 0.5, 0.5)) },
      enfant: { ...TABLE.enfant, expr: ["doute", 0.5] },
    } });
    filmer(t, [
      P(-1, glisse({ pos: [0.2, 1.75, 5.5], cible: [0, 0.85, -2.6], fov: 46 }, { pos: [0.15, 1.6, 4.9], cible: [0, 0.85, -2.6], fov: 44 }), mise),
      P(tc, glisse({ pos: [-0.02, 0.9, -1.35], cible: [-0.02, 0.88, -2.36], fov: 42 }, ECRAN), mise),
      P(t1 - 0.2, glisse({ pos: [0.85, 1.12, 3.55], cible: [0.45, 1.08, 4.8], fov: 36 }, { pos: [0.8, 1.12, 3.7], cible: [0.45, 1.08, 4.8], fov: 36 }), mise),
      P(t2 - 0.2, glisse({ pos: [-0.85, 1.15, 3.55], cible: [-0.45, 1.1, 4.8], fov: 36 }, { pos: [-0.8, 1.15, 3.7], cible: [-0.45, 1.1, 4.8], fov: 36 }), mise),
    ], E("pere2"));
  },
  texte(t) {
    const t0 = S("aveu"), tc = mot("aveu", "cartes", 6) - 0.9, t1 = S("mere3");
    texte("10 MAI", CX, 400, 130, t, t0 + 0.05, { fin: tc - 0.3 });
    texte("LES CARTES, ENFIN", CX, 1300, ajuste("LES CARTES, ENFIN", 72), t, tc - 0.3, { fin: mot("aveu", "passé", 8) - 0.4 });
    texte("PRESQUE TOUTE", CX, 1260, ajuste("PRESQUE TOUTE", 80), t, mot("aveu", "Presque", 10) - 0.3, { fin: t1 - 0.3 });
    texte("LA FRANCE", CX, 1350, 80, t, mot("aveu", "Presque", 10) - 0.1, { couleur: ACC, fin: t1 - 0.3 });
  },
});
const UNES = [{ titre: "LE QUOTIDIEN", une: "MENSONGE", x: 290, r: -0.1 }, { titre: "LA GAZETTE", une: "ILS SAVAIENT", x: 590, r: 0.08 }, { titre: "L'ÉCHO", une: "MENSONGE", x: 440, r: 0.03 }];
scene("aveu2", {
  dessin(t) {
    const t0 = S("aveu2"), tt = mot("aveu2", "trop", 4) - 0.3;
    grandeCarte(t, vue(30, 260, 1020, 1400, 2.5, 46.6, 115), 10 + (t - t0) * 0.6, { taille: 12, depart: va(t, tt, 4.5), alpha: 0.6 });
  },
  texte(t) {
    const t0 = S("aveu2"), tt = mot("aveu2", "trop", 4) - 0.3;
    UNES.forEach((u, i) => {
      const k = sort(t, t0 + 0.2 + i * 0.9, 0.8) * (1 - va(t, tt - 0.4, 0.5)); if (k <= 0.02) return;
      ctx.save(); ctx.translate(u.x + 40, lerp(-500, 820 + i * 60, k)); ctx.rotate(u.r * k);
      ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(-250, -320, 520, 700);
      ctx.fillStyle = "#DCD8CC"; ctx.fillRect(-270, -340, 520, 700);
      ctx.fillStyle = "#1A1C1A"; ctx.fillRect(-240, -250, 460, 4); ctx.fillRect(-240, -100, 460, 3);
      for (let l = 0; l < 9; l++) ctx.fillRect(-240, 30 + l * 32, l % 3 === 2 ? 260 : 460, 10);
      const lu = clamp((k - 0.75) / 0.25);   // the headlines read once the page has landed
      ecrire(u.titre, -20, -290, 48, { couleur: "#1A1C1A", contour: false, espace: 4, alpha: lu });
      ecrire(u.une, -20, -175, ajuste(u.une, 96, 440), { couleur: "#0A0A0A", contour: false, alpha: lu });
      ctx.restore();
    });
    texte("TROP TARD", CX, 420, 130, t, tt);
    texte("LE NUAGE EST REPARTI", CX, 1300, ajuste("LE NUAGE EST REPARTI", 64), t, mot("aveu2", "reparti", 6) - 0.4, { alpha: 0.9 });
  },
});

// ---------------------------------------------------------------- the years: complaints, the case, the dismissal
const FRANCE_V = () => vue(40, 300, 1000, 1250, 2.6, 46.4, 112);
function taches(V, k, a = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.fillStyle = ACC;
  TACHES.forEach(([lo, la, s, ph], i) => { const u = clamp(k * 1.4 - ph * 0.4); if (u <= 0) return; const [x, y] = V.p([lo, la]); ctx.globalAlpha = a * 0.5 * u; ctx.beginPath(); ctx.arc(x, y, 10 * s * u, 0, TAU); ctx.fill(); });
  ctx.restore();
}
const ANNEES = () => [[S("annees"), 1986], [mot("annees", "2001", 1.5) - 0.5, 2001], [mot("justice", "2006", 0.2) - 0.4, 2006], [mot("justice", "2011", 4) - 0.4, 2011], [mot("justice", "malades", 14) - 0.5, 2012]];
const annee = t => { let a = ANNEES()[0][1]; for (const [ti, y] of ANNEES()) if (t >= ti) a = y; return a; };
scene("annees", {
  dessin(t) {
    const t0 = S("annees"), V = FRANCE_V();
    fondCarte(ctx, V, { trait: 2.4, france: "#34403A" });
    taches(V, va(t, t0 + 0.4, E("annees") - t0 - 0.8));
  },
  texte(t) {
    const t0 = S("annees"), t1 = mot("annees", "2001", 1.5) - 0.5;
    const k = va(t, t1, 0.9), y = Math.round(lerp(1986, 2001, k));
    texte(String(y), CX, 420, 170, t, t0 + 0.05);
    texte("TU GRANDIS", CX, 545, 64, t, t0 + 0.1, { alpha: 0.75, fin: t1 + 0.3 });
    texte("PLAINTES", CX, 545, 76, t, mot("annees", "plainte", 4) - 0.3);
    texte("UNE GLANDE DANS LE COU", CX, 1210, ajuste("UNE GLANDE DANS LE COU", 52), t, mot("annees", "glande", 3.5) - 0.3, { alpha: 0.8 });
    texte("MALADES DE LA THYROÏDE", CX, 1300, ajuste("MALADES DE LA THYROÏDE", 60), t, mot("annees", "thyroïde", 3) - 0.6);
    texte("DES CENTAINES", CX, 1390, ajuste("DES CENTAINES", 72), t, mot("annees", "centaines", 6) - 0.4, { couleur: ACC });
  },
});
scene("malade", {
  dessin(t) {
    const t0 = S("malade");
    filmer(t, [P(-1, glisse({ pos: [0.45, 1.55, -0.2], cible: [-0.7, 1.5, -2.0], fov: 30 }, { pos: [0.35, 1.55, -0.45], cible: [-0.7, 1.5, -2.0], fov: 30 }),
      t => miseTribunal(t, { juges: false, malade: { x: -0.7, z: -2.0, ry: 0.58, parle: bouche("malade", t), expr: ["tristesse", 0.7], regard: [0.2, 0] } }))], E("malade"));
  },
  texte(t) {
    texte("2001", CX, 400, 110, t, S("malade") + 0.05, { alpha: 0.8 });
    texte("PLAIGNANTE", CX, 500, 56, t, S("malade") + 0.3, { alpha: 0.65 });
  },
});
scene("justice", {
  dessin(t) {
    const t0 = S("justice"), tn = mot("justice", "non-lieu", 6) - 0.25, tq = mot("justice", "personne", 18) - 0.6, tm = mot("justice", "malades", 14) - 0.5;
    const coup = va(t, tn - 0.6, 0.35) * (1 - va(t, tn - 0.2, 0.2));
    const mise = (o = {}) => t => miseTribunal(t, { maillet: coup, ...o });
    filmer(t, [
      P(-1, glisse({ pos: [0.3, 2.4, 6.8], cible: [0, 1.4, -6.5], fov: 50 }, { pos: [0.2, 2.2, 5.4], cible: [0, 1.4, -6.5], fov: 50 }), mise()),
      P(tn - 1.0, glisse({ pos: [0.6, 1.85, -4.3], cible: [0.25, 1.55, -5.6], fov: 36 }, { pos: [0.55, 1.8, -4.45], cible: [0.25, 1.55, -5.6], fov: 36 }), mise()),
      P(tn + 1.6, glisse({ pos: [0.2, 2.3, 4.0], cible: [0, 1.4, -6.5], fov: 48 }, { pos: [0.2, 2.25, 3.4], cible: [0, 1.4, -6.5], fov: 48 }), mise()),
      P(tm, glisse({ pos: [-0.6, 1.25, -1.9], cible: [-0.6, 1.0, -0.42], fov: 46 }, { pos: [-0.3, 1.25, -1.9], cible: [-0.3, 1.0, -0.42], fov: 46 }), mise({ juges: true })),
      P(tq, glisse({ pos: [0, 2.0, 7.5], cible: [0, 1.2, -6.5], fov: 50 }, { pos: [0, 1.9, 6.6], cible: [0, 1.2, -6.5], fov: 50 }), mise({ vide: true, juges: false })),
    ], E("justice"));
  },
  texte(t) {
    const t0 = S("justice"), t11 = mot("justice", "2011", 4) - 0.4, tn = mot("justice", "non-lieu", 6) - 0.25, ti = mot("justice", "Impossible", 7) - 0.3, tm = mot("justice", "malades", 14) - 0.5, tq = mot("justice", "personne", 18) - 0.6, t12 = mot("justice", "malades", 14) - 0.5;
    const y = annee(t);
    texte(String(y), CX, 400, 130, t, t0 + 0.05, { fin: tq - 0.3 });
    if (y === 2006) texte("MIS EN EXAMEN", CX, 510, ajuste("MIS EN EXAMEN", 72), t, mot("justice", "examen", 2) - 0.4);
    texte("PAS DE PROCÈS", CX, 1290, ajuste("PAS DE PROCÈS", 84), t, mot("justice", "procès", 5) - 0.3, { fin: ti - 0.3 });
    texte("NON-LIEU", CX, 530, 110, t, tn, { fin: tm - 0.8, couleur: ACC });
    if (y === 2012) texte("NON-LIEU CONFIRMÉ", CX, 510, ajuste("NON-LIEU CONFIRMÉ", 64), t, t12, { fin: tq - 0.3, alpha: 0.85 });
    texte("LIEN CERTAIN ?", CX, 1260, ajuste("LIEN CERTAIN ?", 80), t, ti, { fin: tm - 0.3 });
    texte("IMPOSSIBLE À PROUVER", CX, 1350, ajuste("IMPOSSIBLE À PROUVER", 60), t, ti + 0.4, { fin: tm - 0.3, alpha: 0.85 });
    texte("QUI A RAISON ?", CX, 450, ajuste("QUI A RAISON ?", 100), t, tq + 0.3);
  },
});

// ---------------------------------------------------------------- the end: the cloud goes through the STOP sign; the sign, alone, goes out
const ECRAN_V = () => vue(90, 600, 900, 860, 3.0, 47.0, 84);
function cadreTV(t, k, eteint = 0) {   // the frame of the set around the full-screen map, and its switch-off (no flash)
  ctx.save(); ctx.globalAlpha = k;
  const X = 90, Y = 600, L = 900, Hh = 860;
  ctx.strokeStyle = "#2E322F"; ctx.lineWidth = 40; ctx.beginPath(); ctx.roundRect(X - 20, Y - 20, L + 40, Hh + 40, 70); ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,.35)"; for (let y = Y; y < Y + Hh; y += 5) ctx.fillRect(X, y, L, 2);
  if (eteint > 0) {   // the picture shrinks to a line, then to a dot, and fades: the old way a tube went off
    const h = lerp(Hh, 6, clamp(eteint * 2)), w = lerp(L, 8, clamp(eteint * 2 - 1));
    ctx.fillStyle = "#050506"; ctx.fillRect(X, Y, L, (Hh - h) / 2); ctx.fillRect(X, Y + (Hh + h) / 2, L, (Hh - h) / 2);
    ctx.fillRect(X, Y, (L - w) / 2, Hh); ctx.fillRect(X + (L + w) / 2, Y, (L - w) / 2, Hh);
  }
  ctx.restore();
}
scene("chute", {
  dessin(t) {
    const t0 = S("chute"), tc = mot("chute", "jamais", 11) - 0.8, tr = EP.T.reveals[1], V = ECRAN_V();
    const d = 4.3 + 1.6 * va(t, t0 + 1, tc - t0 + 2), seul = va(t, tr - 0.2, 1.2), off = prog(t, tr + 2.4, E("chute") - 0.3);
    fondCarte(ctx, V, { trait: 2.4, alpha: 1 - seul * 0.85 });
    dessinerNuage(ctx, V, d, { taille: 11, alpha: 0.42 * (1 - seul) });
    const [sx, sy] = V.p(LIEUX.stop); panneauStop(ctx, sx - 10, sy - 36, 58, { alpha: 1 - 0.15 * seul });
    cadreTV(t, 1, easeInOut(off));
  },
  texte(t) {
    const t0 = S("chute"), t1 = mot("chute", "panneau", 3) - 0.3, t2 = mot("chute", "communiqué", 5) - 0.4, t3 = mot("chute", "dix", 7) - 0.3, tc = mot("chute", "jamais", 11) - 0.8, tr = EP.T.reveals[1];
    texte("D'OÙ VIENT", CX, 390, 84, t, t0 + 0.05, { fin: t1 - 0.25 });
    texte("CETTE PHRASE ?", CX, 480, ajuste("CETTE PHRASE ?", 72), t, t0 + 0.25, { fin: t1 - 0.25 });
    texte("UN PANNEAU STOP", CX, 430, ajuste("UN PANNEAU STOP", 76), t, t1, { fin: t2 - 0.25 });
    texte("UN COMMUNIQUÉ DE TROP", CX, 430, ajuste("UN COMMUNIQUÉ DE TROP", 76), t, t2, { fin: t3 - 0.25 });
    texte("10 JOURS DE SILENCE", CX, 430, ajuste("10 JOURS DE SILENCE", 76), t, t3, { fin: tc - 0.25 });
    texte("C'EST L'INFORMATION", CX, 390, ajuste("C'EST L'INFORMATION", 76), t, tr + 0.2);
    texte("QUI S'Y EST ARRÊTÉE.", CX, 480, ajuste("QUI S'Y EST ARRÊTÉE.", 72), t, mot("chute", "arrêtée", 14) - 0.5, { couleur: ACC });
  },
});
scene("fin", {
  dessin(t) {
    const t0 = S("fin");
    filmer(t, [P(-1, glisse({ pos: [0.25, 1.25, -1.5], cible: [0, 0.95, 1.5], fov: 46 }, { pos: [0.15, 1.2, -1.1], cible: [0, 0.95, 1.5], fov: 46 }),
      t => miseSalon(t, { tv: "off", nuit: 0.4, roles: { vieuxPere: { ...CANAPE.pere, x: -0.35, regard: [0.3, 0.1] }, vieilleMere: { ...CANAPE.mere, x: 0.35, regard: [-0.3, 0.1], expr: ["tristesse", 0.3] } } }))], EP.DUREE);
  },
  texte(t) {
    const t0 = S("fin"), tq = phrase("fin", 1).end + 0.3;
    texte("DEMANDE-LEUR", CX, 420, ajuste("DEMANDE-LEUR", 110), t, mot("fin", "Demande", 4) - 0.2, { fin: tq - 0.2 });
    texte("ET TOI,", CX, 400, 130, t, tq);
    texte("TU L'AURAIS CRU ?", CX, 540, ajuste("TU L'AURAIS CRU ?", 92), t, tq + 0.4, { couleur: ACC });
  },
});

// ---------------------------------------------------------------- interface: the log-book date, the radar inset, the scan lines
const HORS_RADAR = new Set(["hook", "explosion", "moscou", "suede2", "aveu2", "annees", "chute"]);
function dateDe(t, id) {
  const sp = (a, b, w) => (t < mot(a, w, 1) - 0.2 ? null : b);
  switch (decorDe(id)) {
    case "hook": return null;
    case "explosion": case "chambre": return "26 AVRIL — 01:23";
    case "moscou": return t < S("moscou") + 2.2 ? "26 AVRIL" : "27 AVRIL";
    case "suede": return "28 AVRIL — MATIN";
    case "suede2": return t < mot("suede2", "soir", 6) - 0.3 ? "28 AVRIL — MATIN" : "28 AVRIL — SOIR";
    case "meteo": case "entree": return "30 AVRIL — 20:00";
    case "mai": return "1ER MAI";
    case "mai2": return "1ER MAI — SOIR";
    case "frontiere": return "1ER MAI";
    case "telex": return t < mot("telex", "six", 13) - 0.4 ? "FIN AVRIL" : "6 MAI";
    case "aveu": case "aveu2": return "10 MAI";
    case "annees": return t < mot("annees", "2001", 1.5) - 0.5 ? "1986" : "2001";
    case "malade": return "2001";
    case "justice": return String(annee(t));
    case "chute": return "30 AVRIL 1986";
    case "fin": return "AUJOURD'HUI";
  }
  return null;
}
const segA = t => { const i = EP.ORDRE.findIndex(id => t < EP.SEG[id].next); return EP.ORDRE[i < 0 ? EP.ORDRE.length - 1 : i]; };
function journal(t) {   // the date, and the previous one rolling away for 0.45 s after it changes (no state: frames come in any order)
  const s = dateDe(t, segA(t));
  let avant = null, tc = -9;
  for (let k = 1; k <= 10; k++) { const u = t - k * 0.05, x = u < 0 ? null : dateDe(u, segA(u)); if (x !== s) { avant = x; tc = t - (k - 0.5) * 0.05; break; } }
  const p = sort(t, tc, 0.45);
  if (avant && p < 1) ecrire(avant, ZONE.x0, 176 - 22 * p, TAILLE_MIN, { align: "left", alpha: 0.85 * (1 - p) });
  if (s) ecrire(s, ZONE.x0, 176 + 22 * (1 - p), TAILLE_MIN, { align: "left", alpha: 0.85 * (avant ? p : 1) });
}
// the story date of the cloud (days after 26 April 01:23) at time t, for the radar inset
function jourNuage(t) {
  const K = [[S("chambre"), 0.25], [E("moscou"), 2.0], [S("suede"), 2.1], [E("suede2"), 2.7], [S("meteo"), 4.6], [E("mere1"), 4.7], [E("entree"), 5.0], [S("mai"), 5.1], [E("frontiere2"), 5.9], [S("telex"), 6.0], [E("telex"), 10.4], [S("aveu"), 14.2], [E("aveu2"), 16], [S("annees"), 20]];
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (t - K[i - 1][0]) / Math.max(0.01, K[i][0] - K[i - 1][0]));
  return 20;
}
const RADAR = { x: 640, y: 140, w: 290, h: 200 };
function radar(t, id) {
  const voir = u => (!HORS_RADAR.has(decorDe(segA(u))) && u < EP.DUREE - 6 ? 1 : 0);
  let a = 0; for (let k = 0; k < 6; k++) a += voir(t - k * 0.08) / 6;
  a = easeInOut(a);
  if (a < 0.02) return;
  const { x, y, w, h } = RADAR, V = vue(x, y, w, h, 12.5, 52.5, 9.6), d = jourNuage(t);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.beginPath(); ctx.roundRect(x - 6, y - 6, w + 12, h + 12, 18); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.clip();
  fondCarte(ctx, V, { trait: 1.1, alpha: 0.95 });
  if (d < 19) dessinerNuage(ctx, V, d, { part: 2, taille: 2.6, alpha: 0.6 });
  else { ctx.fillStyle = ACC; TACHES.forEach(([lo, la, s]) => { const [px, py] = V.p([lo, la]); ctx.globalAlpha = a * 0.5; ctx.fillRect(px - 1, py - 1, 2.5 * s, 2.5 * s); }); ctx.globalAlpha = a; }
  ctx.fillStyle = "rgba(0,0,0,.25)"; for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
  ctx.restore();
  ctx.strokeStyle = "rgba(154,165,154,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.stroke();
  ctx.restore();
}
let LIGNES = null;
function balayage(t) {   // the scan lines of a cathode-ray tube over the picture, and a slow faint rolling band
  if (!LIGNES) { LIGNES = document.createElement("canvas"); LIGNES.width = W; LIGNES.height = H; const x = LIGNES.getContext("2d"); x.fillStyle = "rgba(0,0,0,1)"; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 1.5); }
  ctx.save(); ctx.globalAlpha = 0.16; ctx.drawImage(LIGNES, 0, 0);
  const yb = ((t * 90) % (H + 400)) - 200, g = ctx.createLinearGradient(0, yb - 160, 0, yb + 160); g.addColorStop(0, "rgba(220,230,220,0)"); g.addColorStop(0.5, "rgba(220,230,220,.035)"); g.addColorStop(1, "rgba(220,230,220,0)");
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, yb - 160, W, 320);
  ctx.restore();
}

// ---------------------------------------------------------------- sound: the Geiger counter, rain, the living room, the silences
function geiger() {
  const R = [[0, 0.35], [S("explosion"), 0.3], [S("moscou"), 0.6], [S("suede"), 1.2], [mot("suede", "alarmes", 2), 4.5], [E("tech2"), 4.0], [S("suede2"), 1.4], [S("meteo"), 1.6], [E("mere1"), 2.0], [E("entree"), 5.5], [S("mai"), 6.5], [E("mai2"), 6.5], [E("frontiere2"), 4.5], [S("telex"), 3.0], [E("aveu2"), 1.6], [S("annees"), 0.6], [S("chute"), 1.0], [EP.T.reveals[1] - 0.5, 5.0], [EP.T.reveals[1] + 1.5, 0.4], [EP.DUREE, 0.25]];
  const taux = t => { for (let i = 1; i < R.length; i++) if (t <= R[i][0]) return lerp(R[i - 1][1], R[i][1], clamp((t - R[i - 1][0]) / Math.max(0.01, R[i][0] - R[i - 1][0]))); return 0.25; };
  const r = rng(77); let t = 0.8;
  while (t < EP.DUREE - 7) { const k = taux(t); sfx(+t.toFixed(3), "geiger", { gain: 0.16 + 0.05 * r(), pan: (r() - 0.5) * 0.3 }); t += -Math.log(1 - r() * 0.999) / Math.max(0.1, k); }
}
lancer({
  accent: ACC, boite: "#3E4A42", motsCles: ["nuage", "tchernobyl", "radioacti", "frontière", "stop", "lait", "maximum", "épargné", "mensonge", "non-lieu", "silence", "information", "pluie", "particules", "anticyclone"],
  carteMots: 3, carteMax: 15,
  decors: { radio: "explosion", tech1: "suede", tech2: "suede", pere1: "meteo", mere1: "meteo", mere2: "mai", voisine: "frontiere", frontiere2: "frontiere", mere3: "aveu", pere2: "aveu" },
  flou: 2, grain: 0.035,
  mention: [ZONE.x0, 240, "left"],
  mentions: Object.fromEntries(["hook", "explosion", "radio", "chambre", "moscou", "suede", "tech1", "tech2", "suede2", "meteo", "pere1", "mere1", "entree", "mai", "mere2", "mai2", "frontiere", "voisine", "frontiere2", "telex", "aveu", "mere3", "pere2", "aveu2", "annees", "malade", "justice", "chute", "fin"].map(id => [id, ["hook", "explosion", "radio", "moscou", "suede2", "telex", "aveu2", "annees", "chute"].includes(id) ? "ILLUSTRATION" : "RECONSTITUTION"])),
  sources: { titre: "SOURCES", duree: 6, lignes: ["Communiqué du ministère de l'Agriculture, 6 mai 1986.", "Cour d'appel de Paris, non-lieu, 7 septembre 2011 ; Cour de cassation, 20 novembre 2012.", "Wikipédia, « Conséquences de la catastrophe de Tchernobyl en France ».", "Famille et dialogues inventés. Voix de synthèse."] },
  surcouche: balayage,
  interface(t, id) { journal(t); radar(t, id); },
  musique: () => ({ style: "dark", root: 34, room: true }),
  silences: () => [[phrase("mere1", 1).end + 0.08, phrase("entree", 0).start - 0.08, 1.2], [EP.SEG.chute.sentences[EP.SEG.chute.sentences.length - 1].end + 0.08, phrase("fin", 0).start - 0.08, 1.5]],
  sons() {
    EP.ORDRE.forEach((id, i) => { if (i && decorDe(id) !== decorDe(EP.ORDRE[i - 1])) sfx(S(id) - 0.25, "swish", { gain: 0.1 }); });
    geiger();
    sfx(S("mai") - 0.3, "pluie", { dur: +(E("mere2") - S("mai") + 0.6).toFixed(2), gain: 0.5 });
    sfx(S("mai2"), "pluie", { dur: +(E("mai2") - S("mai2")).toFixed(2), gain: 0.18 });
    sfx(S("frontiere") - 0.3, "pluie", { dur: +(E("frontiere2") - S("frontiere") + 0.6).toFixed(2), gain: 0.5 });
    sfx(S("meteo") - 0.2, "salon", { dur: +(phrase("mere1", 1).end - S("meteo") + 0.3).toFixed(2), gain: 0.55 });
    sfx(S("aveu"), "salon", { dur: +(E("pere2") - S("aveu")).toFixed(2), gain: 0.5 });
    sfx(S("fin") + 0.2, "salon", { dur: 6, gain: 0.45 });
    sfx(mot("suede", "alarmes", 2) - 0.3, "alarme", { dur: +(E("tech2") - mot("suede", "alarmes", 2)).toFixed(2), gain: 0.2 });
    sfx(mot("justice", "non-lieu", 6) - 0.2, "marteau", { gain: 0.35 });
    sfx(mot("entree", "nuage", 2) - 0.5, "vent", { dur: 6, gain: 0.35 });
    TELEX_SONS();
  },
  voix: { bed: 0.2, duck: 0.65 },
});
