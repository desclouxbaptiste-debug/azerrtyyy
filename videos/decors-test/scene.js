// Sheet of the 1760s village, interior and modern props of lib/decors3d.js, one per tile.
import * as THREE from "three";
import { creerStudio } from "../lib/studio3d.js";
import * as D from "../lib/decors3d.js";
import { creerQuidam } from "../lib/quidams.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const st = creerStudio({ ombre: 0.24 });
const pieces = [
  ["maison", () => D.maison({ etage: true }), [6, 3.5, 9], [0, 2, 0]],
  ["maison nuit", () => D.maison({ nuit: true }), [5, 2.6, 8], [0, 1.6, 0]],
  ["église", () => D.eglise(), [10, 6, 16], [0, 4, -1]],
  ["fontaine + lavoir", () => { const g = new THREE.Group(); const f = D.fontaine(); f.position.x = -2.5; g.add(f); const l = D.lavoir(); l.position.x = 1.8; g.add(l); return g; }, [0, 3, 9], [0, 1, 0]],
  ["intérieur", () => { const g = D.piece({ fenetres: [["fond", -1.2, 1.0, 0.9, 1.1], ["gauche", 0, 1.0, 0.9, 1.1]] }); const t = D.tonneau(); t.position.set(1.8, 0, -1.5); g.add(t); const b = D.banc(); b.position.set(0, 0, 0.5); g.add(b); const e = D.etagere(); e.position.set(-1.4, 0, -2.3); g.add(e); return g; }, [0.5, 2.0, 7], [0, 1.2, -1]],
  ["imprimerie", () => { const g = new THREE.Group(); g.add(D.presse()); const s = D.sechoir(-2, 2, 2.6); s.position.z = -1; g.add(s); return g; }, [2, 2, 5.5], [0, 1.3, 0]],
  ["palais", () => { const g = new THREE.Group(); g.add(D.trone()); [-2, 2].forEach(x => { const c = D.colonne(); c.position.set(x, 0, -1); g.add(c); }); const m = D.cadre(1.2, 2.4); m.position.set(0, 1, -2); g.add(m); return g; }, [1, 2.4, 8], [0, 1.6, 0]],
  ["nature", () => { const g = new THREE.Group(); [["#C8742E", -2], ["#D9A23A", 0], [null, 2]].forEach(([c, x], i) => { const a = D.feuillu(4, c, i + 1); a.position.x = x; g.add(a); }); const r = D.rocher(0.8, 3); r.position.set(-1, 0, 1.5); g.add(r); const s = D.sapinNeige(); s.position.set(1, 0, 1.5); g.add(s); return g; }, [0, 3, 10], [0, 2, 0]],
  ["musée / ville", () => { const g = new THREE.Group(); const v = D.vitrine(); g.add(v); const l = D.loup(); l.position.y = 0.6; l.scale.setScalar(0.7); g.add(l); const i = D.immeuble(); i.position.set(0, 0, -4); g.add(i); const p = D.lampadaire(); p.position.set(2, 0, 0); g.add(p); return g; }, [1, 2.5, 8], [0, 2, -1]],
  ["fête", () => { const g = new THREE.Group(); g.add(D.fanions([-3, 3, 0], [3, 3, 0])); g.add(D.champs(8, 4)); const m = D.muret(4); m.position.z = 1.5; g.add(m); return g; }, [0, 3, 8], [0, 1.5, 0]],
];
const objets = pieces.map(([, f]) => { const o = f(); st.plateau.add(o); return o; });
window.render = () => {
  ctx.fillStyle = "#EDE9E0"; ctx.fillRect(0, 0, W, H);
  const w = W / 2, h = H / 5;
  pieces.forEach(([nom, , pos, cible], i) => {
    objets.forEach((o, k) => (o.visible = k === i));
    const x = (i % 2) * w, y = Math.floor(i / 2) * h;
    ctx.fillStyle = "#C9D3D6"; ctx.fillRect(x, y, w, h);
    st.suivre(cible[0], cible[2]);
    st.tourner(ctx, x, y, w, h, { fov: 40, pos, cible });
    ctx.font = "30px MontX"; ctx.fillStyle = "#2A2C33"; ctx.fillText(nom, x + 20, y + 40);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  });
};
window.TIMELINE = { FPS: 30, DURATION: 1 };
window.ready = document.fonts.load("30px MontX").then(() => true);
