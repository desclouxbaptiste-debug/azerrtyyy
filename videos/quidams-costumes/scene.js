// Costume sheet for lib/costumes.js: every ready-made 1760s outfit on a Quidam, front three-quarter view.
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidam } from "../lib/quidams.js";
import { habiller, TENUES } from "../lib/costumes.js";
import { couronne } from "../lib/decors3d.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const studio = creerStudio();
const ROLES = { paysan: "sujet", paysanne: "foule", berger: "sujet", bergere: "foule", soldat: "foule", chasseur: "autre", noble: "autorite", courtisan: "foule", roi: "autorite", ecrivain: "autre" };

window.render = () => {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, "#F4F1EB"); g.addColorStop(1, "#D6D1C6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.font = "70px MontX"; ctx.fillStyle = "#22242A"; ctx.textAlign = "center"; ctx.fillText("COSTUMES · 1760", W / 2, 140);
  Object.keys(TENUES).forEach((nom, i) => {
    const x = (i % 3) * 360, y = 200 + Math.floor(i / 3) * 430;
    const q = creerQuidam({ role: ROLES[nom], graine: i + 2, accessoires: [] });
    habiller(q, TENUES[nom]);
    if (nom === "roi") q.articulations.tete.add(couronne());
    q.animer(0.6);
    studio.plateau.clear(); studio.plateau.add(q.objet);
    studio.tourner(ctx, x, y, 360, 400, { fov: 23, pos: [1.0, 1.3, 6.2], cible: [0, 1.0, 0] });
    ctx.font = "30px MontX"; ctx.fillStyle = "#22242A"; ctx.fillText(nom, x + 180, y + 412);
  });
};
window.ready = Promise.all(["MontX", "MontS"].map(f => document.fonts.load(`100px ${f}`))).then(() => true);
