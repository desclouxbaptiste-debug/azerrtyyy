/**
 * LES QUIDAMS — casting 3D universel pour vidéos verticales (TikTok, Reels, Shorts)
 * Three.js pur : aucune image, aucun modèle externe, aucune dépendance en plus de `three`.
 *
 * Principes du design (à garder si tu modifies) :
 *  1. Pas de couleur de peau : tout le corps est un « costume » d'une seule couleur.
 *  2. Pas de cheveux, pas de vêtement genré : même silhouette capsule pour tout le monde.
 *  3. Pas de bouche au repos : le spectateur projette sa propre émotion.
 *     La bouche n'apparaît que quand l'émotion devient forte.
 *  4. Le rôle se lit uniquement par la couleur et par un accessoire.
 *
 * Utilisation :
 *   import { creerQuidam } from './quidams.js';
 *   const q = creerQuidam({ role: 'sujet' });
 *   scene.add(q.objet);
 *   q.pose('mainLevee');                            // pose complète
 *   q.expression('peur', 0.5);                      // à mi-chemin entre neutre et peur
 *   q.transitionExpression('doute', 'peur', k);     // k de 0 à 1
 *   q.regarder(-1, 0);                              // regarde vers sa droite
 *   q.animer(t);                                    // à chaque image, t en secondes
 *
 * Déterministe : tout dépend de t et de l'état (pas d'horloge interne, pas de Math.random).
 * Avec Remotion : t = frame / fps, et le rendu image par image est identique à chaque export.
 *
 * Repère : 1 unité ≈ 1 m. Le personnage mesure ~1,94, pose les pieds sur y = 0
 * et regarde vers +Z. Sa gauche est du côté +X.
 */
import * as THREE from 'three';

/* ───────────────────────── Outils ───────────────────────── */

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Courbe douce de 0 à 1 (smoothstep). */
export function adoucir(k) {
  k = clamp(k, 0, 1);
  return k * k * (3 - 2 * k);
}

/** Progression douce de 0 à 1 pour une action qui commence à `debut` et dure `duree` secondes. */
export function fenetre(t, debut, duree) {
  return adoucir((t - debut) / Math.max(duree, 1e-6));
}

/** Pseudo-hasard déterministe dans [0, 1[. */
function alea(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Vitesse d'avance qui correspond à l'animation de marche, en unités par seconde. */
export const VITESSE_MARCHE = 1.2;

/* ───────────────────────── Palette ───────────────────────── */

export const PALETTE = {
  ambre: '#F4A531',   // le sujet
  canard: '#2FB3A6',  // l'autre
  galet: '#A9AEB6',   // la foule
  ardoise: '#66788F', // le chercheur
  marine: '#2C3B57',  // l'autorité
  encre: '#17181D',   // l'ombre
  blouse: '#F3F3EF',
  trait: '#15161B',   // yeux, sourcils, bouche
};

/* ───────────────────────── Rôles ───────────────────────── */

export const ROLES = {
  sujet: {
    nom: 'Le Sujet', couleur: PALETTE.ambre, accessoires: [], pose: 'debout',
    usage: "Celui à qui l'expérience arrive. Le spectateur se met à sa place.",
  },
  autre: {
    nom: "L'Autre", couleur: PALETTE.canard, accessoires: [], pose: 'debout',
    usage: 'Le deuxième participant : partenaire, rival ou inconnu.',
  },
  foule: {
    nom: 'La Foule', couleur: PALETTE.galet, accessoires: [], pose: 'debout',
    usage: 'Les autres : complices, témoins, groupe. Se duplique sans limite.',
  },
  chercheur: {
    nom: 'Le Chercheur', couleur: PALETTE.ardoise, accessoires: ['blouse', 'lunettes', 'blocNotes'], pose: 'noter',
    usage: "Celui qui mène l'expérience, observe et note.",
  },
  autorite: {
    nom: "L'Autorité", couleur: PALETTE.marine, accessoires: ['casquette', 'lunettesNoires'], pose: 'brasCroises',
    usage: 'Le gardien, le chef, celui qui donne les ordres.',
  },
  ombre: {
    nom: "L'Ombre", couleur: PALETTE.encre, accessoires: [], pose: 'debout', lumineux: true,
    usage: 'La petite voix intérieure : la peur, le biais, l’instinct.',
  },
};

/* ───────────────────────── Expressions ─────────────────────────
 * oeilSx/oeilSy : taille des yeux · oeilY : hauteur · ferme : yeux en arc (joie)
 * sourcilY/sourcilTilt : hauteur et inclinaison (positif = intérieur relevé, inquiet)
 * sourcilAsym : sourcil gauche relevé seul · bouche : type (aucune, ligne, sourire, triste, o, vague)
 * teteX : hochement (positif = vers le bas) · teteZ : inclinaison · regardX/regardY : direction du regard
 */
const BASE_EXPRESSION = {
  oeilSx: 1, oeilSy: 1, oeilY: 0, ferme: 0,
  sourcilY: 0, sourcilTilt: 0, sourcilAsym: 0,
  bouche: 'aucune', boucheS: 1, boucheX: 0, boucheRot: 0,
  teteX: 0, teteZ: 0, regardX: 0, regardY: 0,
};

export const EXPRESSIONS = Object.fromEntries(Object.entries({
  neutre: {},
  joie: { oeilY: 0.006, ferme: 1, sourcilY: 0.024, sourcilTilt: 0.06, bouche: 'sourire', boucheS: 1.1, teteX: -0.05, teteZ: 0.1 },
  choc: { oeilSx: 1.18, oeilSy: 1.3, oeilY: 0.01, sourcilY: 0.058, sourcilTilt: 0.12, bouche: 'o', boucheS: 1.1, teteX: -0.12 },
  peur: { oeilSx: 1.08, oeilSy: 1.2, sourcilY: 0.04, sourcilTilt: 0.4, bouche: 'vague', boucheS: 0.95, teteX: 0.07, teteZ: -0.05, regardX: 0.25 },
  doute: { oeilSy: 0.66, oeilY: -0.008, sourcilY: -0.012, sourcilTilt: -0.14, sourcilAsym: 0.06, bouche: 'ligne', boucheS: 0.8, boucheX: 0.03, boucheRot: 0.18, teteZ: -0.12, regardX: 0.35, regardY: 0.1 },
  gene: { oeilSx: 0.95, oeilSy: 0.86, oeilY: -0.005, sourcilY: 0.012, sourcilTilt: 0.28, bouche: 'vague', boucheS: 0.7, teteX: 0.14, teteZ: 0.08, regardX: -0.85, regardY: -0.45 },
  tristesse: { oeilSx: 0.95, oeilSy: 0.76, oeilY: -0.012, sourcilY: 0.004, sourcilTilt: 0.46, bouche: 'triste', boucheS: 0.9, teteX: 0.24, regardY: -0.55 },
  colere: { oeilSy: 0.8, oeilY: -0.006, sourcilY: -0.036, sourcilTilt: -0.52, bouche: 'triste', boucheS: 1.05, teteX: 0.1 },
}).map(([nom, e]) => [nom, { ...BASE_EXPRESSION, ...e }]));

/* ───────────────────────── Poses ─────────────────────────
 * Angles en radians. Épaules : ordre ZXY (torsion du bras, puis avant/arrière, puis écart).
 * Bras gauche = G (côté +X), bras droit = D (côté −X).
 */
const REPOS = {
  bassinY: 0, bassinX: 0, bassinRY: 0,
  busteX: 0, busteY: 0, busteZ: 0,
  teteX: 0, teteY: 0, teteZ: 0,
  epaulesY: 0,
  epauleGX: 0, epauleGY: 0, epauleGZ: 0.2, coudeG: -0.12,
  epauleDX: 0, epauleDY: 0, epauleDZ: -0.2, coudeD: -0.12,
  hancheGX: 0, hancheGZ: 0.03, genouG: 0,
  hancheDX: 0, hancheDZ: -0.03, genouD: 0,
};

export const POSES = Object.fromEntries(Object.entries({
  debout: {},
  marche: { epauleGZ: 0.14, epauleDZ: -0.14, coudeG: -0.25, coudeD: -0.25 },
  mainLevee: { epauleDX: -0.1, epauleDZ: -2.86, coudeD: -0.16, teteZ: -0.05, busteZ: 0.04 },
  pointer: { epauleDX: -1.42, epauleDZ: -0.1, coudeD: -0.06, busteY: -0.18, teteY: 0.12, epauleGZ: 0.22 },
  brasCroises: {
    epauleGX: -0.72, epauleGY: -1.05, epauleGZ: -0.05, coudeG: -1.45,
    epauleDX: -0.62, epauleDY: 1.05, epauleDZ: 0.05, coudeD: -1.45, teteX: -0.04, busteX: -0.03,
  },
  hausseEpaules: {
    epaulesY: 0.045, epauleGX: -0.25, epauleGY: 0.8, epauleGZ: 0.38, coudeG: -1.45,
    epauleDX: -0.25, epauleDY: -0.8, epauleDZ: -0.38, coudeD: -1.45, teteZ: 0.16,
  },
  mainsTete: {
    epauleGX: -0.25, epauleGY: 1.57, epauleGZ: 2.2, coudeG: -1.35,
    epauleDX: -0.25, epauleDY: -1.57, epauleDZ: -2.2, coudeD: -1.35, busteX: -0.05,
  },
  teteBaissee: {
    teteX: 0.42, busteX: 0.16, epaulesY: -0.02,
    epauleGX: -0.12, epauleGZ: 0.1, coudeG: -0.06, epauleDX: -0.12, epauleDZ: -0.1, coudeD: -0.06,
  },
  assis: {
    bassinY: -0.35, hancheGX: -1.52, hancheGZ: 0.07, hancheDX: -1.52, hancheDZ: -0.07, genouG: 1.52, genouD: 1.52,
    epauleGX: -0.55, epauleGZ: 0.12, coudeG: -0.75, epauleDX: -0.55, epauleDZ: -0.12, coudeD: -0.75,
  },
  noter: {
    epauleGX: -0.45, epauleGY: -0.9, epauleGZ: 0.12, coudeG: -1.55,
    epauleDX: -0.55, epauleDY: 0.7, epauleDZ: -0.1, coudeD: -1.5, teteX: 0.32,
  },
}).map(([nom, p]) => [nom, { ...REPOS, ...p }]));

/** Noms lisibles, pour une interface. */
export const NOMS = {
  expressions: { neutre: 'Neutre', joie: 'Joie', choc: 'Choc', peur: 'Peur', doute: 'Doute', gene: 'Gêne', tristesse: 'Tristesse', colere: 'Colère' },
  poses: { debout: 'Debout', marche: 'Marche', mainLevee: 'Main levée', pointer: 'Pointe du doigt', brasCroises: 'Bras croisés', hausseEpaules: 'Hausse les épaules', mainsTete: 'Mains sur la tête', teteBaissee: 'Tête baissée', assis: 'Assis', noter: 'Prend des notes' },
};

/* ───────────────────────── Dimensions ───────────────────────── */

const HANCHE = 0.78;           // hauteur du bassin, debout
const COU = 0.555;             // pivot de la tête, dans le buste
const EPAULE = { x: 0.26, y: 0.43 };
const TETE = { r: 0.32, sy: 0.94, sz: 0.97, cy: 0.3 };
const OEIL = { x: 0.112, y: 0.035, rx: 0.052, ry: 0.078, rz: 0.03 };
const SOURCIL = { x: 0.112, y: 0.168 };
const BOUCHE_Y = -0.105;
const TORSE_PROFONDEUR = 0.9; // buste un peu moins profond que large

/** Profondeur de la surface du visage (ellipsoïde de la tête) en (x, y). */
function surfaceZ(x, y) {
  const u = 1 - (x / TETE.r) ** 2 - (y / (TETE.r * TETE.sy)) ** 2;
  return TETE.r * TETE.sz * Math.sqrt(Math.max(u, 1e-4));
}

/** Place un objet sur le visage, orienté selon la normale de la surface. */
function surFace(obj, x, y, decalage = 0, roulis = 0) {
  const z = surfaceZ(x, y);
  const nx = x / TETE.r ** 2;
  const ny = y / (TETE.r * TETE.sy) ** 2;
  const nz = z / (TETE.r * TETE.sz) ** 2;
  obj.position.set(x, y, z + decalage);
  obj.rotation.set(-Math.atan2(ny, Math.hypot(nx, nz)), Math.atan2(nx, nz), roulis);
}

/* ───────────────────────── Géométries partagées ───────────────────────── */

let GEO = null;

function geometries() {
  if (GEO) return GEO;
  const profilBlouse = [
    [0.3, -0.28], [0.292, -0.16], [0.274, -0.02], [0.26, 0.14], [0.259, 0.3],
    [0.247, 0.41], [0.218, 0.485], [0.168, 0.532], [0.112, 0.556],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  GEO = {
    torse: new THREE.CapsuleGeometry(0.24, 0.18, 10, 28),
    crane: new THREE.SphereGeometry(TETE.r, 40, 28),
    bras: new THREE.CapsuleGeometry(0.072, 0.26, 6, 16),
    avantBras: new THREE.CapsuleGeometry(0.066, 0.22, 6, 16),
    main: new THREE.SphereGeometry(0.085, 20, 14),
    cuisse: new THREE.CapsuleGeometry(0.088, 0.35, 6, 18),
    mollet: new THREE.CapsuleGeometry(0.08, 0.355, 6, 18),
    pied: new THREE.CapsuleGeometry(0.075, 0.11, 6, 16),
    oeil: new THREE.SphereGeometry(1, 20, 14),
    reflet: new THREE.SphereGeometry(0.0135, 10, 8),
    arcOeil: new THREE.TorusGeometry(0.048, 0.0135, 8, 18, Math.PI),
    sourcil: new THREE.CapsuleGeometry(0.019, 0.075, 4, 10),
    boucheLigne: new THREE.CapsuleGeometry(0.0125, 0.055, 4, 10),
    boucheArc: new THREE.TorusGeometry(0.05, 0.013, 8, 20, Math.PI),
    boucheO: new THREE.SphereGeometry(1, 16, 12),
    boucheVague: new THREE.TorusGeometry(0.026, 0.0125, 6, 14, Math.PI),
    blouse: new THREE.LatheGeometry(profilBlouse, 40, 0.3, TAU - 0.6),
    col: new THREE.TorusGeometry(0.15, 0.032, 8, 28),
    poche: new THREE.BoxGeometry(0.1, 0.09, 0.014),
    stylo: new THREE.CylinderGeometry(0.0095, 0.0095, 0.085, 8),
    verre: new THREE.TorusGeometry(0.068, 0.0095, 8, 28),
    tige: new THREE.CylinderGeometry(0.0075, 0.0075, 1, 6),
    lentille: new THREE.SphereGeometry(1, 20, 14),
    bandeau: new THREE.CylinderGeometry(0.255, 0.255, 0.09, 32),
    calotte: new THREE.CylinderGeometry(0.285, 0.255, 0.075, 32),
    visiere: new THREE.CylinderGeometry(0.19, 0.19, 0.016, 24, 1, false, -Math.PI / 2, Math.PI),
    insigne: new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16),
    planche: new THREE.BoxGeometry(0.24, 0.32, 0.016),
    feuille: new THREE.BoxGeometry(0.2, 0.25, 0.004),
    ligne: new THREE.BoxGeometry(0.14, 0.009, 0.003),
    pince: new THREE.BoxGeometry(0.085, 0.03, 0.022),
    badge: new THREE.PlaneGeometry(0.13, 0.09),
  };
  return GEO;
}

/** Libère les géométries partagées (après avoir retiré tous les personnages). */
export function libererGeometries() {
  if (!GEO) return;
  for (const g of Object.values(GEO)) g.dispose();
  GEO = null;
}

function textureNumero(n) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 88;
  const g = c.getContext('2d');
  g.fillStyle = '#F7F7F4';
  g.fillRect(0, 0, 128, 88);
  g.fillStyle = PALETTE.trait;
  g.font = 'bold 58px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n).padStart(2, '0'), 64, 47);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ───────────────────────── Construction ───────────────────────── */

function nouveauGroupe(parent, pos, ordre) {
  const g = new THREE.Group();
  if (pos) g.position.set(pos[0], pos[1], pos[2]);
  if (ordre) g.rotation.order = ordre;
  parent.add(g);
  return g;
}

function nouveauMesh(geo, mat, parent, pos, rot, ech) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (ech) m.scale.set(ech[0], ech[1], ech[2]);
  parent.add(m);
  return m;
}

const avertis = new Set();
function verifier(table, nom, defaut, type) {
  if (table[nom]) return nom;
  if (!avertis.has(type + nom)) {
    avertis.add(type + nom);
    console.warn(`[quidams] ${type} inconnue : « ${nom} ». Utilise une de : ${Object.keys(table).join(', ')}`);
  }
  return defaut;
}

/**
 * Crée un personnage.
 * @param {object} [options]
 * @param {'sujet'|'autre'|'foule'|'chercheur'|'autorite'|'ombre'} [options.role='foule']
 * @param {string} [options.couleur]        couleur du corps (remplace celle du rôle)
 * @param {string[]} [options.accessoires]  remplace ceux du rôle : blouse, lunettes, blocNotes, casquette, lunettesNoires
 * @param {number} [options.numero]         badge numéroté sur la poitrine (ex. participant n°7)
 * @param {number} [options.taille=1]       échelle
 * @param {number} [options.graine=1]       décale clignements et respiration entre personnages
 * @param {boolean} [options.ombres=true]   projette des ombres
 */
export function creerQuidam(options = {}) {
  const roleCle = verifier(ROLES, options.role ?? 'foule', 'foule', 'rôle');
  const role = ROLES[roleCle];
  const accessoires = new Set(options.accessoires ?? role.accessoires);
  const graine = options.graine ?? 1;
  const G = geometries();

  /* Matériaux (propres à ce personnage) */
  const matCorps = new THREE.MeshStandardMaterial({ color: options.couleur ?? role.couleur, roughness: role.lumineux ? 0.9 : 0.58, metalness: 0 });
  const matTrait = role.lumineux
    ? new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#F4F1E8', emissiveIntensity: 1.6, roughness: 1 })
    : new THREE.MeshStandardMaterial({ color: PALETTE.trait, roughness: 0.28, metalness: 0 });
  const matReflet = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const matBlouse = new THREE.MeshStandardMaterial({ color: PALETTE.blouse, roughness: 0.75, side: THREE.DoubleSide });
  const matMonture = new THREE.MeshStandardMaterial({ color: '#1D2129', roughness: 0.35, metalness: 0.2 });
  const matMiroir = new THREE.MeshStandardMaterial({ color: '#0B0D12', roughness: 0.12, metalness: 0.95 });
  const matCasquette = new THREE.MeshStandardMaterial({ color: '#1A2335', roughness: 0.55 });
  const matDore = new THREE.MeshStandardMaterial({ color: '#D9B44A', roughness: 0.3, metalness: 0.8 });
  const matBois = new THREE.MeshStandardMaterial({ color: '#B98B5B', roughness: 0.7 });
  const matPapier = new THREE.MeshStandardMaterial({ color: '#FAFAF7', roughness: 0.9 });
  const matGris = new THREE.MeshStandardMaterial({ color: '#9BA1AA', roughness: 0.5, metalness: 0.4 });
  const matStylo = new THREE.MeshStandardMaterial({ color: '#2F6FED', roughness: 0.4 });
  const materiaux = [matCorps, matTrait, matReflet, matBlouse, matMonture, matMiroir, matCasquette, matDore, matBois, matPapier, matGris, matStylo];
  const matManches = accessoires.has('blouse') ? matBlouse : matCorps;

  /* Squelette */
  const racine = new THREE.Group();
  racine.name = `quidam:${roleCle}`;
  const corps = nouveauGroupe(racine);
  const taille = options.taille ?? 1;
  corps.scale.setScalar(taille);

  const bassin = nouveauGroupe(corps, [0, HANCHE, 0], 'YXZ');
  const buste = nouveauGroupe(bassin, null, 'YXZ');
  const torse = nouveauMesh(G.torse, matCorps, buste, [0, 0.25, 0]);

  const cou = nouveauGroupe(buste, [0, COU, 0], 'YXZ');
  const tete = nouveauGroupe(cou, [0, TETE.cy, 0]);
  nouveauMesh(G.crane, matCorps, tete, null, null, [1, TETE.sy, TETE.sz]);

  const bras = {};
  for (const [cote, s] of [['G', 1], ['D', -1]]) {
    const epaule = nouveauGroupe(buste, [s * EPAULE.x, EPAULE.y, 0], 'ZXY');
    nouveauMesh(G.bras, matManches, epaule, [0, -0.13, 0]);
    const coude = nouveauGroupe(epaule, [0, -0.26, 0]);
    nouveauMesh(G.avantBras, matManches, coude, [0, -0.11, 0]);
    const main = nouveauGroupe(coude, [0, -0.27, 0]);
    nouveauMesh(G.main, matCorps, main);
    const hanche = nouveauGroupe(bassin, [s * 0.115, 0, 0]);
    nouveauMesh(G.cuisse, matCorps, hanche, [0, -0.175, 0]);
    const genou = nouveauGroupe(hanche, [0, -0.35, 0]);
    nouveauMesh(G.mollet, matCorps, genou, [0, -0.1775, 0]);
    nouveauMesh(G.pied, matCorps, genou, [0, -0.37, 0.05], [Math.PI / 2, 0, 0], [1, 1, 0.8]);
    bras[cote] = { epaule, coude, main, hanche, genou };
  }

  /* Visage */
  const yeux = [];
  for (const s of [1, -1]) {
    const pivot = nouveauGroupe(tete, null, 'YXZ');
    const globe = nouveauMesh(G.oeil, matTrait, pivot, null, null, [OEIL.rx, OEIL.ry, OEIL.rz]);
    const reflet = nouveauMesh(G.reflet, matReflet, pivot, [0.018, 0.032, 0.026]);
    const arc = nouveauMesh(G.arcOeil, matTrait, pivot, [0, -0.014, 0.012]);
    reflet.visible = !role.lumineux;
    yeux.push({ s, pivot, globe, reflet, arc });
  }
  const sourcils = [];
  for (const s of [1, -1]) {
    const pivot = nouveauGroupe(tete, null, 'YXZ');
    nouveauMesh(G.sourcil, matTrait, pivot, null, [0, 0, Math.PI / 2]);
    pivot.visible = !role.lumineux;
    sourcils.push({ s, pivot });
  }
  const bouche = nouveauGroupe(tete, null, 'YXZ');
  const formes = {
    ligne: nouveauGroupe(bouche),
    sourire: nouveauGroupe(bouche),
    triste: nouveauGroupe(bouche),
    o: nouveauGroupe(bouche),
    vague: nouveauGroupe(bouche),
  };
  nouveauMesh(G.boucheLigne, matTrait, formes.ligne, null, [0, 0, Math.PI / 2]);
  nouveauMesh(G.boucheArc, matTrait, formes.sourire, [0, 0.025, 0], [0, 0, Math.PI]);
  nouveauMesh(G.boucheArc, matTrait, formes.triste, [0, -0.025, 0]);
  nouveauMesh(G.boucheO, matTrait, formes.o, null, null, [0.034, 0.044, 0.016]);
  nouveauMesh(G.boucheVague, matTrait, formes.vague, [-0.026, 0.013, 0], [0, 0, Math.PI]);
  nouveauMesh(G.boucheVague, matTrait, formes.vague, [0.026, -0.013, 0]);

  /* Accessoires */
  if (accessoires.has('blouse')) {
    nouveauMesh(G.blouse, matBlouse, buste);
    nouveauMesh(G.col, matBlouse, buste, [0, 0.53, 0], [Math.PI / 2, 0, 0]);
    const zPoche = Math.sqrt(0.259 ** 2 - 0.11 ** 2);
    nouveauMesh(G.poche, matBlouse, buste, [0.11, 0.3, zPoche + 0.008], [0, Math.atan2(0.11, zPoche), 0]);
    nouveauMesh(G.stylo, matStylo, buste, [0.125, 0.355, zPoche + 0.004], [0, 0, 0.12]);
  }
  if (accessoires.has('lunettes')) {
    for (const s of [1, -1]) {
      nouveauMesh(G.verre, matMonture, tete, [s * OEIL.x, OEIL.y, surfaceZ(OEIL.x, OEIL.y) + 0.042], [0, s * 0.2, 0]);
      nouveauMesh(G.tige, matMonture, tete, [s * 0.186, 0.045, 0.27], [Math.PI / 2, 0, 0], [1, 0.13, 1]);
    }
    nouveauMesh(G.tige, matMonture, tete, [0, 0.05, 0.338], [0, 0, Math.PI / 2], [1, 0.09, 1]);
  }
  const avecLunettesNoires = accessoires.has('lunettesNoires');
  if (avecLunettesNoires) {
    for (const s of [1, -1]) {
      const lentille = nouveauMesh(G.lentille, matMiroir, tete, null, null, [0.088, 0.062, 0.024]);
      surFace(lentille, s * 0.11, 0.04, 0.03);
      nouveauMesh(G.tige, matMonture, tete, [s * 0.19, 0.05, 0.27], [Math.PI / 2, 0, 0], [1, 0.13, 1]);
    }
    nouveauMesh(G.tige, matMonture, tete, [0, 0.062, 0.332], [0, 0, Math.PI / 2], [1.2, 0.06, 1.2]);
  }
  if (accessoires.has('casquette')) {
    nouveauMesh(G.bandeau, matCasquette, tete, [0, 0.23, 0]);
    nouveauMesh(G.calotte, matCasquette, tete, [0, 0.305, 0.008], [-0.05, 0, 0]);
    nouveauMesh(G.visiere, matCasquette, tete, [0, 0.235, 0.14], [0.3, 0, 0], [1.12, 1, 1]);
    nouveauMesh(G.insigne, matDore, tete, [0, 0.235, 0.255], [Math.PI / 2, 0, 0]);
  }
  if (accessoires.has('blocNotes')) {
    const bloc = nouveauGroupe(bras.G.main, [0, -0.02, 0.07]);
    bloc.rotation.set(-0.6, 0, 0);
    nouveauMesh(G.planche, matBois, bloc, [0, -0.07, 0]);
    nouveauMesh(G.feuille, matPapier, bloc, [0, -0.09, 0.01]);
    for (let i = 0; i < 4; i++) nouveauMesh(G.ligne, matGris, bloc, [0, -0.03 - i * 0.045, 0.0125], null, [i === 3 ? 0.6 : 1, 1, 1]);
    nouveauMesh(G.pince, matGris, bloc, [0, 0.085, 0.013]);
  }
  let texNumero = null;
  if (options.numero != null) {
    texNumero = textureNumero(options.numero);
    if (texNumero) {
      const matBadge = new THREE.MeshStandardMaterial({ map: texNumero, roughness: 0.8 });
      materiaux.push(matBadge);
      const a = accessoires.has('blouse') ? 0.259 : 0.24;
      const b = accessoires.has('blouse') ? 0.259 : 0.24 * TORSE_PROFONDEUR;
      const z = b * Math.sqrt(1 - (0.1 / a) ** 2);
      nouveauMesh(G.badge, matBadge, buste, [-0.1, 0.3, z + 0.005], [0, -Math.atan2(0.1 / (a * a), z / (b * b)), 0]);
    }
  }

  const ombres = options.ombres ?? true;
  racine.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = ombres;
      o.receiveShadow = false;
    }
  });

  /* État */
  const etat = {
    poseA: 'debout', poseB: role.pose, poseK: 1,
    exprA: 'neutre', exprB: 'neutre', exprK: 0,
    regardX: 0, regardY: 0, t: 0,
  };
  const v = { ...REPOS };
  const e = { ...BASE_EXPRESSION };
  const phase = alea(graine) * TAU;
  const periodeClin = 3.1 + alea(graine + 7) * 2.6;

  function appliquer() {
    const t = etat.t;
    const A = POSES[etat.poseA], B = POSES[etat.poseB];
    for (const cle in REPOS) v[cle] = lerp(A[cle], B[cle], etat.poseK);
    const EA = EXPRESSIONS[etat.exprA], EB = EXPRESSIONS[etat.exprB];
    for (const cle in BASE_EXPRESSION) if (cle !== 'bouche') e[cle] = lerp(EA[cle], EB[cle], etat.exprK);

    // Respiration et micro-mouvements
    const souffle = Math.sin((t * TAU) / 3.8 + phase);
    v.teteX += 0.022 * Math.sin((t * TAU) / 4.7 + phase * 1.3);
    v.teteZ += 0.014 * Math.sin((t * TAU) / 6.3 + phase * 0.7);
    v.epauleGZ += 0.018 * souffle;
    v.epauleDZ -= 0.018 * souffle;
    v.bassinRY += 0.018 * Math.sin((t * TAU) / 7.4 + phase);

    // Marche (se superpose quand la pose « marche » est active)
    const marche = (etat.poseA === 'marche' ? 1 - etat.poseK : 0) + (etat.poseB === 'marche' ? etat.poseK : 0);
    if (marche > 0) {
      const p = (t * TAU) / 1.05 + phase;
      const sp = Math.sin(p), cp = Math.cos(p);
      v.hancheGX += marche * 0.42 * sp;
      v.hancheDX -= marche * 0.42 * sp;
      v.genouG += marche * (0.1 + 0.6 * Math.max(0, -cp));
      v.genouD += marche * (0.1 + 0.6 * Math.max(0, cp));
      v.epauleGX -= marche * 0.36 * sp;
      v.epauleDX += marche * 0.36 * sp;
      v.bassinY += marche * 0.022 * Math.cos(2 * p);
      v.busteY += marche * 0.07 * sp;
      v.teteY -= marche * 0.05 * sp;
      v.bassinRY -= marche * 0.05 * sp;
    }

    // Regard
    const gx = clamp(e.regardX + etat.regardX, -1, 1);
    const gy = clamp(e.regardY + etat.regardY, -1, 1);

    // Squelette
    bassin.position.y = HANCHE + v.bassinY;
    bassin.rotation.set(v.bassinX, v.bassinRY, 0);
    buste.rotation.set(v.busteX, v.busteY, v.busteZ);
    torse.scale.set(1 + 0.006 * souffle, 1 + 0.01 * souffle, TORSE_PROFONDEUR * (1 + 0.008 * souffle));
    cou.position.y = COU + 0.006 * souffle;
    cou.rotation.set(v.teteX + e.teteX - gy * 0.12, v.teteY + gx * 0.22, v.teteZ + e.teteZ);
    for (const [cote, s] of [['G', 1], ['D', -1]]) {
      const b = bras[cote];
      b.epaule.position.set(s * EPAULE.x, EPAULE.y + v.epaulesY + 0.005 * souffle, 0);
      b.epaule.rotation.set(v[`epaule${cote}X`], v[`epaule${cote}Y`], v[`epaule${cote}Z`]);
      b.coude.rotation.set(v[`coude${cote}`], 0, 0);
      b.hanche.rotation.set(v[`hanche${cote}X`], 0, v[`hanche${cote}Z`]);
      b.genou.rotation.set(v[`genou${cote}`], 0, 0);
    }

    // Clignement (pas quand les yeux sont déjà en arc)
    const local = (((t + alea(graine + 3) * periodeClin) % periodeClin) + periodeClin) % periodeClin;
    const clin = local < 0.16 ? Math.sin((Math.PI * local) / 0.16) : 0;
    const ouvert = 1 - e.ferme;
    const facteurClin = 1 - 0.92 * clin * (e.ferme < 0.5 ? 1 : 0);

    // Yeux
    for (const oeil of yeux) {
      const x = oeil.s * OEIL.x + gx * 0.03;
      const y = OEIL.y + e.oeilY + gy * 0.022;
      surFace(oeil.pivot, x, y, -0.012);
      const sy = Math.max(e.oeilSy * ouvert * facteurClin, 0.001);
      oeil.globe.scale.set(OEIL.rx * e.oeilSx, OEIL.ry * sy, OEIL.rz);
      oeil.globe.visible = !avecLunettesNoires && sy > 0.02;
      oeil.reflet.position.set(0.018 * e.oeilSx, 0.032 * sy, 0.024);
      oeil.reflet.visible = !role.lumineux && !avecLunettesNoires && sy > 0.45;
      const a = clamp((e.ferme - 0.35) / 0.65, 0, 1);
      oeil.arc.scale.setScalar(Math.max(a, 0.001));
      oeil.arc.visible = !avecLunettesNoires && a > 0.02;
    }

    // Sourcils (tilt positif = côté intérieur relevé)
    for (const sc of sourcils) {
      const y = SOURCIL.y + e.sourcilY + (sc.s > 0 ? e.sourcilAsym : 0);
      surFace(sc.pivot, sc.s * SOURCIL.x, y, 0.004, -sc.s * e.sourcilTilt);
    }

    // Bouche : fondu entre deux formes
    surFace(bouche, e.boucheX, BOUCHE_Y, -0.002, e.boucheRot);
    const ba = EA.bouche, bb = EB.bouche, k = etat.exprK;
    for (const [nom, forme] of Object.entries(formes)) {
      let s = 0;
      if (ba === bb && nom === ba) s = lerp(EA.boucheS, EB.boucheS, k);
      else if (nom === ba) s = EA.boucheS * (1 - adoucir(k * 2));
      else if (nom === bb) s = EB.boucheS * adoucir(k * 2 - 1);
      forme.scale.setScalar(Math.max(s, 0.001));
      forme.visible = s > 0.02;
    }
  }

  const quidam = {
    /** Le THREE.Group à ajouter à la scène et à déplacer. */
    objet: racine,
    role: roleCle,
    nom: role.nom,
    /** Groupes du squelette, pour animer à la main si besoin. */
    articulations: {
      bassin, buste, cou, tete,
      epauleG: bras.G.epaule, coudeG: bras.G.coude, mainG: bras.G.main,
      epauleD: bras.D.epaule, coudeD: bras.D.coude, mainD: bras.D.main,
      hancheG: bras.G.hanche, genouG: bras.G.genou, hancheD: bras.D.hanche, genouD: bras.D.genou,
    },
    /** Pose de « debout » vers `nom`, k de 0 à 1. */
    pose(nom, k = 1) {
      return quidam.transitionPose('debout', nom, k);
    },
    /** Passe de la pose `de` à la pose `vers`, k de 0 à 1 (adoucis k toi-même si besoin). */
    transitionPose(de, vers, k) {
      etat.poseA = verifier(POSES, de, 'debout', 'pose');
      etat.poseB = verifier(POSES, vers, 'debout', 'pose');
      etat.poseK = clamp(k, 0, 1);
      appliquer();
      return quidam;
    },
    /** Expression de « neutre » vers `nom`, k de 0 à 1. */
    expression(nom, k = 1) {
      return quidam.transitionExpression('neutre', nom, k);
    },
    transitionExpression(de, vers, k) {
      etat.exprA = verifier(EXPRESSIONS, de, 'neutre', 'expression');
      etat.exprB = verifier(EXPRESSIONS, vers, 'neutre', 'expression');
      etat.exprK = clamp(k, 0, 1);
      appliquer();
      return quidam;
    },
    /** Direction du regard, de −1 à 1 : x positif = vers sa gauche, y positif = vers le haut. */
    regarder(x = 0, y = 0) {
      etat.regardX = clamp(x, -1, 1);
      etat.regardY = clamp(y, -1, 1);
      appliquer();
      return quidam;
    },
    /** À appeler à chaque image, t en secondes : respiration, clignements, marche. */
    animer(t) {
      etat.t = t;
      appliquer();
      return quidam;
    },
    /** Change la couleur du corps. */
    couleur(hex) {
      matCorps.color.set(hex);
      return quidam;
    },
    /** Retire le personnage et libère ses matériaux. */
    liberer() {
      racine.removeFromParent();
      for (const m of materiaux) m.dispose();
      if (texNumero) texNumero.dispose();
    },
  };

  appliquer();
  return quidam;
}

/**
 * Crée une foule en rangées (même rôle, petites variations de taille).
 * @returns {{ groupe: THREE.Group, quidams: object[], animer: (t:number) => void }}
 */
export function creerFoule({ nombre = 8, colonnes = 4, ecartX = 0.72, ecartZ = 0.95, role = 'foule', graine = 1, variation = 0.035, quinconce = true } = {}) {
  const groupe = new THREE.Group();
  groupe.name = 'foule';
  const quidams = [];
  const rangees = Math.ceil(nombre / colonnes);
  for (let i = 0; i < nombre; i++) {
    const c = i % colonnes;
    const r = Math.floor(i / colonnes);
    const q = creerQuidam({
      role,
      graine: graine * 1000 + i,
      taille: 1 + (alea(graine * 31 + i) - 0.5) * 2 * variation,
    });
    const decalage = quinconce && rangees > 1 ? (r % 2 ? ecartX / 4 : -ecartX / 4) : 0;
    q.objet.position.set((c - (colonnes - 1) / 2) * ecartX + decalage, 0, -r * ecartZ);
    groupe.add(q.objet);
    quidams.push(q);
  }
  return {
    groupe,
    quidams,
    animer(t) {
      for (const q of quidams) q.animer(t);
    },
  };
}

/** Chaise simple et neutre. Assise à 0,345 : place le personnage au même point, en pose « assis ». */
export function creerChaise({ couleur = '#D7DAE0' } = {}) {
  const g = new THREE.Group();
  g.name = 'chaise';
  const mat = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.7 });
  const ajouter = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  ajouter(new THREE.BoxGeometry(0.46, 0.05, 0.44), 0, 0.32, -0.05);
  const pied = new THREE.CylinderGeometry(0.022, 0.022, 0.295, 10);
  for (const x of [-0.2, 0.2]) for (const z of [-0.24, 0.14]) ajouter(pied, x, 0.1475, z);
  const montant = new THREE.CylinderGeometry(0.02, 0.02, 0.36, 10);
  for (const x of [-0.2, 0.2]) ajouter(montant, x, 0.5, -0.25);
  ajouter(new THREE.BoxGeometry(0.46, 0.22, 0.04), 0, 0.6, -0.25);
  return g;
}
