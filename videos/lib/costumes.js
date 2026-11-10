// Period costumes for the Quidams (lib/quidams.js), here the France of the 1760s: they are layered over a figure's
// joints (articulations), so they follow every pose, and quidams.js itself stays untouched. Same plain style: one
// colour per piece, simple shapes. The head and hands keep the role colour, so the role still reads.
//   habiller(q, { chapeau: "tricorne" | "feutre" | "coiffe" | "casque", perruque, veste: { couleur, longue },
//                 gilet, manches, poignets, culotte, bas, souliers, jupe, fichu, jabot, manteau: { couleur } })
import * as THREE from "three";

const TAU = Math.PI * 2;
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide, ...o });
function piece(parent, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], ech = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...pos); mesh.rotation.set(...rot); mesh.scale.set(...ech);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const tour = (pts, ouvert = 0) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 36, ouvert / 2, TAU - ouvert);

// ---------------------------------------------------------------- hats and hair (on the head group, centre of the skull)
function tricorne(tete, couleur) {
  const m = mat(couleur, { roughness: 0.85 });
  piece(tete, new THREE.CylinderGeometry(0.25, 0.28, 0.13, 24), m, [0, 0.3, -0.01]);
  // three cocked-up sides forming the triangle, one corner over the face
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3 + Math.PI / 3, r = 0.27;
    const bord = piece(tete, new THREE.BoxGeometry(0.5, 0.15, 0.025), m, [Math.sin(a) * r, 0.3, Math.cos(a) * r], [0, a, 0]);
    bord.rotation.order = "YXZ"; bord.rotation.x = -0.45;
  }
  piece(tete, new THREE.CylinderGeometry(0.43, 0.43, 0.02, 3), m, [0, 0.245, 0], [0, Math.PI, 0]);
}
function feutre(tete, couleur) {
  const m = mat(couleur, { roughness: 0.9 });
  piece(tete, new THREE.CylinderGeometry(0.24, 0.27, 0.17, 24), m, [0, 0.33, 0]);
  piece(tete, new THREE.CylinderGeometry(0.44, 0.44, 0.02, 32), m, [0, 0.25, 0], [-0.08, 0, 0]);
}
function coiffe(tete, couleur) {
  const m = mat(couleur, { roughness: 0.9 });
  piece(tete, new THREE.SphereGeometry(0.335, 28, 14, 0, TAU, 0, Math.PI * 0.55), m, [0, 0.01, -0.02], [-0.55, 0, 0], [1, 0.97, 1]);
  piece(tete, new THREE.TorusGeometry(0.31, 0.03, 8, 32, Math.PI * 1.2), m, [0, 0.06, 0.06], [-1.0, 0, -0.1 - Math.PI * 0.1]);
}
function casque(tete) {
  const cuivre = mat("#B87333", { metalness: 0.75, roughness: 0.35 });
  piece(tete, new THREE.SphereGeometry(0.34, 28, 14, 0, TAU, 0, Math.PI / 2), cuivre, [0, 0.06, -0.01], [-0.12, 0, 0]);
  piece(tete, new THREE.BoxGeometry(0.06, 0.12, 0.5), mat("#2B2B30"), [0, 0.42, -0.02], [-0.12, 0, 0]);
  piece(tete, new THREE.CylinderGeometry(0.18, 0.18, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), cuivre, [0, 0.1, 0.2], [0.25, 0, 0], [1.2, 1, 1]);
}
function perruque(tete, couleur, dessus) {
  const m = mat(couleur, { roughness: 0.95 });
  if (dessus) piece(tete, new THREE.SphereGeometry(0.33, 24, 12, 0, TAU, 0, Math.PI * 0.5), m, [0, 0.02, -0.03], [-0.3, 0, 0]);
  for (const s of [-1, 1]) for (const dy of [0.04, -0.06]) piece(tete, new THREE.CylinderGeometry(0.055, 0.055, 0.2, 14), m, [s * 0.3, dy, -0.06], [Math.PI / 2, 0, 0]);
  piece(tete, new THREE.SphereGeometry(0.1, 14, 10), m, [0, -0.08, -0.3]);
  piece(tete, new THREE.BoxGeometry(0.1, 0.06, 0.04), mat("#15161B"), [0, -0.08, -0.4]);
}

// ---------------------------------------------------------------- body (buste: hips at y 0, neck at about 0.56)
function veste(buste, couleur, longue) {
  const bas = longue ? -0.62 : -0.3;
  piece(buste, tour([[0.29, bas], [0.285, -0.2], [0.27, -0.02], [0.262, 0.14], [0.262, 0.3], [0.25, 0.41], [0.22, 0.485], [0.17, 0.535], [0.12, 0.558]], 0.55), mat(couleur), [0, 0, 0], [0, 0, 0], [1, 1, 0.94]);
  // buttons down the open front edges
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) piece(buste, new THREE.SphereGeometry(0.014, 8, 6), mat("#D9B44A", { metalness: 0.7 }), [s * 0.072, 0.4 - k * 0.12, 0.245], [0, 0, 0]);
}
function gilet(buste, couleur) {
  piece(buste, tour([[0.262, -0.14], [0.258, 0.1], [0.258, 0.3], [0.245, 0.42], [0.2, 0.5], [0.14, 0.548]]), mat(couleur), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]);
}
function jabot(buste) {
  const m = mat("#FAFAF5", { roughness: 1 });
  piece(buste, new THREE.ConeGeometry(0.06, 0.16, 12), m, [0, 0.47, 0.235], [Math.PI, 0, 0], [1, 1, 0.5]);
}
function fichu(buste, couleur) {
  piece(buste, tour([[0.12, 0.565], [0.2, 0.545], [0.27, 0.48], [0.295, 0.38], [0.3, 0.32]]), mat(couleur, { roughness: 1 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.95]);
}
function manteau(buste, couleur) {
  piece(buste, tour([[0.16, 0.56], [0.27, 0.5], [0.33, 0.38], [0.38, 0.05], [0.45, -0.35], [0.52, -0.72]], 1.1), mat(couleur, { roughness: 0.6 }), [0, 0, -0.02]);
  piece(buste, new THREE.TorusGeometry(0.2, 0.06, 10, 28), mat("#F4F1EA", { roughness: 1 }), [0, 0.53, 0], [Math.PI / 2, 0, 0]);
}
function jupe(bassin, couleur) {
  piece(bassin, tour([[0.24, 0.1], [0.27, -0.05], [0.31, -0.3], [0.35, -0.56], [0.37, -0.7]]), mat(couleur), [0, 0, 0], [0, 0, 0], [1, 1, 0.9]);
}

// ---------------------------------------------------------------- arms and legs (overlays slightly wider than the limbs)
function manches(q, couleur, poignets) {
  const m = mat(couleur), a = q.articulations;
  for (const [epaule, coude] of [[a.epauleG, a.coudeG], [a.epauleD, a.coudeD]]) {
    piece(epaule, new THREE.CapsuleGeometry(0.084, 0.26, 6, 16), m, [0, -0.13, 0]);
    piece(coude, new THREE.CapsuleGeometry(0.077, 0.2, 6, 16), m, [0, -0.1, 0]);
    if (poignets) piece(coude, new THREE.TorusGeometry(0.075, 0.025, 8, 18), mat(poignets, { roughness: 1 }), [0, -0.22, 0], [Math.PI / 2, 0, 0]);
  }
}
function jambes(q, culotte, bas, souliers) {
  const a = q.articulations;
  for (const [hanche, genou] of [[a.hancheG, a.genouG], [a.hancheD, a.genouD]]) {
    if (culotte) piece(hanche, new THREE.CapsuleGeometry(0.1, 0.34, 6, 16), mat(culotte), [0, -0.17, 0]);
    if (bas) piece(genou, new THREE.CapsuleGeometry(0.086, 0.3, 6, 16), mat(bas, { roughness: 0.9 }), [0, -0.19, 0]);
    if (souliers) piece(genou, new THREE.CapsuleGeometry(0.082, 0.12, 6, 16), mat(souliers, { roughness: 0.5 }), [0, -0.37, 0.055], [Math.PI / 2, 0, 0], [1, 1, 0.82]);
  }
}

/** Dresses a Quidam; returns it for chaining. */
export function habiller(q, t = {}) {
  const { tete, buste, bassin } = q.articulations;
  if (t.chapeau === "tricorne") tricorne(tete, t.couleurChapeau || "#1E1F24");
  if (t.chapeau === "feutre") feutre(tete, t.couleurChapeau || "#3B2F26");
  if (t.chapeau === "coiffe") coiffe(tete, t.couleurChapeau || "#F6F3EC");
  if (t.chapeau === "casque") casque(tete);
  if (t.perruque) perruque(tete, t.perruque === true ? "#EDEBE4" : t.perruque, !t.chapeau && !t.sansDessus);
  if (t.gilet) gilet(buste, t.gilet);
  if (t.veste) veste(buste, t.veste.couleur, t.veste.longue);
  if (t.jabot) jabot(buste);
  if (t.fichu) fichu(buste, t.fichu);
  if (t.manteau) manteau(buste, t.manteau.couleur);
  if (t.jupe) jupe(bassin, t.jupe);
  if (t.manches) manches(q, t.manches, t.poignets);
  jambes(q, t.culotte, t.bas, t.souliers);
  return q;
}

// a few ready-made outfits of the Gévaudan in the 1760s
export const TENUES = {
  paysan: { chapeau: "feutre", gilet: "#6B4F3A", manches: "#EDE6D6", poignets: null, culotte: "#5A4A3C", bas: "#BDB7AC", souliers: "#2B2420" },
  paysanne: { chapeau: "coiffe", gilet: "#3B2F2A", fichu: "#F2EEE4", manches: "#EDE6D6", jupe: "#7A3B2E", souliers: "#2B2420" },
  berger: { chapeau: "feutre", gilet: "#C9B48A", veste: { couleur: "#6E7A86" }, manches: "#6E7A86", culotte: "#5A4A3C", bas: "#BDB7AC", souliers: "#2B2420" },
  bergere: { chapeau: "coiffe", gilet: "#5A3A2E", fichu: "#E9E2D2", manches: "#E9E2D2", jupe: "#3F4E6B", souliers: "#2B2420" },
  // Légion de Clermont-Prince: copper helmet, fawn coat over a red waistcoat (Condé livery)
  soldat: { chapeau: "casque", gilet: "#B23A2E", veste: { couleur: "#C9A97A", longue: true }, manches: "#C9A97A", poignets: "#B23A2E", culotte: "#C9A97A", bas: "#E9E5DC", souliers: "#1E1F24" },
  chasseur: { chapeau: "tricorne", perruque: true, gilet: "#8A6D3B", veste: { couleur: "#3E5B3A", longue: true }, manches: "#3E5B3A", poignets: "#EDE6D6", culotte: "#5C4A33", bas: "#E9E5DC", souliers: "#1E1F24", jabot: true },
  noble: { chapeau: "tricorne", perruque: true, gilet: "#D9C9A0", veste: { couleur: "#7B2D3A", longue: true }, manches: "#7B2D3A", poignets: "#FAFAF5", culotte: "#7B2D3A", bas: "#F4F1EA", souliers: "#1E1F24", jabot: true },
  courtisan: { perruque: true, gilet: "#E2D5B0", veste: { couleur: "#3B4F7A", longue: true }, manches: "#3B4F7A", poignets: "#FAFAF5", culotte: "#3B4F7A", bas: "#F4F1EA", souliers: "#1E1F24", jabot: true },
  roi: { perruque: true, sansDessus: true, gilet: "#E2C26A", veste: { couleur: "#2A3E86", longue: true }, manches: "#2A3E86", poignets: "#FAFAF5", culotte: "#2A3E86", bas: "#F4F1EA", souliers: "#1E1F24", jabot: true, manteau: { couleur: "#1F3A8A" } },
  dame: { perruque: true, gilet: "#E8D3D8", fichu: "#FAFAF5", manches: "#A8738A", poignets: "#FAFAF5", jupe: "#8E5A72", souliers: "#2B2420" },
  imprimeur: { chapeau: "feutre", gilet: "#5C5246", manches: "#EDE6D6", culotte: "#3E3A36", bas: "#BDB7AC", souliers: "#2B2420" },
  ecrivain: { perruque: true, gilet: "#8A7A5C", veste: { couleur: "#2E3A4E", longue: true }, manches: "#2E3A4E", poignets: "#FAFAF5", culotte: "#2E3A4E", bas: "#E9E5DC", souliers: "#1E1F24", jabot: true },
};
