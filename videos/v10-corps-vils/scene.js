// "Les corps vils" (Grégoire Chamayou): who medicine experimented on, told for everyone, staged with the Quidams.
// The grey figures are the "vile bodies"; the number tags on their chests are the idea of the book: people are not
// born worthless, they are turned into numbers. One set per voice segment (lib/recit3d.js), timed on the words.
import { plateau, figure, apparaitre, auDessus, tourneVers, chemin, droit, revele, plaque, encre, bulle, tampon,
  st, S, E, wt, INK, AMBRE, demarrer } from "../lib/recit3d.js";
import { creerFoule, creerChaise, fenetre } from "../lib/quidams.js";
import { barreaux, table, contrat, palissade, flacon, livre, couronne, panneau } from "../lib/decors3d.js";

const ROUGE = "#C8322B";
// the narrator's scientist: Le Chercheur with a vial in his right hand
function savant(g, x, z, o = {}) {
  const q = figure(g, "chercheur", x, z, { graine: 8, ...o });
  const f = flacon(o.liquide);
  q.articulations.mainD.add(f);
  q.tenir = () => droit(f);
  return q;
}

// ---------------------------------------------------------------- the greatest scientists… on people judged worthless
plateau("hook", g => {
  const sv = savant(g, -0.75, 0.6);
  const rang = [0.15, 0.72, 1.29, 1.86].map((x, i) => figure(g, "foule", x, -0.55 - i * 0.18, { graine: 41 + i, numero: i + 1 }));
  sv.objet.rotation.y = 0.45;
  rang.forEach(q => (q.objet.rotation.y = -0.35));
  return {
    update(t) {
      const tg = wt("hook", "gens", 3), tv = wt("hook", "valeur", 4.5);
      sv.pose("pointer", fenetre(t, 0.4, 0.6)).animer(t); sv.tenir();
      rang.forEach((q, i) => q.pose("teteBaissee", fenetre(t, tv - 0.2 + i * 0.08, 0.5)).regarder(-0.5, 0).animer(t));
      return chemin(t, [{ pos: [-0.35, 1.55, 4.0], cible: [-0.7, 1.35, 0.6], fov: 30 }, { t: tg - 0.7, d: 1.3, pos: [0.9, 1.8, 6.4], cible: [0.75, 1.15, -0.5] }]);
    },
    over(t) {
      const tv = wt("hook", "valeur", 4.5), a = auDessus(rang[1], 0.62);
      encre("sans valeur ?", a.x + 120, a.y - 40, prog(t, tv - 0.1, tv + 0.5), { size: 74 });
    },
  };
});

// ---------------------------------------------------------------- the name: LES CORPS VILS
plateau("name", g => {
  const rang = [-1.0, -0.5, 0, 0.5, 1.0].map((x, i) => figure(g, "foule", x, 0, { graine: 51 + i, numero: [7, 12, 3, 28, 15][i] }));
  return {
    update(t) {
      const tr = revele("name", 2);
      rang.forEach((q, i) => q.pose("teteBaissee").regarder(0, -0.3).animer(t + i));
      const p = easeInOut(prog(t, S("name") - 0.2, E("name")));
      return { fov: 30, pos: [0, lerp(1.7, 1.55, p), lerp(6.8, 5.4, p)], cible: [0, 1.15, 0], sombre: 0.75 * prog(t, tr - 0.05, tr + 0.1) };
    },
    over(t) {
      const tr = revele("name", 2);
      tampon("LES CORPS VILS", 440, prog(t, tr, tr + 0.4), { size: 118 });
      chalk("« les personnes de peu d'importance »", W / 2, 560, prog(t, tr + 0.5, tr + 1.4), { size: 52 });
    },
  };
});

// ---------------------------------------------------------------- the book, and who the "vile bodies" were
const GENS = [["prisonniers", "prisonnier"], ["pauvres", "pauvre"], ["personne", "seul"]];
plateau("setup", g => {
  const tb = table(1.0, 0.6);
  g.add(tb);
  const bk = livre("LES CORPS VILS", "Grégoire Chamayou");
  bk.position.set(0, 0.76, 0);
  g.add(bk);
  const pr = figure(g, "foule", 1.8, -0.25, { graine: 61, numero: 13 });
  const bar = barreaux(1.2, 2.3); bar.position.set(1.8, 0, 0.22); g.add(bar);
  const caisse = creerChaise({ couleur: "#9C7B58" }); caisse.position.set(3.6, 0, 0); g.add(caisse);
  const pv = figure(g, "foule", 3.6, 0, { graine: 62 });
  const seul = figure(g, "foule", 5.4, 0.25, { graine: 63 });
  const dos = [4.55, 5.4, 6.25].map((x, i) => { const q = figure(g, "foule", x, -1.9, { graine: 64 + i }); q.objet.rotation.y = Math.PI; return q; });
  const xs = [1.8, 3.6, 5.4];
  return {
    update(t) {
      bk.rotation.y = -0.35 + 0.25 * Math.sin(t * 0.7);
      pr.pose("teteBaissee").animer(t);
      pv.pose("assis").expression("tristesse", 0.6).animer(t); pv.articulations.cou.rotation.x += 0.35;
      seul.expression("tristesse", fenetre(t, wt("setup", "personne", 9), 0.5)).regarder(0.4, -0.3).animer(t);
      dos.forEach(q => q.animer(t));
      const cles = [{ pos: [0.35, 1.38, 4.6], cible: [0, 1.05, 0], fov: 30 }];
      GENS.forEach(([mot], i) => { const tw = wt("setup", mot, 6 + i); cles.push({ t: tw - 0.45, d: 0.55, pos: [xs[i] + 0.25, 1.6, i === 2 ? 6.4 : 5.4], cible: [xs[i], 1.05, i === 2 ? -0.5 : 0] }); });
      return chemin(t, cles);
    },
    over(t) {
      const tc = wt("setup", "comptent", 4);
      encre("= les gens qui ne comptent pas", W / 2, 1400, prog(t, tc - 0.3, tc + 0.6) * (1 - prog(t, wt("setup", "prisonniers", 6) - 0.5, wt("setup", "prisonniers", 6) - 0.3)), { size: 60 });
      [pr, pv, seul].forEach((q, i) => {
        const tw = wt("setup", GENS[i][0], 6 + i), b = auDessus(q, 0);
        encre(GENS[i][1], b.x + 150, b.y - 230, prog(t, tw, tw + 0.4), { size: 66, align: "left" });
      });
    },
  };
});

// ---------------------------------------------------------------- why: a remedy has to be tried… on whom?
plateau("why", g => {
  const sv = savant(g, -0.7, 0.7);
  sv.objet.rotation.y = 0.35;
  const rang = [-0.6, -0.1, 0.4, 0.9, 1.4].map((x, i) => figure(g, i === 2 ? "sujet" : "foule", x, -1.3, { graine: 71 + i }));
  return {
    update(t) {
      const te = wt("why", "essayer", 2.5), tq = wt("why", "qui", 3.8);
      sv.pose("pointer", fenetre(t, te - 0.3, 0.5)).animer(t); sv.tenir();
      rang.forEach((q, i) => q.expression("peur", fenetre(t, tq + i * 0.06, 0.4)).regarder(lerp(0, i < 2 ? 0.7 : -0.7, fenetre(t, tq + 0.3, 0.4)), 0).animer(t));
      return chemin(t, [{ pos: [-0.3, 1.5, 4.5], cible: [-0.6, 1.3, 0.7], fov: 30 }, { t: tq - 0.45, d: 0.7, pos: [0.5, 2.05, 7.4], cible: [0.3, 1.15, -0.6] }]);
    },
    over(t) {
      const te = wt("why", "essayer", 2.5), p = prog(t, te - 0.3, te + 0.2);
      encre("le but :", W / 2, 380, p, { size: 66 });
      encre("sur qui la science a-t-elle fait ses essais ?", W / 2, 460, prog(t, te, te + 1.0), { size: 54 });
    },
  };
});

// ---------------------------------------------------------------- the deal: a deadly experiment… and freedom if you survive
plateau("deal", g => {
  const juge = figure(g, "autorite", -1.35, 0.35, { graine: 81 });
  const cond = figure(g, "foule", 0, 0, { graine: 82, numero: 13 });
  const bar = barreaux(1.2, 2.3); bar.position.set(0, 0, 0.33); g.add(bar);
  const doc = figure(g, "chercheur", 1.35, 0.35, { graine: 83 });
  tourneVers(juge, 0, 0); tourneVers(doc, 0, 0);
  return {
    update(t) {
      const tj = wt("deal", "juges", 0.3), tm = wt("deal", "marché", 6), tr = revele("deal", 9);
      juge.transitionPose("brasCroises", "pointer", fenetre(t, tj + 0.2, 0.5) * (1 - fenetre(t, tm, 0.5))).animer(t);
      doc.animer(t);
      cond.transitionPose("teteBaissee", "debout", fenetre(t, tm - 0.2, 0.6)).expression("doute", fenetre(t, tr + 0.2, 0.5)).animer(t);
      bar.position.y = 3.2 * easeInOut(prog(t, tr, tr + 0.7));
      const c = chemin(t, [{ pos: [0, 1.85, 9.0], cible: [0, 1.1, 0], fov: 34 }, { t: tm - 0.5, d: 0.9, pos: [0, 1.45, 4.6], cible: [0, 1.45, 0], fov: 30 }]);
      return { ...c, sombre: 0.3 };
    },
    over(t, d) {
      const tmed = wt("deal", "médecins", 2), tdg = wt("deal", "dangereuse", 7.5), ts = wt("deal", "survis", 8.5);
      const a = auDessus(cond, 0.45), b = auDessus(doc, 0.45);
      const pa = prog(t, tmed - 0.1, tmed + 0.5) * (1 - prog(t, wt("deal", "marché", 6) - 0.6, wt("deal", "marché", 6) - 0.4));
      chalkArrow(a.x + 40, a.y, b.x - 40, b.y, pa, { color: INK, width: 8, bend: -0.3 });
      // the scale: deadly risk against freedom
      const pb = prog(t, tdg - 0.2, tdg + 0.3);
      if (pb > 0) {
        const ang = lerp(0.2, -0.2, easeOutBack(prog(t, ts - 0.1, ts + 0.5), 2)) * clamp(pb * 2);
        ctx.save(); ctx.translate(W / 2, 390); ctx.globalAlpha = clamp(pb * 2);
        sketchPath([[-40, 70], [0, 0], [40, 70], [-40, 70]], 1, { color: INK, width: 7 });
        ctx.rotate(ang); sketchPath([[-270, 0], [270, 0]], 1, { color: INK, width: 8 });
        txt("RISQUE DE MORT", -200, -36, 32, "MontX", ROUGE);
        txt("LIBERTÉ", 200, -36, 38, "MontX", "#2E9E5B", { alpha: clamp(prog(t, ts - 0.3, ts)) });
        ctx.restore();
      }
    },
  };
});

// ---------------------------------------------------------------- the names: Pasteur, Koch
plateau("names", g => {
  const pasteur = savant(g, -0.55, 0.25);
  const emp = figure(g, "autorite", 0.7, 0, { graine: 91, accessoires: [] });
  emp.articulations.tete.add(couronne());
  tourneVers(pasteur, 0.7, 0); tourneVers(emp, -0.65, 0.6);
  const camp = palissade(4, 1.9); camp.position.set(5, 0, -0.2); g.add(camp);
  const dedans = [3.7, 4.35, 5.0, 5.65, 6.3].map((x, i) => figure(g, "foule", x, -1.0 - (i % 2) * 0.35, { graine: 92 + i, numero: 30 + i }));
  const koch = savant(g, 4.1, 0.8, { liquide: "#B6E34A", graine: 99 });
  tourneVers(koch, 5.2, -0.8);
  return {
    update(t) {
      const tp = wt("names", "Pasteur", 2), tk = wt("names", "Koch", 9);
      pasteur.pose("pointer", fenetre(t, tp + 0.3, 0.5)).animer(t); pasteur.tenir();
      emp.pose("brasCroises").regarder(-0.3, 0).animer(t);
      dedans.forEach(q => q.pose("teteBaissee", 0.6).animer(t));
      koch.pose("pointer", fenetre(t, tk + 0.3, 0.5)).animer(t); koch.tenir();
      const c = chemin(t, [{ pos: [0.05, 1.7, 7.4], cible: [0.05, 1.15, 0], fov: 30 }, { t: tk - 0.45, d: 0.6, pos: [4.7, 1.9, 7.8], cible: [4.7, 1.1, -0.3] }]);
      return { ...c, sombre: 0.6 * (1 - prog(t, tp - 0.25, tp + 0.05)), focus: t < tk ? [0, 0] : [5, -0.3] };
    },
    over(t, d) {
      const tp = wt("names", "Pasteur", 2), te = wt("names", "empereur", 3), tra = wt("names", "rage", 7), tk = wt("names", "Koch", 9), ta = wt("names", "arsenic", 10.5), tc = wt("names", "camps", 12);
      tampon("PASTEUR", 420, prog(t, tp - 0.05, tp + 0.3) * (1 - prog(t, tp + 1.6, tp + 1.9)), { size: 120, color: AMBRE });
      tampon("KOCH", 420, prog(t, tk - 0.05, tk + 0.3) * (1 - prog(t, tk + 1.6, tk + 1.9)), { size: 130, color: AMBRE });
      const a = auDessus(pasteur, 0.5), b = auDessus(emp, 0.75);
      if (t < tk) {
        encre("Pasteur", clamp(a.x, 190, W - 190), a.y, prog(t, tp + 0.4, tp + 0.8), { size: 58, sombre: d > 0.5 });
        encre("l'empereur du Brésil", b.x + 40, b.y, prog(t, te, te + 0.6), { size: 52 });
        encre("vaccin contre la rage", W / 2, 1360, prog(t, tra - 0.2, tra + 0.6), { size: 62 });
      }
      const k = auDessus(koch, 0.5);
      encre("Koch", k.x + 60, k.y, prog(t, tk + 0.4, tk + 0.8), { size: 58 });
      encre("arsenic = poison", k.x + 40, k.y + 470, prog(t, ta, ta + 0.6), { size: 56, color: ROUGE });
      encre("des camps · Afrique", W / 2 + 170, 470, prog(t, tc, tc + 0.6), { size: 58 });
    },
  };
});

// ---------------------------------------------------------------- worse: diseases given to healthy people… even children
plateau("worse", g => {
  const sv = savant(g, -0.95, 0.3);
  const grands = [-0.2, 0.35, 0.9, 1.45].map((x, i) => figure(g, "foule", x, -0.8, { graine: 101 + i }));
  const petits = [0.15, 0.65, 1.15].map((x, i) => figure(g, "foule", x, 0.65, { graine: 106 + i, taille: 0.6 }));
  tourneVers(sv, 0.5, -0.2);
  return {
    update(t) {
      const tsa = wt("worse", "santé", 3), tr = revele("worse", 5.5);
      sv.pose("pointer", fenetre(t, S("worse") + 0.5, 0.5)).animer(t); sv.tenir();
      grands.forEach((q, i) => q.transitionExpression("joie", "tristesse", fenetre(t, tr + 0.3 + i * 0.05, 0.4)).animer(t));
      petits.forEach((q, i) => { apparaitre(q, easeOutBack(prog(t, tr - 0.05 + i * 0.07, tr + 0.3 + i * 0.07), 2)); q.regarder(-0.6, 0.5).animer(t); });
      const c = chemin(t, [{ pos: [0.05, 1.85, 8.8], cible: [0.0, 1.2, -0.4], fov: 30 }, { t: tr - 0.1, d: 0.6, pos: [0.6, 2.0, 6.0], cible: [0.55, 0.75, 0.0] }]);
      return { ...c, sombre: lerp(0.2, 0.7, prog(t, tr - 0.05, tr + 0.1)) };
    },
    over(t, d) {
      const tsa = wt("worse", "santé", 3), a = auDessus(grands[1], 0.55);
      encre("en bonne santé", a.x + 300, a.y - 30, prog(t, tsa - 0.2, tsa + 0.4) * (1 - prog(t, revele("worse", 5.5) - 0.3, revele("worse", 5.5))), { size: 66 });
    },
  };
});

// ---------------------------------------------------------------- consent: but when you are poor, or in prison, can you say no?
plateau("consent", g => {
  const chaise = creerChaise(); chaise.position.set(0, 0, -0.45); g.add(chaise);
  const toi = figure(g, "sujet", 0, -0.45, { graine: 3 });
  const tb = table(1.1, 0.62); tb.position.set(0, 0, 0.12); g.add(tb);
  const papier = contrat(); papier.position.set(0, 0.765, 0.12); g.add(papier);
  const doc = figure(g, "chercheur", 1.05, 0.65, { graine: 8 });
  tourneVers(doc, 0, -0.2);
  const bar = barreaux(1.7, 2.3); bar.position.set(0, 0, 0.7); g.add(bar);
  return {
    update(t) {
      const tpv = wt("consent", "pauvre", 5), tpr = wt("consent", "prison", 6), tr = revele("consent", 7.5);
      toi.pose("assis").regarder(0.4, -0.5).expression("gene", fenetre(t, tpv - 0.1, 0.5)).animer(t);
      toi.articulations.cou.rotation.x += 0.18 * fenetre(t, tpv, 0.5);
      doc.pose("pointer", fenetre(t, wt("consent", "accord", 3) - 0.2, 0.5)).animer(t);
      const k = easeOutCubic(prog(t, tpr - 0.1, tpr + 0.45)); // the bars grow out of the floor
      bar.visible = k > 0; bar.scale.y = Math.max(0.001, k);
      const c = chemin(t, [{ pos: [0.75, 1.8, 5.8], cible: [0.1, 0.95, 0], fov: 30 }, { t: tr - 0.1, d: 0.6, pos: [0.15, 1.25, 2.9], cible: [0, 1.02, -0.35] }]);
      return { ...c, sombre: 0.35 * prog(t, tpr - 0.1, tpr + 0.3) + 0.25 * prog(t, tr - 0.05, tr + 0.1) };
    },
    over(t, d) {
      const ts = wt("consent", "siècle", 2), ta = wt("consent", "accord", 3), tr = revele("consent", 7.5);
      encre("début du XXe siècle", W / 2, 370, prog(t, ts - 0.3, ts + 0.5) * (1 - prog(t, ta + 0.6, ta + 0.8)), { size: 60, sombre: d > 0.5 });
      const p = prog(t, ta, ta + 0.4);
      if (p > 0) {
        ctx.save(); ctx.globalAlpha = clamp(p * 2);
        const col = d > 0.5 ? "#F3EBDD" : INK;
        txt("OUI", 300, 470, 84, "MontX", col); ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.strokeRect(405, 432, 76, 76);
        txt("NON", 640, 470, 84, "MontX", col); ctx.strokeRect(750, 432, 76, 76);
        ctx.restore();
        sketchPath([[540, 420], [850, 515]], prog(t, tr + 0.1, tr + 0.4), { color: ROUGE, width: 12 });
        sketchPath([[540, 515], [850, 420]], prog(t, tr + 0.35, tr + 0.6), { color: ROUGE, width: 12 });
      }
    },
  };
});

// ---------------------------------------------------------------- inside: "it's for the good of humanity"… everyone except the one in front of you
plateau("inside", g => {
  const sv = figure(g, "chercheur", -0.9, 0.45, { graine: 8 });
  const ombre = figure(g, "ombre", -1.5, -0.35, { graine: 40 });
  const foule = creerFoule({ nombre: 18, colonnes: 6, graine: 9 });
  foule.groupe.position.set(0.25, 0, -2.4);
  g.add(foule.groupe);
  const lui = figure(g, "foule", 0.8, 0.6, { graine: 111 });
  tourneVers(sv, 0.8, 0.6); tourneVers(ombre, 0.8, 0.6);
  lui.objet.rotation.y = -0.6; // half towards the scientist, half towards us
  return {
    update(t) {
      const tph = wt("inside", "phrase", 2.5), tm = wt("inside", "monde", 7.5), tf = wt("inside", "face", 9), tdv = wt("inside", "devient", 11.5), tmo = wt("inside", "moins", 13);
      sv.pose("noter").animer(t);
      ombre.objet.visible = t > tph - 0.1;
      apparaitre(ombre, easeOutBack(prog(t, tph - 0.1, tph + 0.35), 1.6));
      ombre.animer(t);
      foule.quidams.forEach((q, i) => {
        apparaitre(q, easeOutBack(prog(t, tm - 0.4 + i * 0.02, tm - 0.1 + i * 0.02), 2));
        q.expression("colere", fenetre(t, tmo - 0.2, 0.4)).regarder(lerp(0, 0.5, fenetre(t, tmo - 0.2, 0.4)), -0.3 * fenetre(t, tmo - 0.2, 0.4)).animer(t);
      });
      apparaitre(lui, easeOutBack(prog(t, tf - 0.35, tf), 2));
      lui.transitionPose("debout", "teteBaissee", fenetre(t, tmo - 0.1, 0.6)).expression("tristesse", fenetre(t, tdv, 0.5)).animer(t);
      const c = chemin(t, [
        { pos: [-0.55, 1.62, 3.0], cible: [-0.9, 1.45, 0.45], fov: 30 },
        { t: tph - 0.3, d: 0.7, pos: [-0.6, 1.75, 4.4], cible: [-1.15, 1.35, 0] },
        { t: tm - 0.6, d: 0.8, pos: [0.25, 2.8, 9.2], cible: [0.2, 1.0, -1.2] },
        { t: tf - 0.4, d: 0.7, pos: [-0.4, 1.75, 5.0], cible: [0.8, 1.15, 0.2] },
      ]);
      return { ...c, sombre: 0.8, focus: [0, -0.8] };
    },
    over(t, d) {
      const tph = wt("inside", "phrase", 2.5), tm = wt("inside", "monde", 7.5), tf = wt("inside", "face", 9), tdv = wt("inside", "devient", 11.5);
      const o = auDessus(sv, 0.5);
      bulle("c'est pour le bien de l'humanité", clamp(o.x + 120, 330, W - 330), Math.max(o.y - 10, 470), prog(t, tph + 0.2, tph + 0.5) * (1 - prog(t, tm - 0.7, tm - 0.5)), { size: 50 });
      chalk("l'humanité = tout le monde…", W / 2, 420, prog(t, tm - 0.3, tm + 0.6) * (1 - prog(t, tf - 0.5, tf - 0.3)), { size: 62 });
      const l = auDessus(lui, 0);
      chalk("…sauf lui", l.x - 320, l.y - 60, prog(t, tf, tf + 0.5), { size: 76, color: "#FFB3A8" });
      plaque(lui, "n° 47", prog(t, tdv, tdv + 0.35));
    },
  };
});

// ---------------------------------------------------------------- careful: some doctors fought it, and Kant
plateau("nuance", g => {
  const mauvais = savant(g, -1.45, 0.3, { graine: 121 });
  const bon = figure(g, "chercheur", -0.25, 0.3, { graine: 122, accessoires: ["blouse", "lunettes"] });
  const protege = figure(g, "foule", 0.6, 0, { graine: 123 });
  const kant = figure(g, "autre", 3.2, 0, { graine: 124 });
  tourneVers(mauvais, 0.5, 0.2); tourneVers(bon, -1.45, 0.3); tourneVers(protege, -1.0, 0.4);
  return {
    update(t) {
      const tb = wt("nuance", "battus", 2), tk = wt("nuance", "Kant", 4.5);
      mauvais.pose("pointer").animer(t); mauvais.tenir();
      bon.pose("pointer", fenetre(t, tb - 0.2, 0.4)).animer(t);
      protege.expression("peur", 1 - fenetre(t, tb + 0.3, 0.6)).animer(t);
      kant.pose("mainLevee", fenetre(t, tk + 0.4, 0.5)).expression("doute", 0.3).animer(t);
      return chemin(t, [{ pos: [-0.45, 1.8, 8.8], cible: [-0.45, 1.1, 0.1], fov: 30 }, { t: tk - 0.45, d: 0.6, pos: [3.25, 1.6, 5.8], cible: [3.2, 1.35, 0] }]);
    },
    over(t) {
      const tb = wt("nuance", "battus", 2), tk = wt("nuance", "Kant", 4.5), to = wt("nuance", "outil", 7);
      const b = auDessus(bon, 0.55);
      if (t < tk) encre("certains médecins : non !", b.x + 60, b.y - 20, prog(t, tb, tb + 0.6), { size: 58, color: "#2E9E5B" });
      const kk = auDessus(kant, 0);
      encre("Kant", kk.x + 190, kk.y, prog(t, tk + 0.2, tk + 0.6), { size: 68, align: "left" });
      encre("un humain", W / 2, 400, prog(t, to - 1.2, to - 0.6), { size: 70 });
      encre("n'est jamais un simple outil", W / 2, 480, prog(t, to - 0.6, to + 0.4), { size: 62 });
    },
  };
});

// ---------------------------------------------------------------- today: people paid to test medicines… who are the vile bodies now?
plateau("now", g => {
  const pan = panneau([["VOLONTAIRES", 82], ["RECHERCHÉS", 82], ["essai de médicament · payé", 40, "MontS"]], { w: 1.25, h: 0.8, haut: 2.1 });
  pan.position.set(-1.05, 0, -0.5); pan.rotation.y = 0.45;
  g.add(pan);
  const file = [0, 1, 2, 3].map(i => figure(g, i === 1 ? "sujet" : "foule", -0.15 + i * 0.55, 0.05 * i, { graine: 131 + i }));
  file.forEach(q => (q.objet.rotation.y = -Math.PI / 2 + 0.25));
  return {
    update(t) {
      const ta = wt("now", "argent", 7), tr = revele("now", 10);
      file.forEach((q, i) => q.expression("doute", fenetre(t, ta - 0.2 + i * 0.05, 0.4)).regarder(0.3 * fenetre(t, tr + 0.2, 0.4) * (i % 2 ? 1 : -1), -0.2).animer(t));
      const c = chemin(t, [{ pos: [1.3, 2.0, 9.8], cible: [0.0, 1.2, -0.3], fov: 34 }, { t: tr - 0.1, d: 0.8, pos: [1.5, 1.75, 8.0], cible: [0.45, 1.1, 0], fov: 32 }]);
      return { ...c, sombre: 0.55 * prog(t, tr - 0.05, tr + 0.1) };
    },
    over(t, d) {
      const tl = wt("now", "loi", 4), ta = wt("now", "argent", 7), tr = revele("now", 10);
      const pl = prog(t, tl - 0.2, tl + 0.4) * (1 - prog(t, ta - 0.6, ta - 0.4));
      sketchPath([[250, 460], [275, 485], [315, 435]], pl, { color: "#2E9E5B", width: 9 });
      encre("encadré par la loi", 340, 460, pl, { size: 64, align: "left" });
      file.forEach((q, i) => { const a = auDessus(q, 0.55); encre("€", a.x, a.y, prog(t, ta + i * 0.08, ta + 0.3 + i * 0.08) * (1 - prog(t, tr - 0.3, tr)), { size: 80, color: "#2E9E5B" }); });
      file.forEach((q, i) => plaque(q, `n° ${[52, 8, 31, 17][i]}`, prog(t, tr + 0.15 + i * 0.08, tr + 0.45 + i * 0.08)));
      tampon("LES CORPS VILS", 420, prog(t, tr + 0.4, tr + 0.8), { size: 112 });
      chalk("d'aujourd'hui ?", W / 2, 540, prog(t, tr + 0.9, tr + 1.5), { size: 72 });
    },
  };
});

// ---------------------------------------------------------------- call to action: would you test a medicine for money?
plateau("cta", g => {
  const toi = figure(g, "sujet", 0, 0.3, { graine: 3 });
  const f = flacon();
  toi.articulations.mainD.add(f);
  return {
    update(t) {
      toi.pose("pointer", fenetre(t, S("cta") + 0.3, 0.5)).expression("doute", fenetre(t, S("cta") + 0.5, 0.5)).animer(t); droit(f);
      return { fov: 30, pos: [0.25, 1.6, lerp(6.0, 5.5, prog(t, S("cta"), R_FIN()))], cible: [0, 1.4, 0.3] };
    },
    over(t) {
      const t0 = S("cta");
      [["OUI", "#2E9E5B", 330], ["NON", ROUGE, 750]].forEach(([s, c, x], i) => {
        const p = easeOutBack(prog(t, t0 + 0.3 + i * 0.15, t0 + 0.65 + i * 0.15), 2);
        if (p <= 0) return;
        const hl = Math.floor((t - t0) * 2.2) % 2 === i;
        ctx.save(); ctx.translate(x, 470); ctx.scale(p * (hl ? 1.08 : 1), p * (hl ? 1.08 : 1));
        ctx.fillStyle = hl ? c : "rgba(255,255,255,.85)"; ctx.strokeStyle = c; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.roundRect(-160, -70, 320, 140, 70); ctx.fill(); ctx.stroke();
        txt(s, 0, 4, 76, "MontX", hl ? "#FFFFFF" : c);
        ctx.restore();
      });
      const tc = wt("cta", "commentaire", 3), p = easeOutBack(prog(t, tc - 0.2, tc + 0.2), 2.2);
      if (p > 0) {
        ctx.save(); ctx.translate(W / 2, 320); ctx.scale(p, p);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(-380, -58, 760, 116, 58); ctx.fill();
        txt("DIS-LE EN COMMENTAIRE", 0, 4, 46, "MontX", "#FFFFFF");
        ctx.restore();
      }
    },
  };
});
const R_FIN = () => E("cta");

// ---------------------------------------------------------------- sound
function sons() {
  sfx(0.2, "dark_whoosh", { gain: 0.6 });
  sfx(wt("hook", "valeur", 4.5), "impact_small", { gain: 0.45 });
  sfx(wt("setup", "livre", 1), "paper", { gain: 0.6 });
  GENS.forEach(([mot], i) => sfx(wt("setup", mot, 6 + i) - 0.4, "swish", { gain: 0.4 }));
  sfx(wt("why", "qui", 3.8) - 0.1, "stab", { gain: 0.45 });
  sfx(wt("deal", "juges", 0.3) + 0.2, "knock", { gain: 0.5 });
  sfx(revele("deal", 9), "rumble", { gain: 0.5 });
  sfx(wt("names", "Pasteur", 2) - 0.05, "hit", { gain: 0.55 });
  sfx(wt("names", "Koch", 9) - 0.05, "hit", { gain: 0.55 });
  sfx(wt("consent", "prison", 6) - 0.1, "rumble", { gain: 0.55 }); sfx(wt("consent", "prison", 6) + 0.35, "impact_small", { gain: 0.5 });
  sfx(revele("consent", 7.5) + 0.1, "scratch", { gain: 0.6 });
  sfx(wt("inside", "phrase", 2.5) - 0.1, "dark_whoosh", { gain: 0.55 });
  sfx(wt("inside", "devient", 11.5), "hit", { gain: 0.5 });
  sfx(wt("nuance", "battus", 2), "chime", { gain: 0.4 });
  sfx(wt("now", "argent", 7), "kaching", { gain: 0.45 });
  [0, 1].forEach(i => sfx(S("cta") + 0.3 + i * 0.15, "pop", { gain: 0.45 }));
}

demarrer({
  chapitres: { setup: "LE LIVRE", why: "LA QUESTION", deal: "LE MARCHÉ", names: "LES NOMS", worse: "PIRE", consent: "L'ACCORD", inside: "DANS LA TÊTE", nuance: "ATTENTION", now: "AUJOURD'HUI" },
  musique: () => ({ style: "dark", root: 40, room: true, tick: true, heart: [[S("worse"), E("consent"), 64, 86]] }),
  sons,
  voix: { bed: 0.26, duck: 0.6 },
});
