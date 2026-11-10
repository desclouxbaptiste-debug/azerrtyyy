// Model sheet for the wolf of lib/decors3d.js: six views of the same animal (side standing, side walking, 3/4 front,
// front, from behind, head close-up), and the walk cycle on a treadmill. render(t) is a pure function of t.
import { creerStudio } from "../lib/studio3d.js";
import { loup, pre, FOULEE_LOUP } from "../lib/decors3d.js";
import { creerQuidam } from "../lib/quidams.js";

const W = 1080, H = 1920, FPS = 30, DURATION = 6;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const st = creerStudio({ ombre: 0.24 });
const b = loup(); st.plateau.add(b); st.plateau.add(pre(20, "#A7AE88"));
const q = creerQuidam({ role: "foule", graine: 4 }); q.objet.position.set(-1.2, 0, -0.9); st.plateau.add(q.objet);
const VUES = [
  ["profil, debout", 0, { fov: 26, pos: [0.0, 0.75, 5.4], cible: [-0.05, 0.55, 0] }],
  ["profil, marche", 1, { fov: 26, pos: [0.0, 0.75, 5.4], cible: [-0.05, 0.55, 0] }],
  ["trois-quarts", 0, { fov: 26, pos: [3.7, 1.2, 3.5], cible: [0.1, 0.55, 0] }],
  ["de face", 0, { fov: 26, pos: [4.6, 0.9, 0.2], cible: [0, 0.6, 0] }],
  ["de dos", 1, { fov: 26, pos: [-4.2, 1.5, 1.9], cible: [0, 0.55, 0] }],
  ["tête", 0, { fov: 18, pos: [2.1, 1.1, 1.2], cible: [0.75, 0.92, 0] }],
];
window.render = t => {
  ctx.fillStyle = "#EDE9E0"; ctx.fillRect(0, 0, W, H);
  const w = W / 2, h = H / 3;
  VUES.forEach(([nom, allure, cam], i) => {
    b.animer(t, allure, allure ? { d: t * 1.0 } : {});
    b.lueur.emissiveIntensity = 0;
    q.objet.visible = i === 0;
    q.animer(t);
    const x = (i % 2) * w, y = Math.floor(i / 2) * h;
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#C9D3D6"); g.addColorStop(1, "#EAE5DA");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    st.suivre(0, 0);
    st.tourner(ctx, x, y, w, h, cam);
    ctx.font = "34px MontX"; ctx.fillStyle = "#2A2C33"; ctx.fillText(nom, x + 24, y + 50);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  });
};
window.TIMELINE = { FPS, DURATION };
window.ready = document.fonts.load("34px MontX").then(() => true);
