// Casting sheet of the Quidams, PS2 edition (lib/ps2.js): render(0.5) = the six roles, render(1.5) = expressions,
// render(2.5) = poses, render(3.5) = group photo with the crowd, render(4.5) = portraits. Rendered small and enlarged, like an old console.
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidamPS2, ROLES_PS2, cielPS2, solPS2 } from "../lib/ps2.js";
import { NOMS } from "../lib/quidams.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const st = creerStudio({ antialias: false });
st.sol.visible = false;
const sol = solPS2("herbe", 60); st.plateau.add(sol);
const RENDU = { res: 0.42, filtre: "saturate(1.18) contrast(1.06)" };

function texte(s, x, y, size, font, color, align = "center") {
  ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
}
function wrap(s, x, y, maxW, size, font, color, lh = 1.3) {
  ctx.font = `${size}px ${font}`;
  const lines = [""];
  for (const w of s.split(" ")) { const t = lines.at(-1) ? lines.at(-1) + " " + w : w; if (ctx.measureText(t).width > maxW && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = t; }
  lines.forEach((l, i) => texte(l, x, y + i * size * lh, size, font, color));
}
function page(titre, sous) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#10131C"); g.addColorStop(1, "#1C2233");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  texte(titre, W / 2, 110, 70, "MontX", "#FFFFFF");
  texte(sous, W / 2, 175, 30, "MontS", "#9FB0D8");
}
// one 3D shot into a tile: PS2 sky behind, grass, the figures
function tuile(x, y, w, h, figures, cam, graine = 1) {
  for (const o of [...st.plateau.children]) if (o !== sol) st.plateau.remove(o);
  for (const f of figures) st.plateau.add(f.objet);
  cielPS2(ctx, x, y, w, h, graine);
  st.suivre(cam.cible[0], cam.cible[2]);
  st.tourner(ctx, x, y, w, h, { ...cam, ...RENDU });
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
}

const ROLES = ["sujet", "autre", "foule", "chercheur", "autorite", "ombre"];
const persos = Object.fromEntries(ROLES.map((r, i) => [r, creerQuidamPS2({ role: r, graine: 3 + i })]));
const foule = [11, 12, 13, 14, 15, 16, 17, 18].map(g => creerQuidamPS2({ role: "foule", graine: g }));

const PAGES = [
  function roles(t) {
    page("LES QUIDAMS", "édition PS2 · les six rôles");
    ROLES.forEach((r, i) => {
      const x = 20 + (i % 2) * 530, y = 225 + Math.floor(i / 2) * 565, p = persos[r];
      p.objet.position.set(0, 0, 0); p.objet.rotation.y = 0.3;
      p.pose(ROLES_PS2[r].pose).expression(r === "autorite" ? "doute" : "neutre", r === "autorite" ? 0.4 : 0).animer(1.2 + i);
      tuile(x, y, 510, 440, [p], { fov: 24, pos: [0.75, 1.05, 4.75], cible: [0, 0.9, 0] }, i + 1);
      texte(ROLES_PS2[r].nom.toUpperCase(), x + 255, y + 472, 36, "MontX", "#FFFFFF");
      wrap(ROLES_PS2[r].look, x + 255, y + 512, 480, 22, "MontS", "#B8C2DC");
    });
  },
  function expressions(t) {
    page("EXPRESSIONS", "les mêmes huit expressions que les Quidams");
    const p = persos.sujet;
    Object.keys(NOMS.expressions).forEach((e, i) => {
      const x = 20 + (i % 2) * 530, y = 230 + Math.floor(i / 2) * 420;
      p.objet.position.set(0, 0, 0); p.objet.rotation.y = 0.15;
      p.pose("debout").expression(e).animer(0.05);
      tuile(x, y, 510, 360, [p], { fov: 18, pos: [0.22, 1.63, 1.15], cible: [0, 1.6, 0] }, 20 + i);
      texte(NOMS.expressions[e], x + 255, y + 390, 34, "MontX", "#FFFFFF");
    });
  },
  function poses(t) {
    page("POSES", "les mêmes dix poses, avec l'Autre");
    const p = persos.autre;
    Object.keys(NOMS.poses).forEach((n, i) => {
      const x = 20 + (i % 2) * 530, y = 230 + Math.floor(i / 2) * 330;
      p.objet.position.set(0, 0, 0); p.objet.rotation.y = 0.45;
      p.pose(n).expression("neutre", 0).animer(n === "marche" ? 0.4 : 1.0);
      tuile(x, y, 510, 280, [p], { fov: 26, pos: [0.9, 1.1, 3.9], cible: [0, 0.95, 0] }, 40 + i);
      texte(NOMS.poses[n], x + 255, y + 305, 30, "MontX", "#FFFFFF");
    });
  },
  function groupe(t) {
    page("PHOTO DE GROUPE", "les six rôles devant, la Foule derrière");
    ROLES.forEach((r, i) => { const p = persos[r]; p.objet.position.set(-1.75 + i * 0.7, 0, 0.7); p.objet.rotation.y = 0; p.pose(ROLES_PS2[r].pose).expression(r === "sujet" ? "joie" : "neutre", 1).animer(2 + i); });
    foule.forEach((p, i) => { p.objet.position.set(-1.5 + (i % 4) * 1.0 + (i >= 4 ? 0.45 : 0), 0, i < 4 ? -0.35 : -1.3); p.objet.rotation.y = 0; p.pose(i % 3 === 1 ? "brasCroises" : "debout").animer(3 + i); });
    tuile(20, 230, 1040, 1300, [...ROLES.map(r => persos[r]), ...foule], { fov: 30, pos: [0, 1.7, 10.2], cible: [0, 1.05, -0.3] }, 77);
    wrap("une personne différente par graine pour la Foule", W / 2, 1570, 900, 30, "MontS", "#9FB0D8");
    wrap("Mêmes squelettes, poses et expressions que les Quidams : on peut les échanger dans n'importe quelle vidéo.", W / 2, 1650, 900, 34, "MontS", "#D8DEEE");
  },
  function portraits(t) {
    page("PORTRAITS", "les visages, peints comme sur une vieille console");
    ROLES.forEach((r, i) => {
      const x = 20 + (i % 2) * 530, y = 230 + Math.floor(i / 2) * 560, p = persos[r];
      p.objet.position.set(0, 0, 0); p.objet.rotation.y = 0.25;
      p.pose(r === "chercheur" ? "noter" : "debout", r === "chercheur" ? 0.4 : 1).expression(r === "sujet" ? "joie" : r === "autre" ? "doute" : "neutre", r === "sujet" || r === "autre" ? 0.8 : 0).animer(0.05);
      tuile(x, y, 510, 470, [p], { fov: 22, pos: [0.3, 1.58, 1.6], cible: [0, 1.5, 0] }, 60 + i);
      texte(ROLES_PS2[r].nom.toUpperCase(), x + 255, y + 505, 36, "MontX", "#FFFFFF");
    });
  },
];
window.render = t => PAGES[Math.min(PAGES.length - 1, Math.floor(t))](t);
window.TIMELINE = { FPS: 30, DURATION: PAGES.length };
window.ready = Promise.all(["MontX", "MontS"].map(f => document.fonts.load(`40px ${f}`))).then(() => true);
