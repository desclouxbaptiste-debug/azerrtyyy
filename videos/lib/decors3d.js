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

// ---------------------------------------------------------------- village and countryside of the 1760s
// (granite walls and dark stone-slab roofs, as in the Gévaudan; every piece stands on y = 0, 1 unit = 1 m)
const pierre = c => mat(c, { roughness: 0.95, flatShading: true });
function bloc(g, m, w, h, d, x, y0, z, ry = 0) { const b = boite(g, m, w, h, d, x, y0 + h / 2, z); b.rotation.y = ry; return b; }
// a roof prism: base w (across), height h, length l, ridge along X
function toit(g, m, w, h, l, x, y0, z) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false }); geo.translate(0, 0, -l / 2);
  const t = new THREE.Mesh(geo, m); t.rotation.y = Math.PI / 2; t.position.set(x, y0, z); t.castShadow = t.receiveShadow = true; g.add(t); return t;
}
const vitre = nuit => nuit ? mat("#3A2E1E", { emissive: "#FFC874", emissiveIntensity: 1.1 }) : mat("#2D343C", { roughness: 0.25, metalness: 0.3 });
/** Stone house facing +Z: door, shuttered windows (lit from inside at night), slab roof and chimney. */
export function maison({ w = 3.2, d = 2.6, h = 2.3, mur = "#A39A8C", couverture = "#4B5058", volets = "#6B4E3A", nuit = false, etage = false } = {}) {
  const g = new THREE.Group(); g.name = "maison";
  const H = etage ? h + 1.4 : h;
  bloc(g, pierre(mur), w, H, d, 0, 0, 0);
  toit(g, pierre(couverture), d + 0.5, 1.15, w + 0.4, 0, H, 0);
  bloc(g, pierre(mur), 0.42, 1.2, 0.42, w * 0.28, H + 0.3, -d * 0.15);
  bloc(g, mat("#5A3E2B"), 0.8, 1.65, 0.08, -w * 0.22, 0, d / 2 + 0.02);
  const fen = (x, y) => {
    bloc(g, vitre(nuit), 0.6, 0.62, 0.06, x, y, d / 2 + 0.02);
    for (const s of [-1, 1]) bloc(g, mat(volets), 0.3, 0.66, 0.05, x + s * 0.47, y - 0.02, d / 2 + 0.03);
  };
  fen(w * 0.2, 0.95);
  if (etage) { fen(-w * 0.22, 2.45); fen(w * 0.2, 2.45); }
  return g;
}
/** Village church: nave, square bell tower with a pyramid roof and a cross, arched door. */
export function eglise({ mur = "#B3AA9A", couverture = "#454A52" } = {}) {
  const g = new THREE.Group(); g.name = "eglise";
  bloc(g, pierre(mur), 4.2, 3.4, 7, 0, 0, -2.5);
  toit(g, pierre(couverture), 4.8, 1.8, 7.3, 0, 3.4, -2.5).rotation.y = 0;
  bloc(g, pierre(mur), 2.4, 7.2, 2.4, 0, 0, 1.6);
  const fleche = new THREE.Mesh(new THREE.ConeGeometry(1.85, 2.6, 4), pierre(couverture)); fleche.rotation.y = Math.PI / 4; fleche.position.set(0, 8.5, 1.6); fleche.castShadow = true; g.add(fleche);
  bloc(g, mat("#1E2126"), 0.7, 0.9, 0.1, 0, 5.6, 2.82);
  const fer = mat("#2A2C30", { metalness: 0.5 });
  bloc(g, fer, 0.08, 0.9, 0.08, 0, 9.75, 1.6); bloc(g, fer, 0.5, 0.08, 0.08, 0, 10.3, 1.6);
  bloc(g, mat("#4E3626"), 1.1, 1.9, 0.1, 0, 0, 2.82);
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 20, 1, false, 0, Math.PI), mat("#4E3626"));
  arc.rotation.set(Math.PI / 2, 0, -Math.PI / 2); arc.position.set(0, 1.9, 2.82); g.add(arc);
  return g;
}
/** Round village fountain: stone basin with water, a column and a spout. */
export function fontaine() {
  const g = new THREE.Group(); g.name = "fontaine";
  const p = pierre("#9C9486");
  const bassin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.55, 28), p); bassin.position.y = 0.275; bassin.castShadow = bassin.receiveShadow = true; g.add(bassin);
  const eau = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.02, 28), mat("#7FA6B8", { roughness: 0.1, metalness: 0.2 })); eau.position.y = 0.5; g.add(eau);
  tige(g, p, 0.16, 1.4, 0, 0.7, 0);
  const coupe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.2, 20), p); coupe.position.y = 1.45; coupe.castShadow = true; g.add(coupe);
  return g;
}
/** Wash-house: a long stone basin of water under a roof on four posts, laundry on the rim. */
export function lavoir() {
  const g = new THREE.Group(); g.name = "lavoir";
  const p = pierre("#A0988A"), bois = mat("#5E4634");
  bloc(g, p, 3.4, 0.55, 0.2, 0, 0, 0.7); bloc(g, p, 3.4, 0.55, 0.2, 0, 0, -0.7); bloc(g, p, 0.2, 0.55, 1.6, -1.6, 0, 0); bloc(g, p, 0.2, 0.55, 1.6, 1.6, 0, 0);
  bloc(g, mat("#7AA2B2", { roughness: 0.08, metalness: 0.25 }), 3.0, 0.03, 1.2, 0, 0.42, 0);
  for (const x of [-1.9, 1.9]) for (const z of [-1.3, 1.3]) bloc(g, bois, 0.16, 2.5, 0.16, x, 0, z);
  toit(g, pierre("#4E535B"), 3.2, 0.9, 4.4, 0, 2.5, 0);
  ["#F2EFE8", "#D9D2C2", "#C8D4DE"].forEach((c, i) => bloc(g, mat(c, { roughness: 1 }), 0.5, 0.05, 0.35, -1.0 + i * 0.9, 0.55, 0.7));
  return g;
}
/** Low dry-stone wall along X. */
export function muret(l = 4) { const g = new THREE.Group(); g.name = "muret"; bloc(g, pierre("#8F887C"), l, 0.7, 0.45, 0, 0, 0); return g; }
/** Granite boulder (seeded shape). */
export function rocher(s = 1, graine = 1) {
  const g = new THREE.Group(); g.name = "rocher";
  const r = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), pierre("#8E8A82"));
  r.scale.set(s * (0.9 + (graine * 37 % 10) / 25), s * (0.55 + (graine * 53 % 10) / 40), s * (0.8 + (graine * 71 % 10) / 30));
  r.rotation.set(graine * 0.7, graine * 1.3, 0); r.position.y = r.scale.y * 0.6; r.castShadow = r.receiveShadow = true; g.add(r);
  return g;
}
/** Broad-leaved tree: autumn colours, summer green, or bare in winter (feuilles = null). */
export function feuillu(h = 4, feuilles = "#C8742E", graine = 1) {
  const g = new THREE.Group(); g.name = "arbre";
  const ecorce = mat("#5A4636");
  tige(g, ecorce, 0.13, h * 0.55, 0, h * 0.275, 0);
  for (let i = 0; i < 4; i++) {
    const a = graine + i * 1.7, b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, h * 0.35, 8), ecorce);
    b.position.set(Math.cos(a) * 0.25, h * (0.55 + i * 0.05), Math.sin(a) * 0.25); b.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); b.castShadow = true; g.add(b);
  }
  if (feuilles) for (let i = 0; i < 5; i++) {
    const a = graine * 2.1 + i * 1.26, r = h * (0.2 + ((graine + i) * 13 % 5) / 40);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(feuilles, { roughness: 0.9, flatShading: true }));
    f.position.set(Math.cos(a) * h * 0.14 * (i ? 1 : 0), h * (0.72 + (i ? 0.02 * i : 0.12)), Math.sin(a) * h * 0.14 * (i ? 1 : 0)); f.castShadow = true; g.add(f);
  }
  return g;
}
/** Fir tree under snow: the fir with a white cap on every tier. */
export function sapinNeige(h = 2.8) {
  const g = sapin(h, "#2C4F43");
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.3 - i * 0.065) * 0.75, h * 0.22, 10), mat("#F4F6F8", { roughness: 1 }));
    c.position.y = h * (0.52 + i * 0.19); g.add(c);
  }
  return g;
}
/** Field of strips (crops of different colours) on the ground, along X. */
export function champs(w = 12, d = 6, couleurs = ["#B8A85C", "#93A05E", "#C4B46A", "#879A57"]) {
  const g = new THREE.Group();
  const n = couleurs.length * 2;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d / n), mat(couleurs[i % couleurs.length], { roughness: 1 }));
    p.rotation.x = -Math.PI / 2; p.position.set(0, 0.004, -d / 2 + (i + 0.5) * d / n); p.receiveShadow = true; g.add(p);
  }
  return g;
}
/** A strip of ground (path, road, river) along X, w wide. */
export function bande(l = 20, w = 1.6, couleur = "#A8916E", o = {}) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(l, w), mat(couleur, { roughness: 1, ...o }));
  p.rotation.x = -Math.PI / 2; p.position.y = 0.006; p.receiveShadow = true;
  return p;
}
/** Bunting: little coloured flags on a rope from a to b ([x, y, z]). */
export function fanions(a, b, couleurs = ["#C8322B", "#F4F1EA", "#2F5D9A", "#E2B53E"]) {
  const g = new THREE.Group(), A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), n = Math.round(A.distanceTo(B) / 0.45);
  for (let i = 0; i <= n; i++) {
    const p = A.clone().lerp(B, i / n); p.y -= 0.35 * Math.sin(Math.PI * i / n);
    if (i < n) {
      const s = new THREE.Shape(); s.moveTo(-0.14, 0); s.lineTo(0.14, 0); s.lineTo(0, -0.3); s.closePath();
      const f = new THREE.Mesh(new THREE.ShapeGeometry(s), mat(couleurs[i % couleurs.length], { side: THREE.DoubleSide }));
      f.position.copy(p); f.lookAt(p.x, p.y, p.z + 1); g.add(f);
    }
  }
  const corde = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, A.clone().lerp(B, 0.5).setY((A.y + B.y) / 2 - 0.35), B]), 20, 0.01, 4), mat("#3A3A3A"));
  g.add(corde);
  return g;
}

// ---------------------------------------------------------------- interiors
/** A room seen from its open front: floor, back and side walls, ceiling beams (no ceiling, so the light gets in).
 *  fenetres: [[wall "fond"|"gauche"|"droite", position along the wall, height of the sill, width, height]]. */
export function piece({ w = 6, d = 5, h = 3.2, sol = "#7E6550", mur = "#C9BBA3", poutres = "#4A3628", fenetres = [], nuit = false, plancher = true } = {}) {
  const g = new THREE.Group();
  const m = mat(mur, { roughness: 0.95 });
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mat(sol, { roughness: 0.9 })); f.position.y = -0.02; f.receiveShadow = true; g.add(f);
  if (plancher) for (let i = 1; i < Math.round(w / 0.3); i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.052, d), mat("#5E4A3A")); l.position.set(-w / 2 + i * 0.3, -0.02, 0); g.add(l); }
  bloc(g, m, w, h, 0.2, 0, 0, -d / 2); bloc(g, m, 0.2, h, d, -w / 2, 0, 0); bloc(g, m, 0.2, h, d, w / 2, 0, 0);
  for (let z = -d / 2 + 0.6; z < d / 2; z += 1.2) bloc(g, mat(poutres), w, 0.22, 0.2, 0, h - 0.22, z);
  const verre = nuit ? mat("#1C2638", { emissive: "#24304A", emissiveIntensity: 0.6 }) : mat("#DCE7EE", { emissive: "#EAF2F6", emissiveIntensity: 0.85 });
  for (const [mur_, p, y, fw, fh] of fenetres) {
    const fen = new THREE.Group();
    bloc(fen, verre, fw, fh, 0.04, 0, y, 0.11);
    const bois = mat(poutres);
    bloc(fen, bois, fw + 0.14, 0.08, 0.1, 0, y - 0.07, 0.13); bloc(fen, bois, fw + 0.14, 0.08, 0.1, 0, y + fh, 0.13);
    bloc(fen, bois, 0.07, fh, 0.08, 0, y, 0.14); bloc(fen, bois, fw, 0.05, 0.08, 0, y + fh / 2, 0.14);
    if (mur_ === "fond") fen.position.set(p, 0, -d / 2);
    else { fen.position.set(mur_ === "gauche" ? -w / 2 : w / 2, 0, p); fen.rotation.y = mur_ === "gauche" ? Math.PI / 2 : -Math.PI / 2; }
    g.add(fen);
  }
  return g;
}
/** Wooden barrel. */
export function tonneau() {
  const g = new THREE.Group(); g.name = "tonneau";
  const pts = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map(y => new THREE.Vector2(0.3 + 0.07 * Math.sin(Math.PI * y / 0.9), y));
  const c = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), mat("#7B5534")); c.castShadow = c.receiveShadow = true; g.add(c);
  const dessus = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), mat("#6A4A2E")); dessus.rotation.x = -Math.PI / 2; dessus.position.y = 0.9; g.add(dessus);
  for (const y of [0.18, 0.72]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.015, 6, 24), mat("#3A3C40", { metalness: 0.5 })); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  return g;
}
/** Bench, l long, along X. */
export function banc(l = 1.6, couleur = "#6E5038") {
  const g = new THREE.Group(); g.name = "banc";
  const m = mat(couleur);
  bloc(g, m, l, 0.06, 0.32, 0, 0.42, 0);
  for (const x of [-l / 2 + 0.12, l / 2 - 0.12]) bloc(g, m, 0.06, 0.42, 0.28, x, 0, 0);
  return g;
}
/** Shelves full of books against a wall (back at z = 0, facing +Z). */
export function etagere(w = 2, h = 2.4, graine = 1, bois = "#5E4433") {
  const g = new THREE.Group(); g.name = "etagere";
  const m = mat(bois), cols = ["#7A2E2E", "#2E4A6B", "#3D5E3A", "#8C6A2E", "#4A3A5E", "#9A8C70", "#2A2A2A"];
  bloc(g, m, w, h, 0.05, 0, 0, -0.17); bloc(g, m, 0.05, h, 0.38, -w / 2, 0, 0); bloc(g, m, 0.05, h, 0.38, w / 2, 0, 0);
  let a = graine * 9301 + 49297;
  const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  for (let y = 0.05; y < h - 0.3; y += 0.46) {
    bloc(g, m, w, 0.04, 0.38, 0, y, 0);
    for (let x = -w / 2 + 0.06; x < w / 2 - 0.12;) {
      const bw = 0.04 + r() * 0.05, bh = 0.26 + r() * 0.12;
      bloc(g, mat(cols[Math.floor(r() * cols.length)]), bw, bh, 0.26, x + bw / 2, y + 0.04, 0.02);
      x += bw + 0.005;
    }
  }
  return g;
}
/** Wooden hand press of a printing shop (18th century), facing +Z. */
export function presse() {
  const g = new THREE.Group(); g.name = "presse";
  const b = mat("#5C4230"), fer = mat("#3A3C40", { metalness: 0.6, roughness: 0.4 });
  for (const x of [-0.55, 0.55]) bloc(g, b, 0.16, 2.2, 0.2, x, 0, 0);
  bloc(g, b, 1.4, 0.24, 0.26, 0, 2.0, 0); bloc(g, b, 1.26, 0.2, 0.26, 0, 1.45, 0);
  tige(g, fer, 0.05, 0.4, 0, 1.25, 0);
  bloc(g, fer, 0.7, 0.07, 0.5, 0, 1.02, 0.05);
  bloc(g, b, 0.9, 0.1, 1.5, 0, 0.82, 0.4); for (const x of [-0.4, 0.4]) bloc(g, b, 0.08, 0.82, 0.08, x, 0, 1.05);
  bloc(g, mat("#F2EDE0"), 0.5, 0.01, 0.38, 0, 0.93, 0.75);
  const levier = tige(g, fer, 0.025, 0.8, 0.4, 1.3, 0.3, [0, 0.6, Math.PI / 2]);
  levier.rotation.set(0, 0.5, Math.PI / 2);
  return g;
}
/** Printed sheets drying on a line from x0 to x1 at height y (along X). */
export function sechoir(x0 = -2, x1 = 2, y = 2.4, n = 8) {
  const g = new THREE.Group();
  tige(g, mat("#3A3A3A"), 0.008, x1 - x0, (x0 + x1) / 2, y, 0, [0, 0, Math.PI / 2]);
  for (let i = 0; i < n; i++) {
    const tex = texte([["LA BÊTE", 70], ["", 20], ["≡≡≡≡≡≡≡≡", 40, "MontS"], ["≡≡≡≡≡≡≡≡", 40, "MontS"], ["≡≡≡≡≡≡≡≡", 40, "MontS"]], { w: 256, h: 340, fond: "#F2EDE0", encre: "#2A2C33" });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.48), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 1 }));
    f.position.set(x0 + (i + 0.5) * (x1 - x0) / n, y - 0.25, 0); f.rotation.y = (i % 2 - 0.5) * 0.15; g.add(f);
  }
  return g;
}
/** Marble column with base and capital (palace). */
export function colonne(h = 4, couleur = "#E8E2D6", or = "#C9A23E") {
  const g = new THREE.Group(); g.name = "colonne";
  tige(g, mat(couleur, { roughness: 0.35 }), 0.24, h - 0.5, 0, h / 2, 0);
  bloc(g, mat(couleur, { roughness: 0.35 }), 0.7, 0.25, 0.7, 0, 0, 0);
  bloc(g, mat(or, { metalness: 0.7, roughness: 0.3 }), 0.66, 0.25, 0.66, 0, h - 0.25, 0);
  return g;
}
/** Throne on a dais with a red carpet, facing +Z. */
export function trone() {
  const g = new THREE.Group(); g.name = "trone";
  const rouge = mat("#8E1F24", { roughness: 0.7 }), or = mat("#D2A73F", { metalness: 0.8, roughness: 0.3 });
  bloc(g, rouge, 2.6, 0.3, 2.0, 0, 0, 0);
  bloc(g, rouge, 0.8, 0.12, 0.7, 0, 0.75, 0); bloc(g, rouge, 0.8, 1.5, 0.12, 0, 0.75, -0.32);
  bloc(g, or, 0.92, 0.1, 0.16, 0, 2.25, -0.32);
  for (const x of [-0.42, 0.42]) { bloc(g, or, 0.08, 0.95, 0.08, x, 0.3, 0.3); bloc(g, or, 0.08, 1.95, 0.08, x, 0.3, -0.32); bloc(g, or, 0.08, 0.08, 0.66, x, 0.95, 0); }
  const tapis = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6), rouge); tapis.rotation.x = -Math.PI / 2; tapis.position.set(0, 0.01, 4); tapis.receiveShadow = true; g.add(tapis);
  return g;
}
/** Wall panel: a framed mirror (galerie des Glaces), a painting, or a window, w × h, its back on the wall. */
export function cadre(w = 1.2, h = 2, interieur = "miroir") {
  const g = new THREE.Group();
  const or = mat("#C9A23E", { metalness: 0.75, roughness: 0.3 });
  const fond = interieur === "miroir" ? mat("#BFCBD3", { metalness: 0.85, roughness: 0.12, emissive: "#8FA3B3", emissiveIntensity: 0.25 })
    : interieur === "fenetre" ? mat("#DCE7EE", { emissive: "#EAF2F6", emissiveIntensity: 0.85 }) : mat(interieur, { roughness: 0.8 });
  bloc(g, fond, w, h, 0.03, 0, 0, 0.02);
  bloc(g, or, w + 0.16, 0.08, 0.06, 0, -0.08, 0.04); bloc(g, or, w + 0.16, 0.08, 0.06, 0, h, 0.04);
  bloc(g, or, 0.08, h, 0.06, -w / 2 - 0.04, 0, 0.04); bloc(g, or, 0.08, h, 0.06, w / 2 + 0.04, 0, 0.04);
  return g;
}
/** Small round café table. */
export function gueridon(r = 0.4, couleur = "#6B4A33") {
  const g = new THREE.Group(); g.name = "table";
  const m = mat(couleur);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 24), m); p.position.y = 0.74; p.castShadow = p.receiveShadow = true; g.add(p);
  tige(g, m, 0.04, 0.72, 0, 0.36, 0);
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 16), m); pied.position.y = 0.02; g.add(pied);
  return g;
}

// ---------------------------------------------------------------- today
/** Glass display case on a base (museum). */
export function vitrine(w = 2.2, h = 1.4, d = 1.1) {
  const g = new THREE.Group(); g.name = "vitrine";
  bloc(g, mat("#E9E6E0"), w, 0.6, d, 0, 0, 0);
  const verre = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: "#DDEFF5", transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }));
  verre.position.y = 0.6 + h / 2; g.add(verre);
  const arete = mat("#B9B4AC", { metalness: 0.6 });
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) bloc(g, arete, 0.03, h, 0.03, x, 0.6, z);
  return g;
}
/** Building front of a small town today (facade along X, facing +Z), its windows printed on it. */
export function immeuble(w = 5, h = 7, couleur = "#D9CBB4", graine = 1) {
  const g = new THREE.Group(); g.name = "maison";
  const c = document.createElement("canvas"); c.width = 256; c.height = Math.round(256 * h / w);
  const x = c.getContext("2d"); x.fillStyle = couleur; x.fillRect(0, 0, c.width, c.height);
  const cols = Math.round(w / 1.4), rows = Math.round(h / 2.2);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const cx = (i + 0.5) * c.width / cols, cy = (j + 0.5) * c.height / rows;
    x.fillStyle = "#4A5A66"; x.fillRect(cx - 14, cy - 22, 28, 40);
    x.fillStyle = (i + j + graine) % 3 ? "#6B7F8C" : "#55636E"; x.fillRect(cx - 11, cy - 19, 22, 34);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = mat(couleur);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), [m, m, mat("#5A5E66"), m, mat("#FFFFFF", { map: tex }), m]);
  b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
  return g;
}
/** Street lamp (electric). */
export function lampadaire(h = 3.6) {
  const g = new THREE.Group(); g.name = "lampadaire";
  const m = mat("#2C3036", { metalness: 0.5 });
  tige(g, m, 0.05, h, 0, h / 2, 0);
  bloc(g, m, 0.3, 0.3, 0.3, 0, h, 0);
  bloc(g, mat("#FFF4DA", { emissive: "#FFE9B8", emissiveIntensity: 0.6 }), 0.24, 0.22, 0.24, 0, h + 0.03, 0);
  return g;
}
/** A newspaper of the time lying flat (to put on a table): "Courrier d'Avignon", a headline about the Beast. */
export function gazette() {
  const g = new THREE.Group();
  const tex = texte([["COURRIER D'AVIGNON", 44], ["", 10], ["LA BÊTE DU GÉVAUDAN", 52], ["≡≡≡≡≡≡≡≡≡≡", 40, "MontS"], ["≡≡≡≡≡≡≡≡≡≡", 40, "MontS"]], { w: 512, h: 640, fond: "#F2EDE0", encre: "#2A2C33" });
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.004, 0.46), [mat("#F2EDE0"), mat("#F2EDE0"), mat("#FFFFFF", { map: tex }), mat("#F2EDE0"), mat("#F2EDE0"), mat("#F2EDE0")]);
  f.position.y = 0.003; f.receiveShadow = true; g.add(f);
  return g;
}
