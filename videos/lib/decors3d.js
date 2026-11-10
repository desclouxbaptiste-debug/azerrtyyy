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
  g.name = "table";
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

// ---------------------------------------------------------------- outdoors
/** Fir tree, h metres high. */
export function sapin(h = 2.8, couleur = "#2F5D46") {
  const g = new THREE.Group();
  g.name = "sapin";
  tige(g, mat("#5B4636"), 0.08, h * 0.3, 0, h * 0.15, 0);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.3 - i * 0.065), h * 0.42, 10), mat(couleur));
    c.position.y = h * (0.4 + i * 0.19); c.castShadow = true; g.add(c);
  }
  return g;
}
/** Meadow ground that takes the shadows (the studio floor stays transparent). */
export function pre(taille = 60, couleur = "#8C9566") {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), mat(couleur, { roughness: 0.95 }));
  p.rotation.x = -Math.PI / 2; p.position.y = 0.001; p.receiveShadow = true;
  return p;
}
/** Low rounded hill far away (scale it), fading into the sky by its colour. */
export function colline(couleur = "#7F8E83") {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(couleur, { roughness: 1 }));
  m.scale.set(9, 2.6, 4);
  return m;
}
/** Sheep facing +X: woolly body, dark head and legs. */
export function mouton() {
  const g = new THREE.Group(); g.name = "mouton";
  const laine = mat("#F1EEE6", { roughness: 1 }), noir = mat("#2B2B30");
  for (const [x, y, z, r] of [[0, 0.48, 0, 0.26], [0.18, 0.5, 0.05, 0.2], [-0.18, 0.5, -0.04, 0.21], [0.05, 0.62, 0, 0.2]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), laine); s.position.set(x, y, z); s.castShadow = true; g.add(s);
  }
  const t = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), noir); t.scale.set(1.3, 1, 0.9); t.position.set(0.38, 0.56, 0); g.add(t);
  for (const x of [-0.14, 0.16]) for (const z of [-0.09, 0.09]) tige(g, noir, 0.025, 0.32, x, 0.16, z);
  return g;
}
/** Wolf facing +X, drawn from the animal: deep narrow chest, thin waist, long legs with the hind hock, low bushy
 *  tail, fawn coat with a darker saddle, cream belly, chest and cheeks, and the dark stripe along the back the
 *  witnesses described. About 0.8 m at the shoulder and 1.7 m from nose to tail tip (scale it for a bigger one).
 *  g.animer(t, allure, o) moves it: allure 0 stands (breathing, tail, ears), 1 walks with the wolf's gait (one leg
 *  after the other, hind left, fore left, hind right, fore right); o.d = metres walked, so the paws stay planted on
 *  the ground while the scene moves the group by that much (whatever its scale); o.tete = [yaw, pitch] turns the head.
 *  g.yeux are the two eye meshes and g.lueur their material, whose glow (emissiveIntensity) the scene animates;
 *  g.reperes = { tete, museau, poitrail, dos, ventre, queue } are points on it to point at; g.opacite(a) fades it. */
export const FOULEE_LOUP = 0.7;    // metres walked per gait cycle
const BOULE = new THREE.SphereGeometry(1, 22, 16);
export function loup({ couleur = "#9A6E4C", creme = "#D9C8A8", sombre = "#2A211B", selle = "#86603F", tete: grosse = 1 } = {}) {
  const g = new THREE.Group(); g.name = "loup";
  const m = o => mat(o, { roughness: 0.95 });
  const poil = m(couleur), clair = m(creme), fonce = m(sombre), dos = m(selle), bas = m("#B39373"), oreilleTip = m("#4A3A2E");
  const lueur = new THREE.MeshStandardMaterial({ color: "#A8762C", emissive: "#FFCF6A", emissiveIntensity: 0, roughness: 0.3 });
  const mats = [poil, clair, fonce, dos, bas, oreilleTip, lueur];
  const piv = (parent, x = 0, y = 0, z = 0) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const boule = (parent, mt, [x, y, z], [sx, sy, sz], rot) => {
    const s = new THREE.Mesh(BOULE, mt); s.position.set(x, y, z); s.scale.set(sx, sy, sz);
    if (rot) s.rotation.set(...rot);
    s.castShadow = true; parent.add(s); return s;
  };
  const cone = (parent, mt, r, h, [x, y, z], rot = [0, 0, 0], sz = 1) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mt); c.position.set(x, y, z); c.rotation.set(...rot); c.scale.z = sz;
    c.castShadow = true; parent.add(c); return c;
  };
  // a limb bone hanging from its joint along -Y; returns the joint at its lower end
  const os = (parent, mt, r1, r2, l) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, l, 14), mt); c.position.y = -l / 2; c.castShadow = true; parent.add(c);
    boule(parent, mt, [0, -l, 0], [r2, r2, r2]);
    return piv(parent, 0, -l, 0);
  };

  // ---- body (the trunk bobs and rolls while walking)
  const Y = 0.74, corps = piv(g, 0, Y, 0);
  const thorax = boule(corps, poil, [0.22, 0, 0], [0.34, 0.25, 0.185]);
  boule(corps, dos, [0.1, 0.085, 0], [0.42, 0.18, 0.16]);          // darker saddle over the shoulders
  boule(corps, poil, [-0.18, 0.04, 0], [0.3, 0.17, 0.145]);        // thin waist, belly tucked up
  boule(corps, poil, [-0.42, 0.03, 0], [0.19, 0.19, 0.16]);        // hips
  boule(corps, clair, [0.16, -0.155, 0], [0.26, 0.11, 0.145]);     // cream underside
  boule(corps, clair, [0.5, -0.05, 0], [0.13, 0.2, 0.15]);         // broad cream chest
  boule(corps, poil, [0.47, 0.12, 0], [0.17, 0.2, 0.17]);          // ruff at the base of the neck
  const raie = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    [[0.58, 0.3], [0.4, 0.305], [0.2, 0.27], [0, 0.235], [-0.2, 0.205], [-0.36, 0.215], [-0.58, 0.16]].map(([x, y]) => new THREE.Vector3(x, y, 0))), 48, 0.026, 8), fonce);
  raie.position.y = -0.008; raie.scale.z = 1.4; corps.add(raie);                             // the dark stripe along the back

  // ---- neck and head
  const cou = piv(corps, 0.5, 0.1, 0);
  boule(cou, poil, [0.1, 0.07, 0], [0.17, 0.12, 0.125], [0, 0, 0.6]);
  const tete = piv(cou, 0.21, 0.14, 0); tete.scale.setScalar(grosse);
  boule(tete, poil, [0, 0, 0], [0.135, 0.115, 0.115]);
  for (const s of [-1, 1]) {
    boule(tete, clair, [0.0, -0.055, 0.06 * s], [0.085, 0.048, 0.042], [0, 0, -0.3]);        // pale cheeks
    boule(tete, bas, [-0.07, -0.07, 0.068 * s], [0.06, 0.07, 0.045], [0, 0, 0.5]);           // ruff behind the jaw
    boule(tete, fonce, [0.097, 0.027, 0.059 * s], [0.024, 0.017, 0.022]);                     // dark rim of the eye
    const or = piv(tete, -0.04, 0.08, 0.072 * s); or.rotation.set(0.36 * s, 0, 0.2);
    cone(or, poil, 0.056, 0.125, [0, 0.062, 0], [0, 0, 0], 0.5);
    cone(or, oreilleTip, 0.024, 0.045, [0, 0.112, 0], [0, 0, 0], 0.5);                          // darker ear tips
    or.userData.cote = s;
  }
  boule(tete, poil, [0.09, -0.01, 0], [0.1, 0.075, 0.08]);           // stop between forehead and muzzle
  const museau = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.068, 0.19, 16), poil);
  museau.rotation.z = -Math.PI / 2; museau.position.set(0.17, -0.03, 0); museau.castShadow = true; tete.add(museau);
  boule(tete, poil, [0.262, -0.03, 0], [0.04, 0.037, 0.037]);
  const machoire = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.048, 0.15, 12), clair);
  machoire.rotation.z = -Math.PI / 2; machoire.position.set(0.15, -0.064, 0); tete.add(machoire);
  boule(tete, fonce, [0.29, -0.016, 0], [0.03, 0.026, 0.034]);     // nose
  const yeux = [-1, 1].map(s => boule(tete, lueur, [0.104, 0.028, 0.062 * s], [0.017, 0.013, 0.019]));
  const oreilles = tete.children.filter(c => c.userData.cote);

  // ---- legs: two-bone chains placed by solving for where each paw must be (see marche below)
  const jambes = [];
  for (const s of [-1, 1]) {
    // fore leg: shoulder -> elbow -> wrist, paw folded back while it swings
    const ep = piv(corps, 0.4, -0.1, 0.1 * s);
    boule(ep, poil, [0, -0.06, 0], [0.085, 0.15, 0.065]);
    const coude = os(ep, poil, 0.058, 0.048, 0.22), poignet = os(coude, bas, 0.044, 0.03, 0.39);
    boule(poignet, bas, [0.035, -0.032, 0], [0.065, 0.034, 0.045]);
    boule(poignet, fonce, [0.075, -0.05, 0], [0.025, 0.015, 0.035]);   // toes' pads
    jambes.push({ avant: true, s, h: ep, m: coude, p: poignet, l1: 0.22, l2: 0.39, x0: 0.33, dec: s < 0 ? 0.25 : 0.75 });
    // hind leg: hip -> knee -> hock, then the long foot down to the paw
    const ha = piv(corps, -0.44, -0.02, 0.105 * s);
    boule(ha, poil, [0.04, -0.1, 0], [0.115, 0.19, 0.085]);              // haunch
    const genou = os(ha, poil, 0.07, 0.048, 0.31), jarret = os(genou, poil, 0.045, 0.033, 0.29), pied = os(jarret, bas, 0.031, 0.028, 0.15);
    boule(pied, bas, [0.035, -0.022, 0], [0.062, 0.034, 0.043]);
    boule(pied, fonce, [0.072, -0.04, 0], [0.024, 0.015, 0.033]);
    jambes.push({ avant: false, s, h: ha, m: genou, p: jarret, pied, l1: 0.31, l2: 0.29, x0: -0.44 - 0.04, dec: s < 0 ? 0 : 0.5 });
  }

  // ---- low bushy tail
  const queue = piv(corps, -0.58, 0.13, 0); queue.rotation.z = -0.5;
  boule(queue, poil, [0, -0.14, 0], [0.06, 0.17, 0.062]);
  const queue2 = piv(queue, 0, -0.27, 0); queue2.rotation.z = 0.06;
  boule(queue2, poil, [0, -0.12, 0], [0.082, 0.19, 0.078]);
  boule(queue2, fonce, [0, -0.285, 0], [0.05, 0.08, 0.05]);

  g.yeux = yeux; g.lueur = lueur; g.tete = tete; g.cou = cou;
  g.reperes = { tete: piv(tete, 0.02, 0.13, 0), museau: piv(tete, 0.3, -0.02, 0), poitrail: piv(corps, 0.63, -0.05, 0), dos: piv(corps, -0.05, 0.25, 0), ventre: piv(corps, 0.1, -0.27, 0), queue: piv(queue2, 0, -0.22, 0) };

  // gait: each paw stays planted while the body passes over it (stance, 60 % of the cycle), then swings forward lifted
  const BETA = 0.6, PAS = FOULEE_LOUP * BETA;
  const lisse = v => v * v * (3 - 2 * v);
  function pose(L, a, u) {
    let dx = 0, lev = 0;
    if (a > 0) {
      if (u < BETA) dx = PAS / 2 - PAS * u / BETA;
      else { const v = (u - BETA) / (1 - BETA); dx = -PAS / 2 + PAS * lisse(v); lev = Math.sin(Math.PI * v); }
      dx *= a; lev *= a;
    }
    // paw target in the trunk's frame (the trunk itself bobs: work out where the ground is under the joint)
    const jy = corps.position.y + L.h.position.y, jx = L.h.position.x;
    const fx = L.x0 + dx - jx, fy = -jy + (L.avant ? 0.066 : 0.057) + lev * (L.avant ? 0.1 : 0.085);
    // the hind foot keeps its slope (hock behind the paw), folding back as it swings; the fore paw folds back
    let tx = fx, ty = fy, mu = 0;
    if (!L.avant) { mu = 0.1 - 0.7 * lev; tx = fx - 0.15 * Math.sin(mu); ty = fy + 0.15 * Math.cos(mu); }
    const d = Math.min(L.l1 + L.l2 - 1e-3, Math.max(Math.abs(L.l1 - L.l2) + 1e-3, Math.hypot(tx, ty)));
    const thP = Math.atan2(tx, -ty), al = Math.acos((L.l1 * L.l1 + d * d - L.l2 * L.l2) / (2 * L.l1 * d));
    const th1 = L.avant ? thP - al : thP + al;                    // elbow behind, knee forward
    const jx2 = L.l1 * Math.sin(th1), jy2 = -L.l1 * Math.cos(th1), th2 = Math.atan2(tx - jx2, -(ty - jy2));
    L.h.rotation.z = th1; L.m.rotation.z = th2 - th1;
    if (L.avant) L.p.rotation.z = -th2 - 1.3 * lev;              // paw flat on the ground, folded back in the air
    else { L.p.rotation.z = mu - th2; L.pied.rotation.z = -mu; }
  }
  g.animer = (t, allure = 0, o = {}) => {
    const a = Math.min(1, Math.max(0, allure));
    const cycle = (o.d != null ? o.d / (FOULEE_LOUP * g.scale.x) : t * 1.2), phi = cycle * Math.PI * 2, r = Math.sin(t * 2.2);
    corps.position.y = Y + a * 0.014 * Math.cos(2 * phi) + (1 - a) * 0.004 * r;
    corps.rotation.x = a * 0.03 * Math.sin(phi);
    corps.rotation.z = a * 0.015 * Math.sin(2 * phi + 0.5);
    thorax.scale.y = 0.25 * (1 + 0.025 * r * (1 - 0.6 * a));
    for (const L of jambes) pose(L, a, (((cycle + L.dec) % 1) + 1) % 1);
    const [lacet, tangage] = o.tete || [0, 0];
    cou.rotation.z = -0.1 * a + 0.03 * Math.sin(2 * phi) * a + 0.02 * r * (1 - a) + tangage;
    cou.rotation.y = lacet * 0.4; tete.rotation.y = lacet * 0.6;
    for (const or of oreilles) or.rotation.x = or.userData.cote * (0.28 + 0.05 * Math.max(0, Math.sin(t * 1.3 + or.userData.cote * 2)) ** 8);
    queue.rotation.x = 0.16 * a * Math.sin(phi) + 0.05 * (1 - a) * Math.sin(t * 0.9);
    queue2.rotation.x = 0.16 * a * Math.sin(phi - 0.8) + 0.05 * (1 - a) * Math.sin(t * 0.9 - 0.7);
    return g;
  };
  g.opacite = k => {
    for (const mt of mats) { mt.transparent = k < 1; mt.opacity = k; mt.depthWrite = k > 0.95; }
    g.traverse(o => { if (o.isMesh) o.castShadow = k > 0.55; });
    g.visible = k > 0.005;
  };
  g.animer(0);
  return g;
}
/** Shepherd's stick, to attach to a hand (articulations.mainD.add(...)). */
export function baton(l = 1.3) {
  const g = new THREE.Group();
  tige(g, mat("#7A5A3C"), 0.018, l, 0, -0.1, 0);
  return g;
}
