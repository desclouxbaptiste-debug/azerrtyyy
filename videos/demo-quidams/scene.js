// Showreel: everything the toolkit does with the Quidams (lib/quidams.js) in under a minute. 3D cast, expressions,
// poses, a walk with an orbiting camera, a crowd, a staged experiment, voice + subtitles + music + sound effects +
// handwriting, a mood switch. One 3D set per voice segment, whip pans between them, everything timed on the words.
// Globals from the classic scripts: core.js (ctx, W, H, prog, lerp, ease*, sfx, txt, grain…), narration.js
// (buildCaptions, drawCaptions, segmentIndex, wordTime), immersive.js (chalk, sketchPath, chalkArrow, chalkUnderline).
import * as THREE from "three";
import { creerStudio, LUMIERES } from "../lib/studio3d.js";
import { creerQuidam, creerFoule, creerChaise, fenetre, VITESSE_MARCHE, ROLES } from "../lib/quidams.js";

const FPS = 30;
const INK = "#2A2C33", AMBRE = "#F4A531";
let T, SEG, CARDS, ORDER, DURATION, REVEAL;
const S = id => SEG[id].start;
const E = id => SEG[id].next;
const wt = (id, w, fb = 0) => wordTime(SEG[id], w, fb);

const st = creerStudio({ ombre: 0.22 });
const grains = makeGrain(4, 23);
const SHOTS = {};
const tmp = new THREE.Vector3();

// ---------------------------------------------------------------- helpers
function plateau(id, build) {
  const g = new THREE.Group();
  g.visible = false;
  st.plateau.add(g);
  SHOTS[id] = { g, ...build(g) };
}
function figure(g, role, x, z, o = {}) {
  const q = creerQuidam({ role, ...o });
  q.objet.position.set(x, 0, z);
  g.add(q.objet);
  return q;
}
const apparaitre = (q, k) => q.objet.scale.setScalar(Math.max(0.001, k));
// waving: rocks the raised right arm on top of the "mainLevee" pose
function saluer(q, t, k) {
  q.articulations.epauleD.rotation.z += k * 0.24 * Math.sin(t * 9);
  q.articulations.coudeD.rotation.x += k * 0.18 * Math.sin(t * 9 + 1);
}
// screen point just above a figure's head, in the image drawn last
function auDessus(q, h = 0.5) {
  q.articulations.tete.getWorldPosition(tmp);
  tmp.y += h;
  return st.projeter(tmp);
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(",")})`; }
function fond(sombre = 0) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 80, W / 2, H * 0.46, H * 0.8);
  g.addColorStop(0, mix("#F4F1EB", "#20232B", sombre)); g.addColorStop(1, mix("#D3CEC3", "#060709", sombre));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const encre = (s, x, y, p, o = {}) => chalk(s, x, y, p, { size: 54, color: INK, rot: -0.03, ...o });
function bulle(s, x, y, p) {
  if (p <= 0) return;
  const k = easeOutBack(clamp(p), 2.2);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.font = "56px Caveat";
  const w = ctx.measureText(s).width + 70, h = 100;
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 40); ctx.moveTo(-30, -2); ctx.lineTo(-58, 46); ctx.lineTo(8, -2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-28, -9, 34, 12);
  ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, 0, -h / 2 + 2);
  ctx.restore();
}

// ---------------------------------------------------------------- 0 · hook: the Subject pops up and waves
plateau("hook", g => {
  const q = figure(g, "sujet", 0, 0, { graine: 3 });
  return {
    update(t) {
      apparaitre(q, easeOutBack(prog(t, 0.3, 0.75), 2));
      const k = fenetre(t, 0.75, 0.45);
      q.pose("mainLevee", k).expression("joie", fenetre(t, 0.6, 0.4)).animer(t);
      saluer(q, t, k);
      const p = easeInOut(prog(t, 0, S("cast")));
      return { fov: 30, pos: [lerp(0.5, 0.2, p), 1.5, lerp(6.6, 5.9, p)], cible: [0, 1.55, 0] };
    },
    over(t) {
      for (const [s, y, size, color, t0] of [["TOUT CE QUE", 330, 92, INK, 0.25], ["JE SAIS FAIRE", 445, 104, AMBRE, 0.45]]) {
        const p = easeOutExpo(prog(t, t0, t0 + 0.5));
        if (p <= 0) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(0, y - size, W, size * 2); ctx.clip();
        txt(s, W / 2, y + (1 - p) * size * 1.3, size, "MontX", color, { stroke: color === AMBRE ? INK : null, strokeW: 10 });
        ctx.restore();
      }
    },
  };
});

// ---------------------------------------------------------------- 1 · the cast, in 3D
// one shallow arc, named from the middle outwards; labels alternate between two heights so they never touch
const PLACES = Object.fromEntries([["autorite", -1.55], ["foule", -0.93], ["sujet", -0.31], ["autre", 0.31], ["chercheur", 0.93], ["ombre", 1.55]]
  .map(([r, x], i) => [r, [x, 0.3 - 0.45 * (x / 1.55) ** 2, i % 2 ? 0.95 : 0.5]]));
const NOMMOTS = { sujet: "sujet", autre: "autre", foule: "foule", chercheur: "chercheur", autorite: "autorité", ombre: "ombre" };
function troupe(g) {
  const qs = {};
  Object.entries(PLACES).forEach(([r, [x, z]], i) => {
    qs[r] = figure(g, r, x, z, { graine: 11 + i });
    qs[r].objet.rotation.y = -x * 0.12;
  });
  return qs;
}
plateau("cast", g => {
  const qs = troupe(g);
  return {
    update(t) {
      const tSpin = S("cast") + 0.2, tDim = wt("cast", "dimensions", 2) + 0.6;
      for (const [r, q] of Object.entries(qs)) {
        const tw = wt("cast", NOMMOTS[r], 4);
        if (r !== "sujet") apparaitre(q, easeOutBack(prog(t, tw - 0.05, tw + 0.35), 2.2));
        q.expression("joie", fenetre(t, tw, 0.25) * (1 - fenetre(t, tw + 1.0, 0.4))).animer(t);
      }
      qs.sujet.objet.rotation.y = Math.PI * 2 * easeInOut(prog(t, tSpin, tDim));
      const p = easeInOut(prog(t, wt("cast", "autre", 5) - 0.5, wt("cast", "ombre", 7) + 0.3)), x0 = PLACES.sujet[0];
      return { fov: lerp(30, 34, p), pos: [lerp(x0, 0, p), lerp(1.3, 2.2, p), lerp(5.8, 11.4, p)], cible: [lerp(x0, 0, p), 1.0, lerp(0.3, 0, p)] };
    },
    over(t) {
      const tSpin = S("cast") + 0.2, tDim = wt("cast", "dimensions", 2) + 0.6;
      const pSpin = prog(t, tSpin, tSpin + 0.5) * (1 - prog(t, tDim, tDim + 0.4));
      if (pSpin > 0) { const a = auDessus(qs.sujet, 0); encre("360°", a.x + 340, a.y - 120, pSpin, { size: 84 }); }
      for (const [r, q] of Object.entries(qs)) {
        const tw = wt("cast", NOMMOTS[r], 4);
        const a = auDessus(q, PLACES[r][2]);
        encre(ROLES[r].nom, a.x, a.y, prog(t, tw, tw + 0.45), { size: 52 });
      }
    },
  };
});

// ---------------------------------------------------------------- 2 · expressions, close-up with a slow orbit
const EXPR = [["joie", "joie"], ["choc", "choc"], ["peur", "peur"], ["doute", "doute"], ["colere", "colère"], ["tristesse", "tristesse"]];
plateau("faces", g => {
  const q = figure(g, "sujet", 0, 0, { graine: 3 });
  return {
    update(t) {
      let prev = "neutre", cur = "neutre", k = 1;
      for (const [e, w] of EXPR) { const tw = wt("faces", w, 2) - 0.12; if (t >= tw) { prev = cur; cur = e; k = fenetre(t, tw, 0.3); } }
      q.transitionExpression(prev, cur, k).animer(t);
      const a = lerp(-0.45, 0.45, easeInOut(prog(t, S("faces") - 0.2, E("faces"))));
      return { fov: 28, pos: [3.0 * Math.sin(a), 1.68, 3.0 * Math.cos(a)], cible: [0, 1.5, 0] };
    },
  };
});

// ---------------------------------------------------------------- 3 · poses, the camera tracks along the line
const LIGNE = [["sujet", "mainLevee", "main", "main levée"], ["autre", "hausseEpaules", "épaules", "bof…"], ["chercheur", "noter", "notes", "il note"], ["foule", "assis", "assoient", "assis"]];
plateau("poses", g => {
  const qs = LIGNE.map(([r], i) => figure(g, r, -2.4 + i * 1.6, 0, { graine: 21 + i }));
  const chaise = creerChaise();
  chaise.position.set(2.4, 0, 0);
  g.add(chaise);
  return {
    update(t) {
      LIGNE.forEach(([, pose, mot], i) => {
        const k = fenetre(t, wt("poses", mot, 1 + i) - 0.15, 0.45);
        qs[i].transitionPose("debout", pose, k).animer(t);
        if (pose === "assis") qs[i].objet.position.z = lerp(0.42, 0, k);
      });
      const cx = -2.4 + 1.6 * LIGNE.slice(1).reduce((a, [, , mot], i) => a + fenetre(t, wt("poses", mot, 2 + i) - 0.5, 0.5), 0);
      const z = lerp(7.4, 5.4, fenetre(t, S("poses") - 0.1, 1.0));
      return { fov: 30, pos: [cx + 0.5, 1.45, z], cible: [cx, 1.05, 0], focus: [cx, 0] };
    },
    over(t) {
      LIGNE.forEach(([, , mot, lab], i) => {
        const tw = wt("poses", mot, 1 + i);
        const a = auDessus(qs[i], 0);
        encre(lab, a.x + 250, a.y - 150, prog(t, tw + 0.1, tw + 0.5), { size: 62, align: "left" });
      });
    },
  };
});

// ---------------------------------------------------------------- 4 · a walk, the camera circles around it
plateau("walk", g => {
  const sol = new THREE.GridHelper(60, 60, "#B5AFA3", "#C6C1B6");
  sol.material.transparent = true; sol.material.opacity = 0.55; sol.position.y = 0.002;
  g.add(sol);
  const duo = [figure(g, "sujet", 0, 0.34, { graine: 3 }), figure(g, "autre", 0, -0.34, { graine: 14 })];
  const x = t => -2.6 + VITESSE_MARCHE * (t - S("walk"));
  return {
    update(t) {
      for (const q of duo) { q.objet.position.x = x(t); q.objet.rotation.y = Math.PI / 2; q.pose("marche").animer(t); }
      const a = lerp(0.15, 2.7, easeInOut(prog(t, S("walk") - 0.2, E("walk") + 0.2))), c = x(t) + 0.3;
      return { fov: 30, pos: [c + 4.8 * Math.sin(a), lerp(1.5, 2.4, prog(t, S("walk"), E("walk"))), 4.8 * Math.cos(a)], cible: [c, 1.0, 0], focus: [c, 0] };
    },
  };
});

// ---------------------------------------------------------------- 5 · a whole crowd, popping in, crane up
plateau("crowd", g => {
  const f = creerFoule({ nombre: 24, colonnes: 6, graine: 7 });
  f.groupe.position.z = -0.3;
  g.add(f.groupe);
  const toi = figure(g, "sujet", 0, 0.75, { graine: 3 });
  return {
    update(t) {
      const t0 = wt("crowd", "foule", 1) - 0.25, tj = wt("crowd", "seconde", 2);
      apparaitre(toi, easeOutBack(prog(t, S("crowd") - 0.1, S("crowd") + 0.25), 2));
      toi.expression("joie", fenetre(t, tj, 0.3)).animer(t);
      f.quidams.forEach((q, i) => {
        const d = 0.11 * Math.floor(i / 6) + 0.05 * Math.abs((i % 6) - 2.5);
        apparaitre(q, easeOutBack(prog(t, t0 + d, t0 + d + 0.3), 2.2));
        q.expression("joie", fenetre(t, tj + d, 0.3)).animer(t);
      });
      const p = easeInOut(prog(t, S("crowd") - 0.2, E("crowd") + 0.2));
      return { fov: 32, pos: [lerp(0, 0.3, p), lerp(1.3, 4.9, p), lerp(6.2, 9.6, p)], cible: [0, lerp(1.0, 0.55, p), lerp(0, -1.3, p)], focus: [0, -1] };
    },
  };
});

// ---------------------------------------------------------------- 6 · a staged experiment: everyone raises a hand… except you
plateau("story", g => {
  const rang = [-1.0, -0.5, 0, 0.5, 1.0];
  const groupe = rang.map((x, i) => figure(g, i === 2 ? "sujet" : "foule", x, 0, { graine: 31 + i }));
  const savant = figure(g, "chercheur", -1.65, 1.35, { graine: 8 });
  savant.objet.rotation.y = Math.atan2(1.65, -1.35); // faces the group
  return {
    update(t) {
      const tq = wt("story", "question", 2), tl = wt("story", "lève", 4), ts = wt("story", "sauf", 5);
      savant.transitionPose("noter", "pointer", fenetre(t, tq - 0.3, 0.4) * (1 - fenetre(t, tl + 0.8, 0.5))).animer(t);
      groupe.forEach((q, i) => {
        if (i === 2) return;
        q.transitionPose("debout", "mainLevee", fenetre(t, tl + (i > 2 ? i - 1 : i) * 0.1, 0.45)).regarder(-0.6, 0).animer(t);
      });
      const toi = groupe[2];
      toi.regarder(lerp(-0.6, 0.8 * Math.sin((t - ts) * 4.5), fenetre(t, ts, 0.3)), 0);
      toi.expression("doute", fenetre(t, ts + 0.2, 0.5)).animer(t);
      const p = easeInOut(prog(t, ts - 0.25, ts + 0.7));
      return { fov: lerp(36, 30, p), pos: [lerp(1.3, 0.35, p), lerp(1.95, 1.68, p), lerp(9.0, 3.3, p)], cible: [lerp(-0.45, 0, p), lerp(1.05, 1.5, p), lerp(0.3, 0, p)], focus: [-0.3, 0.5] };
    },
    over(t) {
      const tq = wt("story", "question", 2), ts = wt("story", "sauf", 5);
      const a = auDessus(savant, 0.4);
      bulle("Qui est d'accord ?", clamp(a.x + 60, 260, W - 260), a.y, prog(t, tq - 0.3, tq + 0.1) * (1 - prog(t, ts - 0.3, ts)));
      const b = auDessus(groupe[2], 0.42), p = prog(t, ts + 0.25, ts + 0.7); // just above the top of the head
      const y0 = Math.max(b.y - 230, 430); // stays under the chapter chip in the close-up
      chalkArrow(b.x + 250, y0, b.x + 40, Math.max(b.y - 20, y0 + 90), p, { color: INK, width: 8, bend: -0.25 });
      encre("toi", b.x + 290, y0 - 60, prog(t, ts + 0.5, ts + 0.9), { size: 90 });
    },
  };
});

// ---------------------------------------------------------------- 7 · voice, subtitles, music, sound effects, handwriting
const OUTILS = [["voix", "la voix"], ["sous", "les sous-titres"], ["musique", "la musique"], ["bruitages", "les bruitages"], ["écriture", "l'écriture à la main"]];
plateau("tools", g => {
  const q = figure(g, "sujet", 0.62, 0, { graine: 3 });
  q.objet.rotation.y = -0.35;
  return {
    update(t) {
      q.regarder(-0.6, 0.5).expression("joie", fenetre(t, wt("tools", "écriture", 5), 0.4)).animer(t);
      return { fov: 30, pos: [0.25, 1.35, 6.3], cible: [0.05, 1.9, 0] };
    },
    over(t) {
      OUTILS.forEach(([mot, lab], i) => {
        const tw = wt("tools", mot, 1 + i), y = 430 + i * 165, p = prog(t, tw - 0.1, tw + 0.35);
        if (p <= 0) return;
        sketchPath([[100, y], [122, y + 22], [160, y - 26]], prog(t, tw - 0.1, tw + 0.15), { color: "#2E9E5B", width: 9 });
        encre(lab, 190, y, i === 4 ? prog(t, tw, tw + 1.1) : p, { size: 66, align: "left" });
        ctx.save(); ctx.font = "66px Caveat"; const x = 190 + ctx.measureText(lab).width + 40; ctx.restore();
        const lt = t - tw;
        if (mot === "voix") for (let b = 0; b < 9; b++) {
          const h = 14 + 34 * Math.abs(Math.sin(lt * 9 + b * 1.3)) * clamp(p * 2);
          ctx.fillStyle = AMBRE; ctx.beginPath(); ctx.roundRect(x + b * 18, y - h / 2, 10, h, 5); ctx.fill();
        }
        if (mot === "sous") {
          const k = easeOutBack(clamp(lt / 0.3), 2.2);
          ctx.save(); ctx.translate(x + 70, y); ctx.scale(k, k); ctx.rotate(-0.03);
          ctx.fillStyle = AMBRE; ctx.beginPath(); ctx.roundRect(-70, -32, 140, 64, 14); ctx.fill();
          txt("MOT", 0, 3, 38, "MontX", "#0B0C12"); ctx.restore();
        }
        if (mot === "musique") for (let n = 0; n < 2; n++) {
          const nx = x + 20 + n * 56, ny = y + 12 - 10 * Math.abs(Math.sin(lt * 5 + n));
          ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.ellipse(nx, ny, 15, 11, -0.4, 0, 6.29); ctx.fill();
          ctx.beginPath(); ctx.moveTo(nx + 13, ny - 4); ctx.lineTo(nx + 13, ny - 54); ctx.lineTo(nx + 32, ny - 40); ctx.stroke();
        }
        if (mot === "bruitages") {
          const k = easeOutBack(clamp(lt / 0.25), 3);
          ctx.save(); ctx.translate(x + 95, y); ctx.scale(k, k); ctx.rotate(-0.08);
          ctx.fillStyle = "#FF5A4E"; ctx.beginPath();
          for (let s = 0; s < 18; s++) { const r = s % 2 ? 44 : 78, a = s / 18 * Math.PI * 2; ctx.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.75); }
          ctx.closePath(); ctx.fill();
          txt("BOUM !", 0, 3, 40, "MontX", "#FFFFFF", { stroke: INK, strokeW: 8 }); ctx.restore();
        }
        if (mot === "écriture") chalkUnderline(190, x - 40, y + 44, prog(t, tw + 0.9, tw + 1.4), { color: AMBRE, width: 8 });
      });
    },
  };
});

// ---------------------------------------------------------------- 8 · the mood switches: lights out, the Shadow is there
plateau("mood", g => {
  const q = figure(g, "sujet", 0, 0.2, { graine: 3 });
  const ombre = figure(g, "ombre", 0.62, -0.9, { graine: 40 });
  ombre.objet.rotation.y = -0.45;
  const spot = new THREE.SpotLight("#FFE7C2", 0, 9, 0.42, 0.55, 1.2);
  spot.position.set(0.1, 4.6, 1.6);
  spot.target.position.set(0, 0.6, 0.2);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  g.add(spot, spot.target);
  const k = t => prog(t, REVEAL - 0.03, REVEAL + 0.06);
  return {
    fond: t => fond(k(t)),
    update(t) {
      const d = k(t);
      st.ciel.intensity = lerp(LUMIERES.ciel, 0.06, d);
      st.key.intensity = lerp(LUMIERES.cle, 0, d);
      st.contre.intensity = lerp(LUMIERES.contre, 2.6, d);
      spot.intensity = 26 * d;
      ombre.objet.visible = d > 0;
      q.expression("peur", fenetre(t, REVEAL + 0.25, 0.35)).regarder(0.55 * fenetre(t, REVEAL + 0.6, 0.4), 0).animer(t);
      ombre.regarder(-0.6, -0.1).animer(t);
      const p = easeInOut(prog(t, S("mood") - 0.2, E("mood")));
      return { fov: 30, pos: [lerp(0.3, 0.12, p), lerp(1.45, 1.55, p), lerp(5.6, 4.4, p)], cible: [0.15, 1.2, -0.3] };
    },
    over(t) {
      if (t >= REVEAL - 0.02 && t < REVEAL + 0.6) { ctx.fillStyle = `rgba(255,250,240,${(0.5 * Math.exp(-(t - REVEAL) * 8)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    },
  };
});

// ---------------------------------------------------------------- 9 · call to action: the whole cast waves
plateau("cta", g => {
  const qs = troupe(g);
  return {
    update(t) {
      const k = fenetre(t, S("cta") + 0.2, 0.45);
      for (const [r, q] of Object.entries(qs)) {
        if (r === "sujet" || r === "autre" || r === "foule") q.pose("mainLevee", k);
        q.expression("joie", fenetre(t, S("cta"), 0.4)).animer(t);
        if (r === "sujet" || r === "autre" || r === "foule") saluer(q, t + PLACES[r][0], k);
      }
      const p = easeInOut(prog(t, S("cta") - 0.2, DURATION));
      return { fov: 34, pos: [0, lerp(2.2, 2.0, p), lerp(11.8, 11.3, p)], cible: [0, 1.1, 0] };
    },
    over(t) {
      const p = easeOutBack(prog(t, wt("cta", "commentaire", 2.5) - 0.2, wt("cta", "commentaire", 2.5) + 0.2), 2.2);
      if (p <= 0) return;
      const s = p * (1 + 0.04 * Math.sin(t * 7));
      ctx.save(); ctx.translate(W / 2, 330); ctx.scale(s, s);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-380, -62, 760, 124, 62); ctx.fill();
      txt("DIS-LE EN COMMENTAIRE", 0, 4, 46, "MontX", "#FFFFFF");
      ctx.restore();
    },
  };
});

// ---------------------------------------------------------------- frame
const CHAP = { cast: "PERSONNAGES 3D", faces: "ÉMOTIONS", poses: "POSES", walk: "CAMÉRA", crowd: "FOULE", story: "RÉCIT", tools: "SON & TEXTE", mood: "AMBIANCE" };
function chrome(t, id) {
  const lab = CHAP[id];
  if (lab) {
    const n = Object.keys(CHAP).indexOf(id) + 1, str = `${n}/8 · ${lab}`;
    ctx.save(); ctx.font = "30px MontX"; ctx.letterSpacing = "3px";
    const w = ctx.measureText(str).width + 76;
    ctx.fillStyle = "rgba(34,36,42,.88)"; ctx.beginPath(); ctx.roundRect(60, 186, w, 58, 29); ctx.fill();
    ctx.fillStyle = AMBRE; ctx.beginPath(); ctx.arc(90, 215, 9, 0, 6.29); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(str, 112, 217);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(34,36,42,.18)"; ctx.fillRect(60, 268, 960, 6);
  ctx.fillStyle = AMBRE; ctx.fillRect(60, 268, 960 * clamp(t / DURATION), 6);
}
function drawShot(i, t, dx) {
  const id = ORDER[i], sh = SHOTS[id];
  for (const k in SHOTS) SHOTS[k].g.visible = k === id;
  st.ciel.intensity = LUMIERES.ciel; st.key.intensity = LUMIERES.cle; st.contre.intensity = LUMIERES.contre;
  ctx.save(); ctx.translate(dx, 0);
  const cam = sh.update(t);
  (sh.fond || (() => fond(0)))(t);
  st.suivre(...(cam.focus || [cam.cible[0], cam.cible[2]]));
  st.tourner(ctx, 0, 0, W, H, cam);
  if (sh.over) sh.over(t);
  ctx.restore();
}
function render(t) {
  const frame = Math.round(t * FPS);
  let i = ORDER.findIndex(id => t < SEG[id].next);
  if (i < 0) i = ORDER.length - 1;
  const s = SEG[ORDER[i]], tr = prog(t, s.start - 0.14, s.start + 0.14);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (i > 0 && tr < 1) {
    // whip pan with motion streaks
    const k = easeInOutExpo(tr), dir = i % 2 ? 1 : -1, blur = Math.sin(k * Math.PI);
    drawShot(i - 1, t, -k * W * dir);
    drawShot(i, t, (1 - k) * W * dir);
    ctx.save(); ctx.globalAlpha = 0.4 * blur; ctx.fillStyle = "#fff";
    const r = rng(i * 7);
    for (let n = 0; n < 24; n++) { const yy = r() * H, len = 300 + r() * 700; ctx.fillRect(r() * W - len / 2, yy, len, 3 + r() * 6); }
    ctx.restore();
  } else drawShot(i, t, 0);
  vignette(0.22, 0.45);
  chrome(t, s.id);
  drawCaptions(CARDS, t, { y: 1590, size: 70, maxW: 900, style: "box", accent: AMBRE });
  grain(grains, frame, 0.03);
  const e = Math.max(prog(t, DURATION - 0.6, DURATION), 1 - prog(t, 0, 0.35));
  if (e > 0) { ctx.fillStyle = `rgba(0,0,0,${e})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- sound
function sons() {
  ORDER.forEach((id, i) => { if (i) sfx(S(id) - 0.16, "whoosh", { gain: 0.45, dur: 0.32 }); });
  sfx(0.3, "pop", { gain: 0.5 });
  sfx(S("cast") + 0.2, "swish", { gain: 0.5 });
  for (const r in NOMMOTS) if (r !== "sujet") sfx(wt("cast", NOMMOTS[r], 4) - 0.05, "pop", { gain: 0.5 });
  for (const [, w] of EXPR) sfx(wt("faces", w, 2) - 0.12, "pop_hi", { gain: 0.3 });
  LIGNE.forEach(([, , mot], i) => sfx(wt("poses", mot, 1 + i) - 0.15, "swish", { gain: 0.4 }));
  for (let s = S("walk") + 0.1; s < E("walk") + 0.1; s += 0.525) sfx(s, "step", { gain: 0.4 });
  const t0 = wt("crowd", "foule", 1) - 0.25;
  for (let k = 0; k < 10; k++) sfx(t0 + k * 0.05, "pop_hi", { gain: 0.22, pan: (k % 2 ? 0.4 : -0.4) });
  sfx(wt("story", "question", 2) - 0.3, "pop", { gain: 0.45 });
  sfx(wt("story", "lève", 4), "swish", { gain: 0.45 });
  sfx(wt("story", "sauf", 5), "impact_small", { gain: 0.35 });
  OUTILS.forEach(([mot], i) => sfx(wt("tools", mot, 1 + i) - 0.1, "pop", { gain: 0.4 }));
  const tb = wt("tools", "bruitages", 4);
  sfx(tb + 0.1, "kaching", { gain: 0.45 }); sfx(tb + 0.4, "knock", { gain: 0.5 }); sfx(tb + 0.65, "ding", { gain: 0.4 });
  sfx(wt("tools", "écriture", 5), "scribble", { dur: 1.1, gain: 0.6 });
  sfx(REVEAL - 0.03, "switch", { gain: 0.7 }); sfx(REVEAL, "impact_deep", { gain: 0.9 }); sfx(REVEAL + 0.05, "braam", { gain: 0.45 });
  sfx(S("cta") + 0.05, "switch", { gain: 0.5 }); sfx(S("cta") + 0.2, "chime", { gain: 0.4 });
}

window.ready = (async () => {
  await Promise.all(["MontX", "MontS", "Caveat"].map(f => document.fonts.load(`100px ${f}`)));
  T = await (await fetch("timings.json")).json();
  SEG = segmentIndex(T);
  ORDER = T.segments.map(s => s.id);
  CARDS = buildCaptions(T);
  DURATION = Math.ceil((T.duration + 1.4) * 10) / 10;
  SEG[ORDER[ORDER.length - 1]].next = DURATION;
  REVEAL = (T.reveals || [])[0] ?? wt("mood", "seul", 2);
  sons();
  window.TIMELINE = { FPS, DURATION, LOUDNESS: -14, MUSIC: { style: "lofi", bpm: 92, gain: 0.9 }, VOICE: { path: "voice.wav", bed: 0.24, duck: 0.55 } };
  return true;
})();
window.render = render;
