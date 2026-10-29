// Simple 3D props for the Quidams sets, in the same plain style (one colour per part, no textures except text).
// Every function returns a THREE.Group standing on y = 0 (or to be attached to a hand), 1 unit = 1 m.
import * as THREE from "three";

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
function boite(g, m, w, h, d, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
}
function tige(g, m, r, h, x, y, z, rot = [0, 0, 0]) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m);
  c.position.set(x, y, z); c.rotation.set(...rot); c.castShadow = true; g.add(c); return c;
}
function texte(lignes, { w = 512, h = 256, fond = "#F7F5EF", encre = "#2A2C33", police = "MontX" } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = fond; x.fillRect(0, 0, w, h);
  x.fillStyle = encre; x.textAlign = "center"; x.textBaseline = "middle";
  lignes.forEach(([s, size, font], i) => { x.font = `${size}px ${font || police}`; x.fillText(s, w / 2, h * (i + 1) / (lignes.length + 1)); });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Prison bars: w wide, in front of whoever stands behind (z = 0 plane). */
export function barreaux(w = 1.3, h = 2.3) {
  const g = new THREE.Group(), m = mat("#3A3F48", { metalness: 0.6, roughness: 0.35 });
  const n = Math.round(w / 0.16);
  for (let i = 0; i <= n; i++) tige(g, m, 0.018, h, -w / 2 + i * w / n, h / 2, 0);
  for (const y of [0.04, h - 0.04, h * 0.55]) tige(g, m, 0.026, w + 0.06, 0, y, 0, [0, 0, Math.PI / 2]);
  return g;
}
export function table(w = 1.2, d = 0.7, h = 0.74, color = "#B98B5B") {
  const g = new THREE.Group(), m = mat(color);
  boite(g, m, w, 0.05, d, 0, h, 0);
  for (const x of [-w / 2 + 0.06, w / 2 - 0.06]) for (const z of [-d / 2 + 0.06, d / 2 - 0.06]) boite(g, m, 0.05, h, 0.05, x, h / 2, z);
  return g;
}
/** A sheet with two tick boxes and a pen, to lay on a table top (y = table height). */
export function contrat() {
  const g = new THREE.Group();
  const tex = texte([["ACCORD", 64], ["OUI [   ]      NON [   ]", 46, "MontS"], ["signature : ________", 34, "MontS"]], { w: 512, h: 512 });
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.004, 0.46), [mat("#FAFAF7"), mat("#FAFAF7"), mat("#FFFFFF", { map: tex }), mat("#FAFAF7"), mat("#FAFAF7"), mat("#FAFAF7")]);
  f.position.y = 0.003; f.receiveShadow = true; g.add(f);
  tige(g, mat("#2F6FED"), 0.008, 0.16, 0.24, 0.01, 0.05, [Math.PI / 2, 0, 0.6]);
  return g;
}
/** Camp fence: posts every metre with three wires, along x from -w/2 to w/2. */
export function palissade(w = 4, h = 1.9) {
  const g = new THREE.Group(), bois = mat("#6B5A48"), fil = mat("#8C9098", { metalness: 0.5 });
  for (let x = -w / 2; x <= w / 2 + 1e-6; x += 1) tige(g, bois, 0.04, h, x, h / 2, 0);
  for (const y of [0.5, 1.05, 1.6]) tige(g, fil, 0.006, w, 0, y, 0, [0, 0, Math.PI / 2]);
  return g;
}
/** Small glass vial with a coloured liquid, to attach to a hand (articulations.mainD.add(...)). */
export function flacon(color = "#7BD88F") {
  const g = new THREE.Group();
  const verre = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 16), new THREE.MeshStandardMaterial({ color: "#DDEFFF", transparent: true, opacity: 0.45, roughness: 0.1 }));
  const liquide = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), mat(color, { emissive: color, emissiveIntensity: 0.35 }));
  const bouchon = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), mat("#B98B5B"));
  verre.position.y = -0.12; liquide.position.y = -0.16; bouchon.position.y = -0.005;
  g.add(liquide, verre, bouchon);
  return g;
}
/** Hardback book standing up, its cover printed with the title and author. */
export function livre(titre, auteur, couleur = "#8E2B2B") {
  const g = new THREE.Group();
  // the title wraps on its first space when it is too long for the cover
  const lignes = titre.length > 10 && titre.includes(" ") ? [titre.slice(0, titre.lastIndexOf(" ")), titre.slice(titre.lastIndexOf(" ") + 1)] : [titre];
  const tex = texte([...lignes.map(l => [l, 70, "MontX"]), ["", 20], [auteur, 34, "MontS"]], { w: 512, h: 720, fond: couleur, encre: "#F3EBDD" });
  const c = mat(couleur), page = mat("#F2EEE4");
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.12), [page, c, page, page, mat("#FFFFFF", { map: tex }), c]);
  b.position.y = 0.44; b.castShadow = true; g.add(b);
  return g;
}
/** Golden crown, to add to a head (articulations.tete.add(...)). */
export function couronne() {
  const g = new THREE.Group(), or = mat("#E2B53E", { metalness: 0.8, roughness: 0.3 });
  const anneau = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 24, 1, true), or);
  anneau.material.side = THREE.DoubleSide; g.add(anneau);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, p = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 8), or);
    p.position.set(Math.cos(a) * 0.19, 0.095, Math.sin(a) * 0.19); g.add(p);
  }
  g.position.y = 0.3;
  return g;
}
/** Sign on a post: lines = [[text, size, font?], …]. */
export function panneau(lignes, { w = 1.4, h = 0.8, haut = 2.0, fond = "#F7F5EF" } = {}) {
  const g = new THREE.Group();
  const tex = texte(lignes, { w: 640, h: Math.round(640 * h / w), fond });
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), [mat(fond), mat(fond), mat(fond), mat(fond), mat("#FFFFFF", { map: tex }), mat(fond)]);
  p.position.y = haut; p.castShadow = true; g.add(p);
  tige(g, mat("#6B5A48"), 0.035, haut - h / 2, 0, (haut - h / 2) / 2, -0.03);
  return g;
}
