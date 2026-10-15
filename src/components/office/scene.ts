import {
  CHEF_ANCHOR,
  CHEF_DESK,
  CHEF_RUG,
  DOOR,
  SCENE_H,
  SCENE_W,
  ZONES,
  ZONE_BY_ID,
  deskRect,
  seatAnchor,
  type ZoneDef,
} from "@/lib/office/layout";
import { WALK_MS } from "@/lib/office/reduce";
import type { Agent, OfficeState, ZoneId } from "@/lib/office/types";

type Ctx = CanvasRenderingContext2D;

const OUTLINE = "#15121b";

function r(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Petit générateur pseudo-aléatoire déterministe (décor stable). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/* ------------------------------------------------------------------ */
/* Décor statique                                                      */
/* ------------------------------------------------------------------ */

function drawWindow(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  r(ctx, x - 2, y - 2, w + 4, h + 4, "#4a3b55");
  const bands = ["#251c49", "#2f2157", "#3e2864", "#5a3170", "#80406f", "#b2566c", "#d9786a"];
  const bh = h / bands.length;
  bands.forEach((c, i) => r(ctx, x, y + Math.floor(i * bh), w, Math.ceil(bh) + 1, c));
  const rand = rng(seed);
  // étoiles
  for (let i = 0; i < 10; i++) r(ctx, x + rand() * w, y + rand() * (h / 2), 1, 1, "#d8d0ff");
  // immeubles
  let bx = x;
  while (bx < x + w) {
    const bw = 5 + Math.floor(rand() * 8);
    const bhh = 7 + Math.floor(rand() * (h - 9));
    const top = y + h - bhh;
    const ww = Math.min(bw, x + w - bx);
    r(ctx, bx, top, ww, bhh, rand() > 0.5 ? "#1a1430" : "#211a3a");
    for (let wy = top + 2; wy < y + h - 1; wy += 3)
      for (let wx = bx + 1; wx < bx + ww - 1; wx += 2)
        if (rand() > 0.72) r(ctx, wx, wy, 1, 1, rand() > 0.3 ? "#ffd27a" : "#ff9f5a");
    bx += bw;
  }
  r(ctx, x + Math.floor(w / 2), y, 2, h, "#4a3b55");
  r(ctx, x - 3, y + h + 2, w + 6, 2, "#5c4a66");
}

function drawPlant(ctx: Ctx, x: number, y: number, size: "s" | "m" | "l" = "m") {
  const s = size === "s" ? 0.8 : size === "l" ? 1.4 : 1;
  const pw = Math.round(10 * s);
  const ph = Math.round(8 * s);
  const leaves = [
    [0, -4, 6, 5],
    [-4, -8, 6, 5],
    [3, -10, 6, 6],
    [-2, -14, 6, 5],
    [5, -5, 5, 4],
    [-5, -3, 5, 4],
  ];
  leaves.forEach(([lx, ly, lw, lh], i) =>
    r(ctx, x + pw / 2 + lx * s - 3, y + ly * s, Math.round(lw * s), Math.round(lh * s), i % 2 ? "#2f6a3a" : "#4a9a52"),
  );
  r(ctx, x, y, pw, ph, "#b0603a");
  r(ctx, x - 1, y, pw + 2, 2, "#c8744a");
  r(ctx, x, y + ph - 1, pw, 1, "#8a4a2a");
}

function drawRug(ctx: Ctx, z: { x: number; y: number; w: number; h: number }, rug: string, dark: string) {
  r(ctx, z.x, z.y, z.w, z.h, dark);
  r(ctx, z.x + 2, z.y + 2, z.w - 4, z.h - 4, rug);
  ctx.globalAlpha = 0.18;
  for (let yy = z.y + 4; yy < z.y + z.h - 3; yy += 4)
    for (let xx = z.x + 4 + ((yy / 4) % 2) * 2; xx < z.x + z.w - 3; xx += 4) r(ctx, xx, yy, 1, 1, "#ffffff");
  ctx.globalAlpha = 1;
}

function drawChair(ctx: Ctx, cx: number, top: number, w = 14, h = 13) {
  r(ctx, cx - w / 2 - 1, top - 1, w + 2, h + 1, OUTLINE);
  r(ctx, cx - w / 2, top, w, h, "#1f1e27");
  r(ctx, cx - w / 2 + 1, top + 1, w - 2, 2, "#2f2e3a");
}

export function drawBackground(ctx: Ctx) {
  ctx.imageSmoothingEnabled = false;
  // Sol en briques sombres
  r(ctx, 0, 0, SCENE_W, SCENE_H, "#2e2420");
  const rand = rng(7);
  for (let row = 0; row * 8 + 44 < SCENE_H; row++) {
    const y = 44 + row * 8;
    const off = row % 2 ? 8 : 0;
    for (let x = -off; x < SCENE_W; x += 16) {
      const v = rand();
      r(ctx, x, y, 16, 8, v > 0.8 ? "#352a24" : v < 0.2 ? "#2a201c" : "#2e2420");
      r(ctx, x, y, 16, 1, "#231b18");
      r(ctx, x, y, 1, 8, "#231b18");
    }
  }

  // Mur du fond
  r(ctx, 0, 0, SCENE_W, 44, "#2b2236");
  for (let x = 0; x < SCENE_W; x += 24) r(ctx, x, 2, 1, 38, "#251d2f");
  r(ctx, 0, 0, SCENE_W, 2, "#1c1624");
  r(ctx, 0, 40, SCENE_W, 4, "#1a141f");
  r(ctx, 0, 40, SCENE_W, 1, "#3a2f45");
  r(ctx, 0, 44, SCENE_W, 3, "#1f1816");

  drawWindow(ctx, 6, 6, 68, 28, 11);
  drawWindow(ctx, 306, 6, 72, 28, 23);

  // Cadre
  r(ctx, 86, 9, 24, 16, "#c9852f");
  r(ctx, 88, 11, 20, 12, "#3a2a1a");
  r(ctx, 91, 15, 5, 4, "#f2c230");
  r(ctx, 100, 15, 5, 4, "#f2c230");

  // Tableau blanc
  r(ctx, 126, 2, 124, 37, "#8c8aa0");
  r(ctx, 128, 4, 120, 32, "#e4dff0");
  r(ctx, 128, 28, 120, 8, "#d6d0e6");
  [
    [136, 10, 30],
    [136, 14, 22],
    [136, 18, 34],
    [176, 10, 18],
  ].forEach(([x, y, w]) => r(ctx, x, y, w, 1, "#b9b2cf"));
  for (let i = 0; i < 5; i++) r(ctx, 208 + i * 7, 27, 5, 4, "#3b6fd8");
  r(ctx, 150, 37, 70, 2, "#6c6a80");

  // Petit cadre
  r(ctx, 276, 6, 16, 20, "#c9852f");
  r(ctx, 278, 8, 12, 16, "#3a3040");
  for (let i = 0; i < 10; i++) r(ctx, 279 + i, 22 - i, 1, 1, "#e07a3a");

  // Baie serveur
  r(ctx, 252, 26, 16, 50, OUTLINE);
  r(ctx, 253, 27, 14, 48, "#1d1b24");
  for (let y = 30; y < 74; y += 5) r(ctx, 254, y, 12, 1, "#2c2934");

  // Zones
  for (const z of ZONES) {
    drawRug(ctx, z, z.rug, z.rugDark);
    for (let i = 0; i < 3; i++) {
      const d = deskRect(z, i);
      drawChair(ctx, d.x + 18, d.y - 19, 18, 17);
    }
  }

  // Bureau du chef
  drawRug(ctx, CHEF_RUG, "#4e321e", "#3a2414");
  drawChair(ctx, CHEF_ANCHOR.x, CHEF_DESK.y - 22, 22, 20);

  // Coin fontaine à eau
  r(ctx, 18, 158, 12, 18, "#c8ccd8");
  r(ctx, 18, 158, 12, 2, "#e8ecf4");
  r(ctx, 20, 146, 8, 12, "#7cc4ff");
  r(ctx, 21, 147, 2, 9, "#b6e2ff");
  r(ctx, 22, 164, 4, 2, "#5a6070");
  drawPlant(ctx, 112, 166, "l");

  // Bas de la pièce : canapé, bibliothèque, plantes, juke-box, cuisine
  r(ctx, 8, 280, 56, 30, OUTLINE);
  r(ctx, 9, 281, 54, 11, "#c8642c");
  r(ctx, 9, 292, 54, 12, "#e07a3a");
  r(ctx, 12, 293, 23, 2, "#f09a5a");
  r(ctx, 37, 293, 23, 2, "#f09a5a");
  r(ctx, 9, 281, 5, 23, "#b0552a");
  r(ctx, 58, 281, 5, 23, "#b0552a");
  r(ctx, 11, 304, 3, 5, "#3a2414");
  r(ctx, 58, 304, 3, 5, "#3a2414");
  r(ctx, 22, 277, 5, 4, "#f4f0e8");
  r(ctx, 30, 277, 5, 4, "#f4f0e8");

  r(ctx, 70, 264, 34, 48, OUTLINE);
  r(ctx, 71, 265, 32, 46, "#5a3a24");
  const bookColors = ["#c0504a", "#4a7ac0", "#e0b040", "#5aa05a", "#a060c0", "#e07a3a", "#d8d8e0"];
  const rb = rng(3);
  for (let s = 0; s < 3; s++) {
    const sy = 267 + s * 15;
    r(ctx, 72, sy + 12, 30, 2, "#3a2414");
    let bx = 73;
    while (bx < 100) {
      const bw = 2 + Math.floor(rb() * 3);
      const bh = 8 + Math.floor(rb() * 4);
      r(ctx, bx, sy + 12 - bh, bw, bh, bookColors[Math.floor(rb() * bookColors.length)]);
      bx += bw + (rb() > 0.8 ? 2 : 0);
    }
  }

  r(ctx, 118, 294, 12, 16, OUTLINE);
  r(ctx, 119, 295, 10, 14, "#6a6a78");
  r(ctx, 118, 293, 12, 2, "#8a8a98");
  r(ctx, 122, 297, 1, 10, "#555562");
  r(ctx, 126, 297, 1, 10, "#555562");

  // Cactus
  r(ctx, 147, 298, 12, 12, "#d8d8d8");
  r(ctx, 150, 272, 6, 26, "#4f9a58");
  r(ctx, 146, 280, 4, 8, "#4f9a58");
  r(ctx, 156, 276, 4, 8, "#4f9a58");
  r(ctx, 152, 274, 1, 22, "#6fba78");

  // Paillasson / porte
  r(ctx, 172, 306, 40, 14, "#a8502a");
  r(ctx, 174, 308, 36, 10, "#c8642c");
  for (let x = 176; x < 208; x += 4) r(ctx, x, 309, 2, 8, "#a8502a");

  drawPlant(ctx, 222, 296, "m");

  // Juke-box (corps, l'arc lumineux est animé)
  r(ctx, 248, 262, 38, 52, OUTLINE);
  r(ctx, 249, 270, 36, 43, "#5a2a1a");
  r(ctx, 253, 264, 28, 8, "#5a2a1a");
  r(ctx, 254, 284, 26, 10, "#1a0e0a");
  r(ctx, 256, 296, 22, 14, "#3a1a10");
  for (let y = 298; y < 309; y += 2) r(ctx, 257, y, 20, 1, "#6a3a24");

  drawPlant(ctx, 290, 298, "s");

  // Cuisine
  r(ctx, 306, 288, 76, 30, OUTLINE);
  r(ctx, 307, 289, 74, 4, "#f0f0f4");
  r(ctx, 307, 293, 74, 24, "#d8d8e0");
  for (let x = 307; x < 380; x += 18) {
    r(ctx, x, 293, 1, 24, "#a0a0b0");
    r(ctx, x + 8, 300, 3, 1, "#808090");
  }
  r(ctx, 314, 274, 14, 15, "#2a2830");
  r(ctx, 316, 276, 10, 4, "#4a4855");
  r(ctx, 319, 283, 4, 5, "#f4f0e8");
  r(ctx, 336, 284, 4, 5, "#f4f0e8");
  r(ctx, 343, 284, 4, 5, "#7cc4ff");
  drawPlant(ctx, 364, 278, "m");
}

/* ------------------------------------------------------------------ */
/* Robots                                                              */
/* ------------------------------------------------------------------ */

type RobotLook = { zone: ZoneId | "chef"; subagent: boolean; accent: string };

function drawRobot(
  ctx: Ctx,
  cx: number,
  top: number,
  look: RobotLook,
  o: { walking: boolean; busy: boolean; t: number; seed: number; selected: boolean },
) {
  const { t, seed } = o;
  const chef = look.zone === "chef";
  const bob = o.walking ? (Math.floor(t / 160) % 2) : o.busy ? (Math.floor((t + seed * 97) / 420) % 2) : 0;
  const y = top + bob;
  const body = chef ? "#3a3844" : look.subagent ? "#d6ecff" : "#e9eef4";
  const head = chef ? "#e8873a" : body;
  const shade = chef ? "#b8652a" : look.subagent ? "#9fc0dc" : "#b8c2cf";
  const blink = (t + seed * 431) % 3800 < 140;
  const eye = o.busy || chef ? (chef ? "#ffb070" : look.accent) : "#6a8a9a";

  if (o.selected) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t / 180);
    r(ctx, cx - 10, y - 8, 20, 30, "#fff3b0");
    ctx.globalAlpha = 1;
  }

  // jambes (marche)
  if (o.walking) {
    const step = Math.floor(t / 160) % 2;
    r(ctx, cx - 4, y + 17, 3, step ? 4 : 3, OUTLINE);
    r(ctx, cx + 1, y + 17, 3, step ? 3 : 4, OUTLINE);
  }
  // corps
  r(ctx, cx - 6, y + 8, 12, 10, OUTLINE);
  r(ctx, cx - 5, y + 9, 10, 8, chef ? body : "#cdd6e0");
  if (chef) r(ctx, cx - 1, y + 10, 2, 5, "#e07a3a");
  else r(ctx, cx - 1, y + 11, 2, 2, look.accent);
  // bras (tapent au clavier quand occupé)
  const type = o.busy && !o.walking ? Math.floor((t + seed * 53) / 140) % 2 : 0;
  r(ctx, cx - 8, y + 10 + type, 2, 5, OUTLINE);
  r(ctx, cx + 6, y + 11 - type, 2, 5, OUTLINE);
  // tête
  r(ctx, cx - 7, y - 1, 14, 11, OUTLINE);
  r(ctx, cx - 6, y, 12, 9, head);
  r(ctx, cx - 6, y + 8, 12, 1, shade);
  r(ctx, cx - 4, y + 2, 8, 5, "#1d2433");
  if (blink) {
    r(ctx, cx - 3, y + 4, 2, 1, eye);
    r(ctx, cx + 1, y + 4, 2, 1, eye);
  } else {
    r(ctx, cx - 3, y + 3, 2, 2, eye);
    r(ctx, cx + 1, y + 3, 2, 2, eye);
  }

  // accessoires
  if (look.subagent) {
    r(ctx, cx, y - 4, 1, 3, OUTLINE);
    const on = Math.floor(t / 300) % 2 === 0;
    r(ctx, cx - 1, y - 6, 3, 2, on ? look.accent : "#ffffff");
    return;
  }
  switch (look.zone) {
    case "recherche":
      r(ctx, cx - 9, y - 2, 18, 3, OUTLINE);
      r(ctx, cx - 8, y - 1, 16, 1, "#e8dcb0");
      r(ctx, cx - 6, y - 6, 12, 5, OUTLINE);
      r(ctx, cx - 5, y - 5, 10, 4, "#f0e6c0");
      r(ctx, cx - 5, y - 2, 10, 1, "#8a6a3a");
      break;
    case "code":
      r(ctx, cx - 5, y - 3, 10, 1, "#2b2b38");
      r(ctx, cx - 7, y - 2, 1, 4, "#2b2b38");
      r(ctx, cx + 6, y - 2, 1, 4, "#2b2b38");
      r(ctx, cx - 9, y + 2, 3, 4, "#ff7a59");
      r(ctx, cx + 6, y + 2, 3, 4, "#ff7a59");
      break;
    case "design":
      r(ctx, cx - 7, y - 3, 13, 3, "#d0457a");
      r(ctx, cx - 8, y - 1, 14, 1, "#a0305a");
      r(ctx, cx - 1, y - 4, 2, 1, "#a0305a");
      break;
    case "action":
      r(ctx, cx - 6, y - 5, 12, 4, OUTLINE);
      r(ctx, cx - 5, y - 4, 10, 3, "#f2c230");
      r(ctx, cx - 3, y - 4, 3, 1, "#ffe070");
      r(ctx, cx - 8, y - 1, 16, 1, "#d0a020");
      break;
    case "analyse":
      r(ctx, cx - 6, y - 3, 12, 3, "#5aa05a");
      r(ctx, cx + 1, y - 1, 8, 1, "#3a7a3a");
      break;
    case "chef":
      r(ctx, cx - 6, y, 12, 2, "#f2a050");
      break;
  }
}

function drawDesk(ctx: Ctx, z: ZoneDef, seat: number, busy: boolean, t: number) {
  const d = deskRect(z, seat);
  r(ctx, d.x - 1, d.y - 1, d.w + 2, d.h + 2, OUTLINE);
  r(ctx, d.x, d.y, d.w, 4, "#c08a52");
  r(ctx, d.x, d.y + 4, d.w, d.h - 4, "#8a5a34");
  r(ctx, d.x + 2, d.y + 7, d.w - 4, 1, "#6e4628");
  r(ctx, d.x + 2, d.y + 11, 10, 1, "#6e4628");
  r(ctx, d.x + d.w - 12, d.y + 11, 10, 1, "#6e4628");
  // portable vu de dos
  r(ctx, d.x + 10, d.y - 7, 16, 9, OUTLINE);
  r(ctx, d.x + 11, d.y - 6, 14, 7, "#2a2a33");
  const glow = busy && Math.floor(t / 500) % 2 === 0;
  r(ctx, d.x + 17, d.y - 3, 2, 2, busy ? (glow ? z.accent : "#ffffff") : "#44444f");
  // objets selon la zone
  switch (z.id) {
    case "recherche":
      r(ctx, d.x + 2, d.y - 5, 6, 6, "#3b6fd8");
      r(ctx, d.x + 3, d.y - 4, 2, 2, "#5aa05a");
      r(ctx, d.x + 4, d.y + 1, 2, 2, "#5a3a24");
      break;
    case "code":
      r(ctx, d.x + 29, d.y - 4, 4, 5, "#f4f0e8");
      r(ctx, d.x + 33, d.y - 3, 1, 2, "#f4f0e8");
      break;
    case "design":
      r(ctx, d.x + 2, d.y - 3, 7, 4, "#f4f0e8");
      r(ctx, d.x + 3, d.y - 2, 1, 1, "#d0457a");
      r(ctx, d.x + 5, d.y - 2, 1, 1, "#3b6fd8");
      r(ctx, d.x + 7, d.y - 2, 1, 1, "#f2c230");
      break;
    case "action":
      r(ctx, d.x + 28, d.y - 2, 6, 3, "#f4f0e8");
      r(ctx, d.x + 29, d.y - 1, 4, 1, "#a0a0b0");
      break;
    case "analyse":
      r(ctx, d.x + 2, d.y - 6, 6, 7, "#f4f0e8");
      r(ctx, d.x + 3, d.y - 2, 1, 2, "#5aa05a");
      r(ctx, d.x + 5, d.y - 4, 1, 4, "#e07a3a");
      break;
  }
}

function drawChefDesk(ctx: Ctx, busy: boolean, t: number) {
  const d = CHEF_DESK;
  r(ctx, d.x - 1, d.y - 1, d.w + 2, d.h + 2, OUTLINE);
  r(ctx, d.x, d.y, d.w, 5, "#2c2932");
  r(ctx, d.x, d.y + 5, d.w, d.h - 5, "#1a181e");
  r(ctx, d.x + 2, d.y + 6, d.w - 4, 1, "#e07a3a");
  r(ctx, d.x + 28, d.y + 12, 12, 3, "#e07a3a");
  // grand écran
  r(ctx, d.x + 22, d.y - 9, 26, 11, OUTLINE);
  r(ctx, d.x + 23, d.y - 8, 24, 9, "#25232c");
  r(ctx, d.x + 33, d.y - 5, 4, 2, busy && Math.floor(t / 400) % 2 ? "#ffb070" : "#55505f");
  r(ctx, d.x + 4, d.y - 4, 8, 5, "#3a3844");
  r(ctx, d.x + 54, d.y - 4, 5, 5, "#f4f0e8");
  r(ctx, d.x + 59, d.y - 3, 1, 2, "#f4f0e8");
}

/* ------------------------------------------------------------------ */
/* Déplacements                                                        */
/* ------------------------------------------------------------------ */

export type Pose = { mode: "seated" | "walk" | "gone"; x: number; y: number };

function pathFor(zone: ZoneDef, seat: number) {
  const a = seatAnchor(zone, seat);
  const aisle = zone.x < SCENE_W / 2 ? 142 : 240;
  return [
    { x: DOOR.x, y: DOOR.y - 20 },
    { x: DOOR.x, y: 266 },
    { x: aisle, y: 266 },
    { x: aisle, y: a.y },
    { x: a.x, y: a.y },
  ];
}

function along(points: { x: number; y: number }[], p: number) {
  const segs = points.slice(1).map((pt, i) => Math.hypot(pt.x - points[i].x, pt.y - points[i].y));
  let d = Math.max(0, Math.min(1, p)) * segs.reduce((s, x) => s + x, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? d / segs[i] : 1;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * k,
        y: points[i].y + (points[i + 1].y - points[i].y) * k,
      };
    }
    d -= segs[i];
  }
  return points.at(-1)!;
}

export function robotPose(a: Agent, now: number): Pose {
  const zone = ZONE_BY_ID[a.zone];
  if (a.seat < 0) return { mode: "gone", x: 0, y: 0 };
  const path = pathFor(zone, a.seat);
  if (a.leaveAt !== undefined && now >= a.leaveAt) {
    const q = (now - a.leaveAt) / WALK_MS;
    if (q >= 1) return { mode: "gone", x: 0, y: 0 };
    return { mode: "walk", ...along([...path].reverse(), q) };
  }
  const p = (now - a.enterAt) / WALK_MS;
  if (p < 1) return { mode: "walk", ...along(path, p) };
  const s = seatAnchor(zone, a.seat);
  return { mode: "seated", x: s.x, y: s.y };
}

/* ------------------------------------------------------------------ */
/* Image animée                                                        */
/* ------------------------------------------------------------------ */

export function drawFrame(
  ctx: Ctx,
  bg: HTMLCanvasElement,
  office: OfficeState,
  now: number,
  selected: string | null,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);
  const t = now;

  // horloge (heure réelle)
  const d = new Date(now);
  r(ctx, 255, 7, 15, 15, OUTLINE);
  r(ctx, 256, 8, 13, 13, "#d8d8e0");
  const hand = (angle: number, len: number, c: string) => {
    for (let i = 0; i <= len; i++)
      r(ctx, 262 + Math.round(Math.sin(angle) * i), 14 - Math.round(Math.cos(angle) * i), 1, 1, c);
  };
  hand(((d.getHours() % 12) + d.getMinutes() / 60) * (Math.PI / 6), 3, OUTLINE);
  hand(d.getMinutes() * (Math.PI / 30), 5, "#55505f");

  // LED de la baie serveur
  for (let i = 0; i < 9; i++) {
    const on = Math.floor(t / (180 + i * 37) + i) % 3 !== 0;
    r(ctx, 255 + (i % 3) * 4, 32 + Math.floor(i / 3) * 14, 2, 1, on ? (i % 2 ? "#7ef0b0" : "#ffb070") : "#2c2934");
  }

  // arc lumineux du juke-box
  const rainbow = ["#ff5a5a", "#ffa040", "#ffe060", "#7ef07a", "#5ac8ff", "#b48cff"];
  rainbow.forEach((c, i) => {
    const k = (i + Math.floor(t / 200)) % rainbow.length;
    r(ctx, 252 + i * 5, 266 + Math.abs(i - 2.5) * 2, 4, 3, rainbow[k]);
  });
  r(ctx, 256, 286, 22, 6, Math.floor(t / 300) % 2 ? "#3a1a10" : "#5a2a10");
  // petite note qui s'envole
  const nt = (t % 3000) / 3000;
  ctx.globalAlpha = 1 - nt;
  r(ctx, 282 + nt * 6, 262 - nt * 14, 2, 2, "#ff8fcf");
  r(ctx, 284 + nt * 6, 258 - nt * 14, 1, 4, "#ff8fcf");
  ctx.globalAlpha = 1;

  // vapeur de la machine à café
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) {
    const k = ((t / 900 + i / 3) % 1);
    r(ctx, 320 + Math.sin(k * 6 + i) * 2, 272 - k * 10, 1, 2, "#e8e8f0");
  }
  ctx.globalAlpha = 1;

  // le chat
  const cx = 230;
  const cy = 176;
  r(ctx, cx, cy + 3, 8, 7, "#141218");
  r(ctx, cx + 1, cy, 6, 4, "#141218");
  r(ctx, cx + 1, cy - 1, 1, 1, "#141218");
  r(ctx, cx + 6, cy - 1, 1, 1, "#141218");
  if ((t + 900) % 4200 > 160) {
    r(ctx, cx + 2, cy + 1, 1, 1, "#f2c230");
    r(ctx, cx + 5, cy + 1, 1, 1, "#f2c230");
  }
  const tail = Math.floor(t / 400) % 4;
  r(ctx, cx + 8, cy + 8 - (tail === 1 ? 1 : 0), 3, 1, "#141218");
  r(ctx, cx + 10, cy + 5 + (tail === 2 ? 1 : 0), 1, 3, "#141218");

  // postes de travail
  const poses = new Map<string, Pose>();
  for (const a of office.present) poses.set(a.key, robotPose(a, now));
  const seatedAt = new Map<string, Agent>();
  for (const a of office.present) if (poses.get(a.key)?.mode === "seated") seatedAt.set(`${a.zone}:${a.seat}`, a);

  for (const z of ZONES) {
    for (let i = 0; i < 3; i++) {
      const a = seatedAt.get(`${z.id}:${i}`);
      if (a) {
        const p = poses.get(a.key)!;
        drawRobot(ctx, p.x, p.y, { zone: z.id, subagent: a.kind === "subagent", accent: z.accent }, {
          walking: false,
          busy: a.busy,
          t,
          seed: i + z.x,
          selected: selected === a.key,
        });
      }
      drawDesk(ctx, z, i, !!a?.busy, t);
    }
  }

  // le chef
  const chefBusy = office.chef.status === "thinking" || office.chef.status === "waiting";
  drawRobot(ctx, CHEF_ANCHOR.x, CHEF_ANCHOR.y, { zone: "chef", subagent: false, accent: "#ffb070" }, {
    walking: false,
    busy: chefBusy,
    t,
    seed: 3,
    selected: selected === "chef",
  });
  drawChefDesk(ctx, chefBusy, t);

  // robots en marche (par-dessus le mobilier)
  for (const a of office.present) {
    const p = poses.get(a.key)!;
    if (p.mode !== "walk") continue;
    const z = ZONE_BY_ID[a.zone];
    drawRobot(ctx, p.x, p.y, { zone: a.zone, subagent: a.kind === "subagent", accent: z.accent }, {
      walking: true,
      busy: false,
      t,
      seed: a.seat,
      selected: selected === a.key,
    });
  }

  // halo chaud de la lampe du chef + vignette
  const g = ctx.createRadialGradient(192, 120, 10, 192, 160, 260);
  g.addColorStop(0, "rgba(255,190,120,0.07)");
  g.addColorStop(0.6, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
}
