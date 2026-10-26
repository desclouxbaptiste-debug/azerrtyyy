// Motion test for lib/quidams.js: the Subject walks in, stops, doubts, the Authority points at them, fear, they raise
// their hand, sadness. Everything is a pure function of t (render(t) can be called in any order, frame by frame).
import { creerStudio } from "../lib/studio3d.js";
import { creerQuidam, fenetre, adoucir, VITESSE_MARCHE } from "../lib/quidams.js";

const W = 1080, H = 1920, FPS = 30, DURATION = 9;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const studio = creerStudio({ ombre: 0.24 });

const sujet = creerQuidam({ role: "sujet", graine: 3 });
const chercheur = creerQuidam({ role: "chercheur", graine: 8 });
const autorite = creerQuidam({ role: "autorite", graine: 5 });
chercheur.objet.position.set(-0.8, 0, -1.5);
chercheur.objet.rotation.y = 0.36;
autorite.objet.position.set(0.8, 0, -1.7);
autorite.objet.rotation.y = -0.36; // faces the spot where the Subject stops
studio.plateau.add(sujet.objet, chercheur.objet, autorite.objet);

// walks in from the right and stops at x = 0: the speed fades with the walk cycle (smoothstep over STOP s),
// so the feet never slide; the distance covered during the fade is v * STOP / 2
const X0 = 2.4, STOP = 0.7, FREIN = X0 / VITESSE_MARCHE - STOP / 2;
function parcouru(t) {
  if (t < FREIN) return VITESSE_MARCHE * t;
  const x = Math.min(1, (t - FREIN) / STOP);
  return VITESSE_MARCHE * (FREIN + STOP * (x - x ** 3 + x ** 4 / 2));
}
const lerp = (a, b, k) => a + (b - a) * k;

// what is being shown, written under the figures
const ETAPES = [
  [1.1, 2.6, "marche → debout"], [2.7, 3.9, "neutre → doute"], [4.0, 5.4, "bras croisés → pointe du doigt · doute → peur"],
  [5.5, 6.9, "debout → main levée"], [7.0, 8.8, "peur → tristesse"],
];

function poser(t) {
  // Subject: walk, then turn to the camera and settle
  const k = fenetre(t, FREIN, STOP);
  sujet.objet.position.set(X0 - parcouru(t), 0, 0.4);
  sujet.objet.rotation.y = lerp(-Math.PI / 2, 0, k);
  const main = fenetre(t, 5.6, 0.7);
  if (main > 0) sujet.transitionPose("debout", "mainLevee", main);
  else sujet.transitionPose("marche", "debout", k);
  const peur = fenetre(t, 4.4, 0.6), triste = fenetre(t, 7.0, 0.7);
  if (triste > 0) sujet.transitionExpression("peur", "tristesse", triste);
  else if (peur > 0) sujet.transitionExpression("doute", "peur", peur);
  else sujet.expression("doute", fenetre(t, 2.8, 0.6));
  // looks at the Researcher, then at the Authority when it points
  const versChercheur = fenetre(t, 2.6, 0.5), versAutorite = fenetre(t, 4.2, 0.4);
  sujet.regarder(lerp(lerp(0, -0.8, versChercheur), 0.8, versAutorite), 0);
  sujet.animer(t);

  chercheur.regarder(0.5, -0.1).animer(t);
  const pointe = fenetre(t, 4.0, 0.5) * (1 - fenetre(t, 6.5, 0.6));
  autorite.transitionPose("brasCroises", "pointer", pointe).animer(t);
}

function texte(s, x, y, size, font, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(s, x, y); ctx.restore();
}

window.render = t => {
  const g = ctx.createRadialGradient(W / 2, H * 0.48, 80, W / 2, H * 0.48, H * 0.8);
  g.addColorStop(0, "#F4F1EB"); g.addColorStop(1, "#D3CEC3");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  poser(t);
  const push = adoucir(t / DURATION);
  studio.tourner(ctx, 0, 0, W, H, { fov: 30, pos: [lerp(0.35, 0.15, push), lerp(2.0, 1.75, push), lerp(8.4, 7.0, push)], cible: [0, 1.0, -0.5] });
  texte("LES QUIDAMS · test d'animation", W / 2, 150, 34, "MontX", "#22242A");
  for (const [a, b, s] of ETAPES) {
    const al = fenetre(t, a, 0.3) * (1 - fenetre(t, b - 0.3, 0.3));
    if (al > 0) texte(s, W / 2, 1790, s.length > 30 ? 34 : 44, "MontX", "#22242A", al);
  }
};

window.TIMELINE = { DURATION, FPS, MUSIC: { style: "lofi", bpm: 84, gain: 0.5 } };
window.SFX = [];
for (let s = 0.15; s < FREIN + STOP * 0.6; s += 0.525) window.SFX.push({ t: s, type: "step", gain: 0.5 });
window.ready = Promise.all(["MontX", "MontS"].map(f => document.fonts.load(`100px ${f}`))).then(() => true);
