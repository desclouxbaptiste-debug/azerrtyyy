// Casting sheet for lib/quidams.js: the six roles, the eight expressions, the ten poses. One still per page:
// render(0.5) = roles, render(1.5) = expressions, render(2.5) = poses. Each figure is rendered by three.js into an
// offscreen WebGL canvas and drawn into the 2D page, the same way a 3D figure would be dropped into a video scene.
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidam, creerFoule, creerChaise, ROLES, NOMS } from "../lib/quidams.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");

const studio = creerStudio();

function shot(x, y, w, h, objects, { fov = 22, pos = [1.0, 1.3, 6.0], target = [0, 1.0, 0] } = {}) {
  studio.plateau.clear();
  for (const o of objects) studio.plateau.add(o);
  studio.tourner(ctx, x, y, w, h, { fov, pos, cible: target });
}

// ---------------------------------------------------------------- 2D page
function background(title, sub) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, "#F4F1EB"); g.addColorStop(1, "#D6D1C6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(title, W / 2, 120, 76, "MontX", "#22242A");
  text(sub, W / 2, 182, 30, "MontS", "#6B6E76");
}
function text(s, x, y, size, font, color, align = "center") {
  ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
}
function wrap(s, x, y, maxW, size, font, color, lh = 1.3) {
  ctx.font = `${size}px ${font}`;
  const lines = [""];
  for (const word of s.split(" ")) {
    const test = lines[lines.length - 1] ? lines[lines.length - 1] + " " + word : word;
    if (ctx.measureText(test).width > maxW && lines[lines.length - 1]) lines.push(word); else lines[lines.length - 1] = test;
  }
  lines.forEach((l, i) => text(l, x, y + i * size * lh, size, font, color));
}
function chip(x, y, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 2; ctx.stroke();
}

// ---------------------------------------------------------------- pages
const T = 0.6; // breathing / blink phase used for the stills

function pageRoles() {
  background("LES QUIDAMS", "le casting · six rôles, une seule silhouette");
  const roles = Object.keys(ROLES);
  roles.forEach((r, i) => {
    const cx = (i % 3) * 360, cy = 250 + Math.floor(i / 3) * 820;
    const q = creerQuidam({ role: r, graine: i + 2 });
    q.animer(T);
    shot(cx, cy, 360, 600, [q.objet]);
    q.liberer();
    text(ROLES[r].nom, cx + 180, cy + 628, 34, "MontX", "#22242A");
    chip(cx + 180, cy + 672, ROLES[r].couleur);
    wrap(ROLES[r].usage, cx + 180, cy + 712, 310, 21, "MontS", "#5A5D65");
  });
}

function pageExpressions() {
  background("8 EXPRESSIONS", "pas de bouche au repos · elle n'apparaît qu'avec l'émotion");
  Object.keys(NOMS.expressions).forEach((nom, i) => {
    const cx = (i % 2) * 540, cy = 240 + Math.floor(i / 2) * 415;
    const q = creerQuidam({ role: "sujet", graine: 3 });
    q.expression(nom, 1).animer(T);
    shot(cx, cy, 540, 360, [q.objet], { fov: 26, pos: [0.3, 1.66, 2.15], target: [0, 1.56, 0] });
    q.liberer();
    text(NOMS.expressions[nom], cx + 270, cy + 375, 32, "MontX", "#22242A");
  });
}

function pagePoses() {
  background("10 POSES", "chaque pose se mélange à la suivante, de 0 à 1");
  const items = Object.keys(NOMS.poses).map(nom => ({ nom, label: NOMS.poses[nom] }));
  items.push({ nom: "foule", label: "creerFoule()" }, { nom: "badge", label: "badge n°07" });
  items.forEach((it, i) => {
    const cx = (i % 3) * 360, cy = 230 + Math.floor(i / 3) * 418;
    const objects = [];
    const role = it.nom === "noter" ? "chercheur" : it.nom === "brasCroises" ? "autorite" : "sujet";
    let free = [];
    if (it.nom === "foule") {
      const f = creerFoule({ nombre: 6, colonnes: 3, graine: 4 });
      f.animer(T);
      objects.push(f.groupe);
      free = f.quidams;
    } else {
      const q = creerQuidam({ role, graine: 5 + i, numero: it.nom === "badge" ? 7 : undefined });
      if (it.nom !== "badge") q.pose(it.nom);
      q.animer(it.nom === "marche" ? 0.3 : T);
      objects.push(q.objet);
      free = [q];
      if (it.nom === "assis") objects.push(creerChaise());
    }
    const opts = it.nom === "foule"
      ? { fov: 26, pos: [1.4, 2.2, 6.6], target: [0, 0.95, -0.8] }
      : it.nom === "badge" ? { fov: 17, pos: [0.6, 1.4, 5.4], target: [0, 1.22, 0] } : { fov: 23, pos: [1.0, 1.3, 6.2], target: [0, 1.05, 0] };
    shot(cx, cy, 360, 370, objects, opts);
    free.forEach(q => q.liberer());
    text(it.label, cx + 180, cy + 388, 26, "MontX", "#22242A");
  });
}

window.render = t => {
  ctx.clearRect(0, 0, W, H);
  [pageRoles, pageExpressions, pagePoses][Math.min(2, Math.floor(t))]();
};
window.ready = Promise.all(["MontX", "MontS"].map(f => document.fonts.load(`100px ${f}`))).then(() => true);
