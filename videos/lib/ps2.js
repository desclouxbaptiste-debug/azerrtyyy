// Les Quidams, PS2 edition: the six roles of lib/quidams.js (le Sujet, l'Autre, la Foule, le Chercheur, l'Autorité,
// l'Ombre) remade as early-2000s console characters: real proportions, low-poly bodies, small painted textures
// (knitwear, denim, camouflage, a uniform, painted faces), sunglasses that shine, a blob shadow under the feet.
// Same skeleton, joint names, poses and expressions as lib/quidams.js (its POSES and EXPRESSIONS are reused), so a
// scene can swap one for the other: creerQuidamPS2({ role, graine, taille }) returns { objet, articulations, pose,
// transitionPose, expression, transitionExpression, regarder, animer, parler }. Everything is drawn by this code.
// For the full look, render with the low-resolution option of studio3d (tourner(..., { res: 0.42 })).
import * as THREE from "three";
import { POSES as POSES_QUIDAMS, EXPRESSIONS, ROLES } from "./quidams.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
function alea(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }

// ---------------------------------------------------------------- body measures (metres, adult of 1.75 m)
const HANCHE = 0.93, COU = 0.53, TETE_Y = 0.15, EPAULE = { x: 0.2, y: 0.47 };
const BRAS = 0.29, AVANT_BRAS = 0.26, CUISSE = 0.44, JAMBE = 0.42;
const TETE = { r: 0.112, sx: 0.9, sy: 1.1, sz: 1.0 };
// the Quidams' poses fit these joints as they are; sitting goes lower, the legs being longer
const AJUSTE = {
  assis: { bassinY: -0.41 },
  mainsTete: { epauleGX: -0.35, epauleGY: 1.2, epauleGZ: 2.55, coudeG: -2.25, epauleDX: -0.35, epauleDY: -1.2, epauleDZ: -2.55, coudeD: -2.25 },
};
const POSES = Object.fromEntries(Object.entries(POSES_QUIDAMS).map(([k, p]) => [k, { ...p, ...(AJUSTE[k] || {}) }]));

// ---------------------------------------------------------------- painted textures (small, softly filtered: PS2)
function toile(w, h, dessin) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  dessin(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
function bruit(x, w, h, a = 0.08, graine = 1, taille = 2) {
  for (let i = 0; i < (w * h) / (taille * taille * 3); i++) {
    const r = alea(graine + i * 1.7), s = alea(graine * 3 + i * 2.3);
    x.fillStyle = r > 0.5 ? `rgba(255,255,255,${a * r})` : `rgba(0,0,0,${a * (1 - r)})`;
    x.fillRect(Math.floor(s * w), Math.floor(alea(graine * 7 + i) * h), taille, taille);
  }
}
const degrade = (x, w, h, couleurs) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  couleurs.forEach((c, i) => g.addColorStop(i / (couleurs.length - 1), c));
  x.fillStyle = g; x.fillRect(0, 0, w, h);
};
// the front of a cylinder is the middle of its texture (u = 0.5), the top is v = 0
const PEINTURES = {
  // knitted sweater: colour gradient, argyle diamonds, a V neck at the front, a ribbed hem
  tricot: ({ couleurs, bord }) => (x, w, h) => {
    degrade(x, w, h, couleurs);
    const n = 8, dw = w / n, dh = h / 3.2;
    for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
      x.fillStyle = (i + j) % 2 ? "rgba(255,255,255,.13)" : "rgba(80,20,0,.13)";
      x.beginPath(); x.moveTo(i * dw + dw / 2, j * dh); x.lineTo(i * dw + dw, j * dh + dh / 2); x.lineTo(i * dw + dw / 2, j * dh + dh); x.lineTo(i * dw, j * dh + dh / 2); x.fill();
    }
    for (let y = 0; y < h; y += 3) { x.fillStyle = "rgba(0,0,0,.05)"; x.fillRect(0, y, w, 1); }
    x.fillStyle = bord; x.fillRect(0, h - 10, w, 10);
    x.fillStyle = "rgba(0,0,0,.3)"; x.beginPath(); x.moveTo(w / 2 - 22, 0); x.lineTo(w / 2, 34); x.lineTo(w / 2 + 22, 0); x.fill();
    x.strokeStyle = "rgba(90,20,10,.9)"; x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2 - 22, 0); x.lineTo(w / 2, 34); x.lineTo(w / 2 + 22, 0); x.stroke();
    bruit(x, w, h, 0.1, 3);
  },
  // zipped hoodie: zip down the front, drawstrings, kangaroo pocket
  sweat: ({ couleur, zip = true, cordons = "#F0F0F0" }) => (x, w, h) => {
    degrade(x, w, h, [couleur, couleur, shade(couleur, -0.2)]);
    if (zip) { x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(w / 2 - 2, 0, 4, h); x.fillStyle = "#C9C9C9"; for (let y = 4; y < h; y += 6) x.fillRect(w / 2 - 1, y, 2, 3); }
    x.fillStyle = cordons; x.fillRect(w / 2 - 14, 0, 3, 34); x.fillRect(w / 2 + 11, 0, 3, 30);
    x.strokeStyle = "rgba(0,0,0,.28)"; x.lineWidth = 2; x.strokeRect(w / 2 - 34, h * 0.6, 68, h * 0.28);
    x.fillStyle = shade(couleur, -0.25); x.fillRect(0, h - 9, w, 9);
    bruit(x, w, h, 0.09, 5);
  },
  // shirt or uniform: buttons, chest pockets with flaps, a badge, a belt
  chemise: ({ couleur, badge = null, ceinture = null, cravate = null, poches = true }) => (x, w, h) => {
    degrade(x, w, h, [shade(couleur, 0.08), couleur, shade(couleur, -0.15)]);
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(w / 2 - 1, 0, 2, h);
    x.fillStyle = shade(couleur, 0.35); for (let y = 16; y < h - 14; y += 18) { x.beginPath(); x.arc(w / 2 + 5, y, 2.5, 0, TAU); x.fill(); }
    if (poches) for (const s of [-1, 1]) {
      x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 2; x.strokeRect(w / 2 + s * 30 - 12, 22, 24, 22);
      x.fillStyle = shade(couleur, -0.12); x.fillRect(w / 2 + s * 30 - 13, 20, 26, 8);
    }
    if (cravate) { x.fillStyle = cravate; x.beginPath(); x.moveTo(w / 2 - 5, 0); x.lineTo(w / 2 + 5, 0); x.lineTo(w / 2 + 8, h * 0.62); x.lineTo(w / 2, h * 0.7); x.lineTo(w / 2 - 8, h * 0.62); x.fill(); }
    if (badge) {
      const bx = w / 2 + 30, by = 14;
      x.fillStyle = badge; x.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.5 : 10; x.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r); }
      x.fill();
    }
    if (ceinture) { x.fillStyle = ceinture; x.fillRect(0, h - 12, w, 12); x.fillStyle = "#C9B26A"; x.fillRect(w / 2 - 8, h - 12, 16, 12); }
    bruit(x, w, h, 0.07, 9);
  },
  // white lab coat: lapels open on the shirt and tie, side pockets, a pen in the breast pocket
  blouse: ({ chemise, cravate }) => (x, w, h) => {
    degrade(x, w, h, ["#F4F4F0", "#E9E9E4", "#D6D6D0"]);
    x.fillStyle = chemise; x.beginPath(); x.moveTo(w / 2 - 20, 0); x.lineTo(w / 2, h * 0.55); x.lineTo(w / 2 + 20, 0); x.fill();
    x.fillStyle = cravate; x.beginPath(); x.moveTo(w / 2 - 4, 0); x.lineTo(w / 2 + 4, 0); x.lineTo(w / 2 + 6, h * 0.45); x.lineTo(w / 2, h * 0.52); x.lineTo(w / 2 - 6, h * 0.45); x.fill();
    x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(w / 2 - 20, 0); x.lineTo(w / 2 - 2, h * 0.58); x.lineTo(w / 2 - 2, h); x.moveTo(w / 2 + 20, 0); x.lineTo(w / 2 + 2, h * 0.58); x.stroke();
    x.strokeRect(w / 2 + 26, 26, 22, 18); x.fillStyle = "#2F6FED"; x.fillRect(w / 2 + 32, 20, 3, 14);
    bruit(x, w, h, 0.05, 11);
  },
  // denim: blue weave, seams, pockets; short = shorts (the lower part is skin)
  jean: ({ couleur = "#4B6A92", peau = null, court = 0 }) => (x, w, h) => {
    degrade(x, w, h, [shade(couleur, 0.1), couleur, shade(couleur, -0.1)]);
    for (let i = 0; i < w; i += 2) { x.fillStyle = `rgba(255,255,255,${0.04 + 0.04 * alea(i)})`; x.fillRect(i, 0, 1, h); }
    x.strokeStyle = "rgba(230,180,90,.5)"; x.lineWidth = 1.5;
    for (const u of [0.25, 0.75]) { x.beginPath(); x.moveTo(u * w, 0); x.lineTo(u * w, h); x.stroke(); }
    if (court && peau) { x.fillStyle = peau; x.fillRect(0, h * court, w, h); x.fillStyle = shade(couleur, -0.15); x.fillRect(0, h * court - 5, w, 5); }
    bruit(x, w, h, 0.1, 13);
  },
  // camouflage cargo trousers
  camo: ({ couleurs = ["#5E6650", "#3E4436", "#7C7E68", "#2E322A"] }) => (x, w, h) => {
    x.fillStyle = couleurs[0]; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      x.fillStyle = couleurs[1 + (i % 3)]; x.beginPath();
      x.ellipse(alea(i * 3.1) * w, alea(i * 5.7) * h, 6 + alea(i) * 10, 4 + alea(i * 2) * 7, alea(i * 9) * 3, 0, TAU); x.fill();
    }
    x.strokeStyle = "rgba(0,0,0,.3)"; x.lineWidth = 2; x.strokeRect(w * 0.08, h * 0.45, w * 0.18, h * 0.22); x.strokeRect(w * 0.74, h * 0.45, w * 0.18, h * 0.22);
    bruit(x, w, h, 0.08, 17);
  },
  uni: ({ couleur, grain = 0.08 }) => (x, w, h) => { degrade(x, w, h, [shade(couleur, 0.06), couleur, shade(couleur, -0.12)]); bruit(x, w, h, grain, 19); },
  // a sleeve: short or long, with a cuff, stripes for a track jacket
  manche: ({ couleur, peau, court = 0, poignet = null, bandes = null }) => (x, w, h) => {
    degrade(x, w, h, [couleur, shade(couleur, -0.12)]);
    if (bandes) { x.fillStyle = bandes; x.fillRect(0, 0, 4, h); x.fillRect(8, 0, 4, h); }
    if (court && peau) { x.fillStyle = peau; x.fillRect(0, h * court, w, h); x.fillStyle = shade(couleur, -0.2); x.fillRect(0, h * court - 4, w, 4); }
    if (poignet) { x.fillStyle = poignet; x.fillRect(0, h - 8, w, 8); }
    bruit(x, w, h, 0.08, 23);
  },
  // trainers / boots: upper, sole, laces
  chaussure: ({ couleur, semelle = "#EDEDED", lacets = "#FFFFFF" }) => (x, w, h) => {
    x.fillStyle = couleur; x.fillRect(0, 0, w, h);
    x.fillStyle = semelle; x.fillRect(0, h * 0.72, w, h * 0.28);
    x.fillStyle = lacets; for (let i = 0; i < 4; i++) x.fillRect(w * 0.35, h * 0.12 + i * 6, w * 0.3, 2);
    bruit(x, w, h, 0.08, 29);
  },
  cheveux: ({ couleur }) => (x, w, h) => {
    x.fillStyle = couleur; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      x.strokeStyle = alea(i) > 0.5 ? `rgba(255,255,255,${0.06 + 0.1 * alea(i * 3)})` : `rgba(0,0,0,${0.12 + 0.15 * alea(i * 5)})`;
      x.lineWidth = 1 + alea(i * 7); const px = alea(i * 11) * w, py = alea(i * 13) * h * 0.4;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (alea(i * 17) - 0.5) * 12, py + h * 0.3, px + (alea(i * 19) - 0.5) * 16, py + h * 0.6); x.stroke();
    }
  },
};
function shade(c, k) {
  const n = parseInt(c.slice(1), 16), v = [n >> 16, (n >> 8) & 255, n & 255].map(x => clamp(Math.round(k > 0 ? x + (255 - x) * k : x * (1 + k)), 0, 255));
  return `#${v.map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

// ---------------------------------------------------------------- painted face (512 × 256 around the head, front in the middle)
const FX = 256, OEIL_Y = 118, OEIL_DX = 22, BOUCHE_Y = 170;
function dessinerVisage(x, s) {
  const w = 512, h = 256;
  if (s.ombre) {
    x.fillStyle = "#07080B"; x.fillRect(0, 0, w, h);
    for (const d of [-1, 1]) {
      const g = x.createRadialGradient(FX + d * OEIL_DX, OEIL_Y + 4, 0, FX + d * OEIL_DX, OEIL_Y + 4, 14);
      g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.45, "rgba(214,232,255,.9)"); g.addColorStop(1, "rgba(160,190,255,0)");
      x.fillStyle = g; x.beginPath(); x.ellipse(FX + d * OEIL_DX, OEIL_Y + 4, 13 * s.oeilSx, 7 * Math.max(0.15, s.ouvert), 0, 0, TAU); x.fill();
    }
    return;
  }
  // skin, darker towards the sides and under the jaw (painted volume, like the old games)
  x.fillStyle = s.peau; x.fillRect(0, 0, w, h);
  const cote = x.createLinearGradient(0, 0, w, 0);
  cote.addColorStop(0, "rgba(0,0,0,.28)"); cote.addColorStop(0.36, "rgba(0,0,0,0)"); cote.addColorStop(0.64, "rgba(0,0,0,0)"); cote.addColorStop(1, "rgba(0,0,0,.28)");
  x.fillStyle = cote; x.fillRect(0, 0, w, h);
  const bas = x.createLinearGradient(0, 180, 0, 232); bas.addColorStop(0, "rgba(0,0,0,0)"); bas.addColorStop(1, "rgba(0,0,0,.3)");
  x.fillStyle = bas; x.fillRect(0, 180, w, 76);
  for (const d of [-1, 1]) { const g = x.createRadialGradient(FX + d * 34, 150, 0, FX + d * 34, 150, 18); g.addColorStop(0, s.joues); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(FX + d * 34 - 20, 130, 40, 40); }
  if (s.barbe) {   // goatee and moustache
    x.fillStyle = s.barbe; x.globalAlpha = 0.85;
    x.beginPath(); x.ellipse(FX, BOUCHE_Y - 9, 18, 4, 0, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(FX - 12, BOUCHE_Y + 8); x.quadraticCurveTo(FX, BOUCHE_Y + 34, FX + 12, BOUCHE_Y + 8); x.lineTo(FX + 6, BOUCHE_Y + 12); x.quadraticCurveTo(FX, BOUCHE_Y + 22, FX - 6, BOUCHE_Y + 12); x.fill();
    x.globalAlpha = 1;
  }
  // nose: a shadow on one side, nostrils
  x.fillStyle = "rgba(90,40,20,.22)"; x.beginPath(); x.moveTo(FX - 3, OEIL_Y + 10); x.quadraticCurveTo(FX - 10, 140, FX - 9, 150); x.lineTo(FX - 3, 150); x.fill();
  x.fillStyle = "rgba(60,25,15,.5)"; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(FX + d * 5, 151, 3, 1.6, 0, 0, TAU); x.fill(); }
  // eyes
  for (const d of [-1, 1]) {
    const ex = FX + d * OEIL_DX, ey = OEIL_Y + s.oeilY;
    if (s.ferme > 0.5) {
      x.strokeStyle = "#2A1A14"; x.lineWidth = 3; x.beginPath(); x.arc(ex, ey + 4, 8, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    } else {
      const ry = 6 * s.oeilSy * s.ouvert, rx = 10 * s.oeilSx;
      if (ry > 0.6) {
        x.fillStyle = "#F4F1EA"; x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, TAU); x.fill();
        x.save(); x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, TAU); x.clip();
        const ix = ex + s.regardX * 4, iy = ey - s.regardY * 2;
        x.fillStyle = s.iris; x.beginPath(); x.arc(ix, iy, 5, 0, TAU); x.fill();
        x.fillStyle = "#0E0B0A"; x.beginPath(); x.arc(ix, iy, 2.3, 0, TAU); x.fill();
        x.fillStyle = "#FFFFFF"; x.fillRect(ix + 1, iy - 3, 2, 2);
        x.restore();
      }
      x.strokeStyle = "#1E1410"; x.lineWidth = 2.6;   // upper lid and lashes
      x.beginPath(); x.ellipse(ex, ey + 0.5, rx + 1, Math.max(ry, 1) + 0.6, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
      x.strokeStyle = "rgba(60,30,20,.35)"; x.lineWidth = 1.2; x.beginPath(); x.ellipse(ex, ey, rx, Math.max(ry, 1), 0, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
    }
    // eyebrow (positive tilt = inner end raised)
    const by = ey - 15 - s.sourcilY * 260 - (d > 0 ? s.sourcilAsym * 260 : 0), t = -d * s.sourcilTilt * 0.55;
    x.save(); x.translate(ex, by); x.rotate(t); x.fillStyle = s.sourcil; x.beginPath(); x.ellipse(0, 0, 12, 2.6, 0, 0, TAU); x.fill(); x.restore();
  }
  // mouth
  const mx = FX + s.boucheX * 300, my = BOUCHE_Y, l = 15 * s.boucheS;
  x.save(); x.translate(mx, my); x.rotate(-s.boucheRot);
  const levre = s.levres, ouv = Math.max(s.parle, s.bouche === "o" ? 0.9 : 0);
  if (ouv > 0.05) {
    x.fillStyle = "#3A1414"; x.beginPath(); x.ellipse(0, 1, l * (s.bouche === "o" ? 0.55 : 0.8), 2 + 8 * ouv, 0, 0, TAU); x.fill();
    x.fillStyle = "#EDE6DC"; x.fillRect(-l * 0.5, -2 - 3 * ouv + 1, l, 2.5);
    x.strokeStyle = levre; x.lineWidth = 2.4; x.beginPath(); x.ellipse(0, 1, l * (s.bouche === "o" ? 0.55 : 0.8) + 1, 3 + 8 * ouv, 0, 0, TAU); x.stroke();
  } else if (s.bouche === "sourire") {
    x.fillStyle = "#3A1414"; x.beginPath(); x.moveTo(-l, -2); x.quadraticCurveTo(0, 12, l, -2); x.quadraticCurveTo(0, 4, -l, -2); x.fill();
    x.fillStyle = "#EDE6DC"; x.beginPath(); x.moveTo(-l * 0.8, -1); x.quadraticCurveTo(0, 5, l * 0.8, -1); x.quadraticCurveTo(0, 2, -l * 0.8, -1); x.fill();
    x.strokeStyle = levre; x.lineWidth = 2.6; x.beginPath(); x.moveTo(-l, -2); x.quadraticCurveTo(0, 12, l, -2); x.stroke();
  } else if (s.bouche === "triste") {
    x.strokeStyle = levre; x.lineWidth = 3.4; x.beginPath(); x.moveTo(-l * 0.85, 4); x.quadraticCurveTo(0, -4, l * 0.85, 4); x.stroke();
  } else if (s.bouche === "vague") {
    x.strokeStyle = levre; x.lineWidth = 3; x.beginPath(); x.moveTo(-l * 0.8, 0); x.quadraticCurveTo(-l * 0.4, -4, 0, 0); x.quadraticCurveTo(l * 0.4, 4, l * 0.8, 0); x.stroke();
  } else {
    x.fillStyle = levre; x.beginPath(); x.ellipse(0, 2.5, l * 0.72, 3.2, 0, 0, TAU); x.fill();          // lower lip
    x.strokeStyle = shade(levre, -0.35); x.lineWidth = 2.2; x.beginPath(); x.moveTo(-l * 0.8, 0); x.quadraticCurveTo(0, s.bouche === "ligne" ? 0 : 1.5, l * 0.8, 0); x.stroke();
  }
  x.restore();
}

// ---------------------------------------------------------------- the cast (PS2 designs of the six roles)
const PEAUX = ["#F1C9A5", "#E2AE84", "#C98E62", "#A86E48", "#7A4A2E", "#5A3420"];
function design(role, g) {
  const r = n => alea(g * 13 + n);
  switch (role) {
    case "sujet": return { // a young woman, auburn hair, a warm knitted sweater
      peau: "#EDC2A0", iris: "#3E7A4A", cheveux: "#7A2A1E", coiffure: "meches", levres: "#B5504A",
      haut: PEINTURES.tricot({ couleurs: ["#F2C23A", "#E8862E", "#C24A2A"], bord: "#6A2E8A" }), hautCouleur: "#E8862E",
      manche: { couleur: "#F0B23A", court: 0.55, poignet: null }, poignet: "#7A3AB0",
      bas: PEINTURES.jean({ couleur: "#3F5E86" }), basCouleur: "#3F5E86", jambeBas: null, chaussure: { couleur: "#F2F2EE", semelle: "#D84A3A" },
    };
    case "autre": return { // a young man, short black hair, teal hoodie, camouflage cargo trousers, a strap across
      peau: "#B47A52", iris: "#3A2416", cheveux: "#17120F", coiffure: "court", levres: "#8A4A3A",
      haut: PEINTURES.sweat({ couleur: "#1F9C92" }), hautCouleur: "#1F9C92",
      manche: { couleur: "#1F9C92", bandes: "#F0F0F0" }, sangle: "#4A4E3A",
      bas: PEINTURES.camo({}), basCouleur: "#5E6650", chaussure: { couleur: "#E8E6E0", semelle: "#2A2A2A", lacets: "#2A2A2A" },
    };
    case "chercheur": return { // the researcher: lab coat, shirt and tie, glasses, greying hair, a clipboard
      peau: "#F0CDB0", iris: "#4A6A8A", cheveux: "#6E655C", coiffure: "raie", levres: "#B07060", lunettes: true, blouse: true,
      haut: PEINTURES.blouse({ chemise: "#66788F", cravate: "#2C3B57" }), hautCouleur: "#EDEDE8",
      manche: { couleur: "#EDEDE8" }, bas: PEINTURES.uni({ couleur: "#3E434C" }), basCouleur: "#3E434C", chaussure: { couleur: "#4A3426", semelle: "#2A1E16", lacets: "#2A1E16" },
    };
    case "autorite": return { // authority: navy uniform, peaked cap, mirrored sunglasses, a goatee
      peau: "#6E4028", iris: "#2A1A10", cheveux: "#120E0C", coiffure: "ras", levres: "#6A3A2A", barbe: "#1A120E", casquette: true, lunettesNoires: true,
      haut: PEINTURES.chemise({ couleur: "#2C3B57", badge: "#E2B53E", ceinture: "#141418" }), hautCouleur: "#2C3B57",
      manche: { couleur: "#2C3B57" }, bas: PEINTURES.uni({ couleur: "#222C40" }), basCouleur: "#222C40", chaussure: { couleur: "#141418", semelle: "#0A0A0C", lacets: "#222" },
    };
    case "ombre": return { // the shadow: a hooded figure all in black, two pale lights for eyes
      ombre: true, peau: "#07080B", iris: "#FFF", cheveux: "#0C0D12", coiffure: "capuche", levres: "#000",
      haut: PEINTURES.sweat({ couleur: "#16181F", zip: false, cordons: "#2A2E3A" }), hautCouleur: "#16181F",
      manche: { couleur: "#16181F" }, bas: PEINTURES.uni({ couleur: "#101218" }), basCouleur: "#101218", chaussure: { couleur: "#0E0F14", semelle: "#1A1C22", lacets: "#1A1C22" },
    };
    default: { // the crowd: everyday people, a different one for every seed
      const peau = PEAUX[Math.floor(r(1) * PEAUX.length)], femme = r(2) > 0.45;
      const hauts = ["#8C9096", "#A9AEB6", "#6E737B", "#B7AE9C", "#7C8470", "#5E6878", "#8A6E5A", "#6A5A7A", "#A88A6A", "#4E6A6A"], c = hauts[Math.floor(r(3) * hauts.length)];
      const cheveux = ["#1A1410", "#3A2618", "#6A4A2A", "#A88A5A", "#2A2A2E", "#8A8A88"][Math.floor(r(4) * 6)];
      return {
        peau, iris: ["#3A2416", "#4A6A8A", "#3E6A4A", "#5A4028"][Math.floor(r(5) * 4)], cheveux, levres: shade(peau, -0.3),
        coiffure: femme ? (r(6) > 0.5 ? "queue" : "carre") : (r(7) > 0.7 ? "ras" : "court"),
        haut: r(8) > 0.5 ? PEINTURES.sweat({ couleur: c, zip: r(9) > 0.5 }) : PEINTURES.chemise({ couleur: c, poches: r(10) > 0.4 }), hautCouleur: c,
        manche: { couleur: c, court: r(11) > 0.6 ? 0.5 : 0 },
        bas: r(12) > 0.4 ? PEINTURES.jean({ couleur: ["#3F5E86", "#2E3E5A", "#5A6E8E"][Math.floor(r(13) * 3)] }) : PEINTURES.uni({ couleur: ["#4A4036", "#2E2E32", "#6A6050"][Math.floor(r(14) * 3)] }),
        basCouleur: "#3F5E86", chaussure: { couleur: ["#2A2A2E", "#EDEDED", "#5A3E2A"][Math.floor(r(15) * 3)] },
      };
    }
  }
}

// ---------------------------------------------------------------- the figure
export const ROLES_PS2 = {
  sujet: { ...ROLES.sujet, look: "Jeune femme, cheveux auburn, pull tricoté ambre, jean, baskets." },
  autre: { ...ROLES.autre, look: "Jeune homme, sweat zippé bleu canard, cargo camouflage, sangle en travers." },
  foule: { ...ROLES.foule, look: "Des gens ordinaires : une personne différente à chaque graine." },
  chercheur: { ...ROLES.chercheur, look: "Blouse blanche, chemise ardoise et cravate, lunettes, bloc-notes." },
  autorite: { ...ROLES.autorite, look: "Uniforme bleu marine, casquette, lunettes miroir, bouc." },
  ombre: { ...ROLES.ombre, look: "Silhouette en capuche, tout en noir, deux lueurs pâles pour les yeux." },
};
const ombrePortee = (() => { let t = null; return () => t || (t = toile(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); })); })();

export function creerQuidamPS2(options = {}) {
  const roleCle = ROLES[options.role] ? options.role : "foule";
  const role = ROLES[roleCle], graine = options.graine ?? 1, d = design(roleCle, graine);
  const lambert = o => new THREE.MeshLambertMaterial(o);
  const tex = (peinture, w = 128, h = 128) => toile(w, h, peinture);
  const matPeau = lambert({ color: d.peau });
  const matHaut = lambert({ map: tex(d.haut, 256, 128) });
  const matManche = lambert({ map: tex(PEINTURES.manche({ ...d.manche, peau: d.peau }), 64, 64) });
  const matAvantBras = d.manche.court ? matPeau : lambert({ map: tex(PEINTURES.manche({ ...d.manche, court: 0, poignet: d.manche.poignet || shade(d.manche.couleur, -0.2) }), 64, 64) });
  const matBas = lambert({ map: tex(d.bas, 128, 128) });
  const matChaussure = lambert({ map: tex(PEINTURES.chaussure(d.chaussure), 64, 64) });
  const matCheveux = lambert({ map: tex(PEINTURES.cheveux({ couleur: d.cheveux }), 128, 128) });
  if (d.ombre) for (const m of [matHaut, matManche, matAvantBras, matBas, matChaussure, matCheveux]) { m.emissive = new THREE.Color("#141824"); }
  const visage = document.createElement("canvas"); visage.width = 512; visage.height = 256;
  const texVisage = new THREE.CanvasTexture(visage); texVisage.colorSpace = THREE.SRGBColorSpace; texVisage.generateMipmaps = false; texVisage.minFilter = THREE.LinearFilter;
  const matVisage = lambert({ map: texVisage, ...(d.ombre ? { emissive: "#FFFFFF", emissiveMap: texVisage } : {}) });

  const piv = (parent, pos, ordre) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); if (ordre) g.rotation.order = ordre; parent.add(g); return g; };
  const mesh = (geo, m, parent, pos, rot, ech) => {
    const o = new THREE.Mesh(geo, m); if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); if (ech) o.scale.set(...ech); parent.add(o); return o;
  };
  // cylinders and spheres are turned so that their texture's middle faces the front (+Z)
  const cyl = (r1, r2, h, n = 8) => new THREE.CylinderGeometry(r1, r2, h, n, 1, false, Math.PI);
  const boule = (r, w = 10, h = 8, ...a) => new THREE.SphereGeometry(r, w, h, -Math.PI / 2, TAU, ...a);

  const racine = new THREE.Group(); racine.name = `quidam:${roleCle}`;
  const corps = piv(racine); corps.scale.setScalar(options.taille ?? 1);
  const blob = mesh(new THREE.CircleGeometry(0.34, 16), new THREE.MeshBasicMaterial({ map: ombrePortee(), transparent: true, depthWrite: false }), racine, [0, 0.006, 0], [-Math.PI / 2, 0, 0]);
  blob.renderOrder = -1;

  const bassin = piv(corps, [0, HANCHE, 0], "YXZ");
  mesh(cyl(0.15, 0.158, 0.2, 10), matBas, bassin, [0, 0.0, 0], null, [1, 1, 0.66]);
  const buste = piv(bassin, null, "YXZ");
  const torse = mesh(cyl(0.178, 0.148, 0.46, 10), matHaut, buste, [0, 0.29, 0], null, [1, 1, 0.62]);
  mesh(new THREE.SphereGeometry(0.16, 10, 6), lambert({ color: d.hautCouleur }), buste, [0, 0.505, 0], null, [1.12, 0.3, 0.6]);
  const cou = piv(buste, [0, COU, 0], "YXZ");
  mesh(cyl(0.046, 0.052, 0.12, 8), matPeau, cou, [0, 0.03, 0]);
  const tete = piv(cou, [0, TETE_Y, 0]);
  mesh(boule(TETE.r, 14, 12), matVisage, tete, null, null, [TETE.sx, TETE.sy, TETE.sz]);
  if (!d.ombre) {
    const nez = mesh(new THREE.ConeGeometry(0.016, 0.04, 4), matPeau, tete, [0, -0.012, 0.1], [Math.PI / 2 + 0.25, Math.PI / 4, 0]);
    nez.scale.set(1, 1, 0.8);
    for (const s of [1, -1]) mesh(new THREE.SphereGeometry(0.022, 6, 5), matPeau, tete, [s * 0.1, 0.0, -0.005], null, [0.45, 1, 0.75]);
  }
  coiffer(tete, d, matCheveux, mesh, boule);

  const bras = {};
  for (const [cote, s] of [["G", 1], ["D", -1]]) {
    const epaule = piv(buste, [s * EPAULE.x, EPAULE.y, 0], "ZXY");
    mesh(new THREE.SphereGeometry(0.052, 8, 6), d.blouse ? lambert({ color: "#EDEDE8" }) : lambert({ color: d.hautCouleur }), epaule);
    mesh(cyl(0.054, 0.046, BRAS), matManche, epaule, [0, -BRAS / 2, 0]);
    const coude = piv(epaule, [0, -BRAS, 0]);
    mesh(new THREE.SphereGeometry(0.046, 8, 6), d.manche.court ? matPeau : matAvantBras, coude);
    mesh(cyl(0.045, 0.036, AVANT_BRAS), matAvantBras, coude, [0, -AVANT_BRAS / 2, 0]);
    const main = piv(coude, [0, -AVANT_BRAS, 0]);
    mesh(new THREE.BoxGeometry(0.07, 0.1, 0.034), matPeau, main, [0, -0.05, 0]);
    mesh(new THREE.BoxGeometry(0.024, 0.055, 0.026), matPeau, main, [s * 0.038, -0.035, 0.012], [0, 0, s * 0.35]);
    if (cote === "G" && d.poignet) mesh(cyl(0.04, 0.04, 0.03), lambert({ color: d.poignet }), coude, [0, -AVANT_BRAS + 0.03, 0]);
    const hanche = piv(bassin, [s * 0.095, 0, 0]);
    mesh(cyl(0.078, 0.06, CUISSE), matBas, hanche, [0, -CUISSE / 2, 0]);
    const genou = piv(hanche, [0, -CUISSE, 0]);
    mesh(new THREE.SphereGeometry(0.06, 8, 6), matBas, genou);
    mesh(cyl(0.058, 0.045, JAMBE), matBas, genou, [0, -JAMBE / 2, 0]);
    mesh(new THREE.BoxGeometry(0.1, 0.075, 0.25), matChaussure, genou, [0, -JAMBE - 0.03, 0.045]);
    bras[cote] = { epaule, coude, main, hanche, genou };
  }
  // the lab coat goes down to the knees, the strap across the chest
  if (d.blouse) {
    mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.5, 10, 1, true, 0.3, TAU - 0.6), lambert({ color: "#E6E6E0", side: THREE.DoubleSide }), bassin, [0, -0.2, 0], null, [1, 1, 0.72]);   // open at the front
    const bloc = piv(bras.G.main, [0, -0.06, 0.06]); bloc.rotation.set(-0.7, 0, 0);
    mesh(new THREE.BoxGeometry(0.2, 0.28, 0.012), lambert({ color: "#B98B5B" }), bloc, [0, -0.08, 0]);
    mesh(new THREE.BoxGeometry(0.17, 0.22, 0.004), lambert({ map: tex((x, w, h) => { x.fillStyle = "#FAFAF7"; x.fillRect(0, 0, w, h); x.fillStyle = "#9BA1AA"; for (let i = 0; i < 9; i++) x.fillRect(10, 18 + i * 12, i % 3 === 2 ? 60 : 100, 3); }, 128, 160) }), bloc, [0, -0.1, 0.008]);
  }
  if (d.sangle) {
    const b = mesh(new THREE.BoxGeometry(0.06, 0.62, 0.02), lambert({ color: d.sangle }), buste, [0, 0.3, 0.115], [0, 0, 0.62]);
    b.scale.z = 1;
  }
  // glasses: thin dark frames; sunglasses: shiny mirrored lenses with a purple sheen
  if (d.lunettes) for (const s of [1, -1]) {
    mesh(new THREE.TorusGeometry(0.018, 0.0028, 4, 14), lambert({ color: "#1C1E24" }), tete, [s * 0.031, 0.014, 0.103], [0, s * 0.18, 0], [1.35, 0.8, 1]);
    mesh(new THREE.BoxGeometry(0.004, 0.004, 0.09), lambert({ color: "#1C1E24" }), tete, [s * 0.094, 0.018, 0.05]);
    if (s > 0) mesh(new THREE.BoxGeometry(0.014, 0.003, 0.003), lambert({ color: "#1C1E24" }), tete, [0, 0.018, 0.108]);
  }
  if (d.lunettesNoires) {
    const reflet = toile(64, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, w * 0.3, h); g.addColorStop(0, "#F4E8FF"); g.addColorStop(0.35, "#9A6AE0"); g.addColorStop(0.7, "#3A2A8A"); g.addColorStop(1, "#C8B8FF"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    const verre = new THREE.MeshPhongMaterial({ map: reflet, shininess: 110, specular: "#FFFFFF" });
    for (const s of [1, -1]) {
      mesh(new THREE.SphereGeometry(0.03, 12, 8), verre, tete, [s * 0.04, 0.014, 0.098], [0, s * 0.25, 0], [1.25, 0.72, 0.3]);
      mesh(new THREE.BoxGeometry(0.006, 0.008, 0.1), lambert({ color: "#D8D8DC" }), tete, [s * 0.098, 0.02, 0.048]);
    }
    mesh(new THREE.BoxGeometry(0.03, 0.008, 0.008), lambert({ color: "#D8D8DC" }), tete, [0, 0.022, 0.108]);
  }
  if (d.casquette) {
    const bleu = lambert({ color: "#1A2338" });
    mesh(new THREE.CylinderGeometry(0.128, 0.118, 0.07, 14), bleu, tete, [0, 0.1, -0.005]);
    mesh(new THREE.CylinderGeometry(0.14, 0.128, 0.035, 14), bleu, tete, [0, 0.145, -0.01]);
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, -Math.PI / 2, Math.PI), lambert({ color: "#0C0E14" }), tete, [0, 0.07, 0.07], [0.15, 0, 0], [1, 1, 0.9]);
    mesh(new THREE.BoxGeometry(0.03, 0.03, 0.006), lambert({ color: "#E2B53E" }), tete, [0, 0.11, 0.125]);
  }

  racine.traverse(o => { if (o.isMesh && o !== blob) { o.castShadow = false; o.receiveShadow = false; } });

  // ---- state, as in lib/quidams.js
  const etat = { poseA: "debout", poseB: role.pose, poseK: 1, exprA: "neutre", exprB: "neutre", exprK: 0, regardX: 0, regardY: 0, parle: 0, t: 0 };
  const v = {}, phase = alea(graine) * TAU, periodeClin = 3.1 + alea(graine + 7) * 2.6;
  let derniere = "";
  function appliquer() {
    const t = etat.t, A = POSES[etat.poseA], B = POSES[etat.poseB];
    for (const k in POSES.debout) v[k] = lerp(A[k], B[k], etat.poseK);
    const EA = EXPRESSIONS[etat.exprA], EB = EXPRESSIONS[etat.exprB], e = {};
    for (const k in EA) e[k] = k === "bouche" ? (etat.exprK < 0.5 ? EA.bouche : EB.bouche) : lerp(EA[k], EB[k], etat.exprK);
    const souffle = Math.sin((t * TAU) / 3.8 + phase);
    v.teteX += 0.018 * Math.sin((t * TAU) / 4.7 + phase * 1.3); v.teteZ += 0.012 * Math.sin((t * TAU) / 6.3 + phase * 0.7);
    v.epauleGZ += 0.014 * souffle; v.epauleDZ -= 0.014 * souffle; v.bassinRY += 0.015 * Math.sin((t * TAU) / 7.4 + phase);
    const marche = (etat.poseA === "marche" ? 1 - etat.poseK : 0) + (etat.poseB === "marche" ? etat.poseK : 0);
    if (marche > 0) {
      const p = (t * TAU) / 1.05 + phase, sp = Math.sin(p), cp = Math.cos(p);
      v.hancheGX += marche * 0.42 * sp; v.hancheDX -= marche * 0.42 * sp;
      v.genouG += marche * (0.1 + 0.6 * Math.max(0, -cp)); v.genouD += marche * (0.1 + 0.6 * Math.max(0, cp));
      v.epauleGX -= marche * 0.36 * sp; v.epauleDX += marche * 0.36 * sp;
      v.bassinY += marche * 0.022 * Math.cos(2 * p); v.busteY += marche * 0.07 * sp; v.teteY -= marche * 0.05 * sp; v.bassinRY -= marche * 0.05 * sp;
    }
    const gx = clamp(e.regardX + etat.regardX, -1, 1), gy = clamp(e.regardY + etat.regardY, -1, 1);
    bassin.position.y = HANCHE + v.bassinY;
    bassin.rotation.set(v.bassinX, v.bassinRY, 0);
    buste.rotation.set(v.busteX, v.busteY, v.busteZ);
    torse.scale.set(1 + 0.006 * souffle, 1, 0.62 * (1 + 0.01 * souffle));
    cou.rotation.set(v.teteX + e.teteX - gy * 0.1, v.teteY + gx * 0.2, v.teteZ + e.teteZ);
    for (const [c, s] of [["G", 1], ["D", -1]]) {
      const b = bras[c];
      b.epaule.position.set(s * EPAULE.x, EPAULE.y + v.epaulesY, 0);
      b.epaule.rotation.set(v[`epaule${c}X`], v[`epaule${c}Y`], v[`epaule${c}Z`] - s * 0.06);   // slimmer body: arms a little closer
      b.coude.rotation.set(v[`coude${c}`], 0, 0);
      b.hanche.rotation.set(v[`hanche${c}X`], 0, v[`hanche${c}Z`]);
      b.genou.rotation.set(v[`genou${c}`], 0, 0);
    }
    // face: blink, expression, speech; repainted only when it changes
    const local = (((t + alea(graine + 3) * periodeClin) % periodeClin) + periodeClin) % periodeClin;
    const clin = local < 0.16 ? Math.sin((Math.PI * local) / 0.16) : 0;
    const s = {
      ombre: d.ombre, peau: d.peau, iris: d.iris, levres: d.levres, sourcil: shade(d.cheveux, 0.05), barbe: d.barbe, joues: "rgba(220,90,80,.16)",
      oeilSx: e.oeilSx, oeilSy: e.oeilSy, oeilY: e.oeilY * 300, ferme: e.ferme, ouvert: (1 - 0.92 * clin) * (1 - e.ferme),
      sourcilY: e.sourcilY, sourcilTilt: e.sourcilTilt, sourcilAsym: e.sourcilAsym, bouche: e.bouche, boucheS: e.boucheS, boucheX: e.boucheX, boucheRot: e.boucheRot,
      regardX: gx, regardY: gy, parle: etat.parle,
    };
    const cle = JSON.stringify(s, (k, val) => (typeof val === "number" ? Math.round(val * 20) / 20 : val));
    if (cle !== derniere) { derniere = cle; dessinerVisage(visage.getContext("2d"), s); texVisage.needsUpdate = true; }
  }

  const perso = {
    objet: racine, role: roleCle, nom: role.nom, look: ROLES_PS2[roleCle].look,
    articulations: {
      bassin, buste, cou, tete,
      epauleG: bras.G.epaule, coudeG: bras.G.coude, mainG: bras.G.main, epauleD: bras.D.epaule, coudeD: bras.D.coude, mainD: bras.D.main,
      hancheG: bras.G.hanche, genouG: bras.G.genou, hancheD: bras.D.hanche, genouD: bras.D.genou,
    },
    pose(nom, k = 1) { return perso.transitionPose("debout", nom, k); },
    transitionPose(de, vers, k) { etat.poseA = POSES[de] ? de : "debout"; etat.poseB = POSES[vers] ? vers : "debout"; etat.poseK = clamp(k, 0, 1); appliquer(); return perso; },
    expression(nom, k = 1) { return perso.transitionExpression("neutre", nom, k); },
    transitionExpression(de, vers, k) { etat.exprA = EXPRESSIONS[de] ? de : "neutre"; etat.exprB = EXPRESSIONS[vers] ? vers : "neutre"; etat.exprK = clamp(k, 0, 1); appliquer(); return perso; },
    regarder(x = 0, y = 0) { etat.regardX = clamp(x, -1, 1); etat.regardY = clamp(y, -1, 1); appliquer(); return perso; },
    /** Mouth open 0..1 while speaking (drive it with the voice). */
    parler(k = 0) { etat.parle = clamp(k, 0, 1); appliquer(); return perso; },
    animer(t) { etat.t = t; appliquer(); return perso; },
  };
  appliquer();
  return perso;
}

// hair styles (and the Shadow's hood) around the head
function coiffer(tete, d, m, mesh, boule) {
  const r = TETE.r * 1.07, ech = [TETE.sx, TETE.sy, TETE.sz];
  // a part of a sphere over the skull; `ouvert` leaves a gap of that angle at the front (for the face)
  const calotte = (debut, longueur, ouvert = 0) => new THREE.SphereGeometry(r, 14, 10, Math.PI / 2 + ouvert / 2, TAU - ouvert, debut, longueur);
  // the hairline stays above the eyebrows at the front (top cap down to 62°), hair goes lower on the sides and back
  const dessus = () => mesh(calotte(0, Math.PI * 0.345), m, tete, [0, 0.006, -0.004], null, ech);
  const arriere = (bas = 0.62, ouvert = 2.2) => mesh(calotte(Math.PI * 0.3, Math.PI * (bas - 0.3), ouvert), m, tete, [0, 0, -0.004], null, ech);
  switch (d.coiffure) {
    case "capuche": {
      const capuche = mesh(new THREE.SphereGeometry(TETE.r * 1.35, 12, 10, Math.PI / 2 + 0.9, TAU - 1.8, 0, Math.PI * 0.78), m, tete, [0, 0.01, -0.012], null, [1, 1.15, 1.05]);
      capuche.material.side = THREE.DoubleSide;
      break;
    }
    case "ras": dessus(); arriere(0.5, 2.6); break;
    case "court": dessus(); arriere(0.56, 2.4); break;
    case "raie":
      dessus(); arriere(0.56, 2.4);
      mesh(new THREE.BoxGeometry(0.1, 0.025, 0.05), m, tete, [0.025, 0.1, 0.06], [0.45, 0, -0.18]);
      break;
    case "carre":
      dessus(); arriere(0.6, 2.2);
      mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.08, 0.15, 14, 1, true, 0.75, TAU - 1.5), m, tete, [0, -0.045, -0.012], null, [TETE.sx, 1, TETE.sz]).material.side = THREE.DoubleSide;
      break;
    case "queue":
      dessus(); arriere(0.6, 2.4);
      mesh(new THREE.ConeGeometry(0.04, 0.22, 7), m, tete, [0, -0.04, -0.13], [Math.PI - 0.35, 0, 0]);
      break;
    case "meches": {
      // messy shoulder-length hair: the cap, a curtain behind and on the sides, a fringe of locks above the eyebrows
      mesh(calotte(0, Math.PI * 0.36), m, tete, [0, 0.008, -0.004], null, [TETE.sx * 1.04, TETE.sy, TETE.sz * 1.03]);
      arriere(0.62, 2.0);
      mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.22, 0.2, 14, 1, true, 0.95, TAU - 1.9), m, tete, [0, -0.07, -0.012], null, [TETE.sx, 1, TETE.sz]).material.side = THREE.DoubleSide;
      [[-0.05, 0.068, 0.092, 0.35], [-0.017, 0.074, 0.098, 0.1], [0.018, 0.074, 0.098, -0.12], [0.05, 0.066, 0.09, -0.35]]
        .forEach(([x, y, z, rz]) => mesh(new THREE.BoxGeometry(0.036, 0.05, 0.016), m, tete, [x, y, z], [0.35, 0, rz]));
      for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.03, 0.13, 0.03), m, tete, [sx * 0.092, -0.04, 0.035], [0.1, 0, sx * 0.12]);
      break;
    }
    default: dessus(); arriere(0.55, 2.4);
  }
}

/** A sky of an old console game: deep blue at the top, painted clouds, drawn small then enlarged (soft). */
export function cielPS2(ctx, x0, y0, w, h, graine = 1) {
  const c = document.createElement("canvas"); c.width = Math.round(w / 6); c.height = Math.round(h / 6);
  const x = c.getContext("2d"), W = c.width, H = c.height;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2A3FB8"); g.addColorStop(0.55, "#6A86E0"); g.addColorStop(1, "#C8D6F4");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) {
    const cx = alea(graine * 5 + i) * W, cy = (0.15 + 0.5 * alea(graine * 9 + i)) * H, r = (0.08 + 0.12 * alea(i * 3 + graine)) * W;
    for (let k = 0; k < 5; k++) {
      const gg = x.createRadialGradient(cx + (k - 2) * r * 0.5, cy + Math.sin(k) * r * 0.2, 0, cx + (k - 2) * r * 0.5, cy + Math.sin(k) * r * 0.2, r * 0.7);
      gg.addColorStop(0, "rgba(255,255,255,.75)"); gg.addColorStop(0.6, "rgba(240,244,255,.35)"); gg.addColorStop(1, "rgba(220,230,255,0)");
      x.fillStyle = gg; x.fillRect(0, 0, W, H);
    }
  }
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(c, x0, y0, w, h); ctx.restore();
}
/** Ground of an old console game: a small repeated texture (grass, or concrete), softly filtered. */
export function solPS2(type = "herbe", taille = 40) {
  const t = toile(64, 64, (x, w, h) => {
    x.fillStyle = type === "herbe" ? "#4E7A2E" : "#9A9890"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const r = alea(i * 1.3);
      x.fillStyle = type === "herbe" ? (r > 0.6 ? "#6E9A3E" : r > 0.3 ? "#3E6424" : "#5C8A34") : (r > 0.6 ? "#AEACA4" : r > 0.3 ? "#86847C" : "#94928A");
      x.fillRect(Math.floor(alea(i * 2.7) * w), Math.floor(alea(i * 3.9) * h), 1 + Math.floor(r * 2), 1 + Math.floor(alea(i) * 2));
    }
    if (type !== "herbe") { x.strokeStyle = "rgba(0,0,0,.25)"; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, h - 1); }
  });
  t.wrapT = THREE.RepeatWrapping; t.repeat.set(taille / 2, taille / 2);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), new THREE.MeshLambertMaterial({ map: t }));
  p.rotation.x = -Math.PI / 2;
  return p;
}
