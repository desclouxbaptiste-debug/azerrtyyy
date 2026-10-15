import {
  SCENE_H,
  SCENE_W,
  WALL_H,
  deskRect,
  seatAnchor,
  shade,
  type DecorId,
  type Geometry,
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
/* Mobilier : chaque meuble se dessine depuis son point d'ancrage      */
/* ------------------------------------------------------------------ */

function drawWindow(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  r(ctx, x - 2, y - 2, w + 4, h + 4, "#4a3b55");
  const bands = ["#251c49", "#2f2157", "#3e2864", "#5a3170", "#80406f", "#b2566c", "#d9786a"];
  const bh = h / bands.length;
  bands.forEach((c, i) => r(ctx, x, y + Math.floor(i * bh), w, Math.ceil(bh) + 1, c));
  const rand = rng(seed);
  for (let i = 0; i < 10; i++) r(ctx, x + rand() * w, y + rand() * (h / 2), 1, 1, "#d8d0ff");
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

const BOOKS = ["#c0504a", "#4a7ac0", "#e0b040", "#5aa05a", "#a060c0", "#e07a3a", "#d8d8e0"];

/** Dessin fixe de chaque meuble (fond pré-rendu). */
const DECOR_DRAW: Record<DecorId, (ctx: Ctx, x: number, y: number) => void> = {
  fenetreG: (ctx, x, y) => drawWindow(ctx, x, y, 68, 28, 11),
  fenetreD: (ctx, x, y) => drawWindow(ctx, x, y, 72, 28, 23),
  cadre: (ctx, x, y) => {
    r(ctx, x, y, 24, 16, "#c9852f");
    r(ctx, x + 2, y + 2, 20, 12, "#3a2a1a");
    r(ctx, x + 5, y + 6, 5, 4, "#f2c230");
    r(ctx, x + 14, y + 6, 5, 4, "#f2c230");
  },
  tableau: (ctx, x, y) => {
    r(ctx, x, y, 124, 37, "#8c8aa0");
    r(ctx, x + 2, y + 2, 120, 32, "#e4dff0");
    r(ctx, x + 2, y + 26, 120, 8, "#d6d0e6");
    [
      [10, 8, 30],
      [10, 12, 22],
      [10, 16, 34],
      [50, 8, 18],
    ].forEach(([lx, ly, w]) => r(ctx, x + lx, y + ly, w, 1, "#b9b2cf"));
    for (let i = 0; i < 5; i++) r(ctx, x + 82 + i * 7, y + 25, 5, 4, "#3b6fd8");
    r(ctx, x + 24, y + 35, 70, 2, "#6c6a80");
  },
  horloge: () => {},
  petitCadre: (ctx, x, y) => {
    r(ctx, x, y, 16, 20, "#c9852f");
    r(ctx, x + 2, y + 2, 12, 16, "#3a3040");
    for (let i = 0; i < 10; i++) r(ctx, x + 3 + i, y + 16 - i, 1, 1, "#e07a3a");
  },
  serveur: (ctx, x, y) => {
    r(ctx, x, y, 16, 50, OUTLINE);
    r(ctx, x + 1, y + 1, 14, 48, "#1d1b24");
    for (let dy = 4; dy < 48; dy += 5) r(ctx, x + 2, y + dy, 12, 1, "#2c2934");
  },
  fontaine: (ctx, x, y) => {
    r(ctx, x, y + 12, 12, 18, "#c8ccd8");
    r(ctx, x, y + 12, 12, 2, "#e8ecf4");
    r(ctx, x + 2, y, 8, 12, "#7cc4ff");
    r(ctx, x + 3, y + 1, 2, 9, "#b6e2ff");
    r(ctx, x + 4, y + 18, 4, 2, "#5a6070");
  },
  planteG: (ctx, x, y) => drawPlant(ctx, x, y, "l"),
  canape: (ctx, x, y) => {
    r(ctx, x, y, 56, 30, OUTLINE);
    r(ctx, x + 1, y + 1, 54, 11, "#c8642c");
    r(ctx, x + 1, y + 12, 54, 12, "#e07a3a");
    r(ctx, x + 4, y + 13, 23, 2, "#f09a5a");
    r(ctx, x + 29, y + 13, 23, 2, "#f09a5a");
    r(ctx, x + 1, y + 1, 5, 23, "#b0552a");
    r(ctx, x + 50, y + 1, 5, 23, "#b0552a");
    r(ctx, x + 3, y + 24, 3, 5, "#3a2414");
    r(ctx, x + 50, y + 24, 3, 5, "#3a2414");
    r(ctx, x + 14, y - 3, 5, 4, "#f4f0e8");
    r(ctx, x + 22, y - 3, 5, 4, "#f4f0e8");
  },
  bibliotheque: (ctx, x, y) => {
    r(ctx, x, y, 34, 48, OUTLINE);
    r(ctx, x + 1, y + 1, 32, 46, "#5a3a24");
    const rb = rng(3);
    for (let s = 0; s < 3; s++) {
      const sy = y + 3 + s * 15;
      r(ctx, x + 2, sy + 12, 30, 2, "#3a2414");
      let bx = x + 3;
      while (bx < x + 30) {
        const bw = 2 + Math.floor(rb() * 3);
        const bh = 8 + Math.floor(rb() * 4);
        r(ctx, bx, sy + 12 - bh, Math.min(bw, x + 32 - bx), bh, BOOKS[Math.floor(rb() * BOOKS.length)]);
        bx += bw + (rb() > 0.8 ? 2 : 0);
      }
    }
  },
  poubelle: (ctx, x, y) => {
    r(ctx, x, y + 1, 12, 16, OUTLINE);
    r(ctx, x + 1, y + 2, 10, 14, "#6a6a78");
    r(ctx, x, y, 12, 2, "#8a8a98");
    r(ctx, x + 4, y + 4, 1, 10, "#555562");
    r(ctx, x + 8, y + 4, 1, 10, "#555562");
  },
  cactus: (ctx, x, y) => {
    r(ctx, x + 1, y + 26, 12, 12, "#d8d8d8");
    r(ctx, x + 4, y, 6, 26, "#4f9a58");
    r(ctx, x, y + 8, 4, 8, "#4f9a58");
    r(ctx, x + 10, y + 4, 4, 8, "#4f9a58");
    r(ctx, x + 6, y + 2, 1, 22, "#6fba78");
  },
  paillasson: (ctx, x, y) => {
    r(ctx, x, y, 40, 14, "#a8502a");
    r(ctx, x + 2, y + 2, 36, 10, "#c8642c");
    for (let dx = 4; dx < 36; dx += 4) r(ctx, x + dx, y + 3, 2, 8, "#a8502a");
  },
  planteBas: (ctx, x, y) => drawPlant(ctx, x, y, "m"),
  jukebox: (ctx, x, y) => {
    r(ctx, x, y, 38, 52, OUTLINE);
    r(ctx, x + 1, y + 8, 36, 43, "#5a2a1a");
    r(ctx, x + 5, y + 2, 28, 8, "#5a2a1a");
    r(ctx, x + 6, y + 22, 26, 10, "#1a0e0a");
    r(ctx, x + 8, y + 34, 22, 14, "#3a1a10");
    for (let dy = 36; dy < 47; dy += 2) r(ctx, x + 9, y + dy, 20, 1, "#6a3a24");
  },
  plantePetite: (ctx, x, y) => drawPlant(ctx, x, y, "s"),
  cuisine: (ctx, x, y) => {
    r(ctx, x, y, 76, 30, OUTLINE);
    r(ctx, x + 1, y + 1, 74, 4, "#f0f0f4");
    r(ctx, x + 1, y + 5, 74, 24, "#d8d8e0");
    for (let dx = 1; dx < 74; dx += 18) {
      r(ctx, x + dx, y + 5, 1, 24, "#a0a0b0");
      r(ctx, x + dx + 8, y + 12, 3, 1, "#808090");
    }
    r(ctx, x + 8, y - 14, 14, 15, "#2a2830");
    r(ctx, x + 10, y - 12, 10, 4, "#4a4855");
    r(ctx, x + 13, y - 5, 4, 5, "#f4f0e8");
    r(ctx, x + 30, y - 4, 4, 5, "#f4f0e8");
    r(ctx, x + 37, y - 4, 4, 5, "#7cc4ff");
    drawPlant(ctx, x + 58, y - 10, "m");
  },
  chat: () => {},
};

/** Partie animée de certains meubles, redessinée à chaque image. */
const DECOR_ANIM: Partial<Record<DecorId, (ctx: Ctx, x: number, y: number, t: number) => void>> = {
  horloge: (ctx, x, y, t) => {
    const d = new Date(t);
    r(ctx, x, y, 15, 15, OUTLINE);
    r(ctx, x + 1, y + 1, 13, 13, "#d8d8e0");
    const hand = (angle: number, len: number, c: string) => {
      for (let i = 0; i <= len; i++)
        r(ctx, x + 7 + Math.round(Math.sin(angle) * i), y + 7 - Math.round(Math.cos(angle) * i), 1, 1, c);
    };
    hand(((d.getHours() % 12) + d.getMinutes() / 60) * (Math.PI / 6), 3, OUTLINE);
    hand(d.getMinutes() * (Math.PI / 30), 5, "#55505f");
  },
  serveur: (ctx, x, y, t) => {
    for (let i = 0; i < 9; i++) {
      const on = Math.floor(t / (180 + i * 37) + i) % 3 !== 0;
      r(ctx, x + 3 + (i % 3) * 4, y + 6 + Math.floor(i / 3) * 14, 2, 1, on ? (i % 2 ? "#7ef0b0" : "#ffb070") : "#2c2934");
    }
  },
  jukebox: (ctx, x, y, t) => {
    const rainbow = ["#ff5a5a", "#ffa040", "#ffe060", "#7ef07a", "#5ac8ff", "#b48cff"];
    rainbow.forEach((_, i) => {
      const k = (i + Math.floor(t / 200)) % rainbow.length;
      r(ctx, x + 4 + i * 5, y + 4 + Math.abs(i - 2.5) * 2, 4, 3, rainbow[k]);
    });
    r(ctx, x + 8, y + 24, 22, 6, Math.floor(t / 300) % 2 ? "#3a1a10" : "#5a2a10");
    const nt = (t % 3000) / 3000;
    ctx.globalAlpha = 1 - nt;
    r(ctx, x + 34 + nt * 6, y - nt * 14, 2, 2, "#ff8fcf");
    r(ctx, x + 36 + nt * 6, y - 4 - nt * 14, 1, 4, "#ff8fcf");
    ctx.globalAlpha = 1;
  },
  cuisine: (ctx, x, y, t) => {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const k = (t / 900 + i / 3) % 1;
      r(ctx, x + 14 + Math.sin(k * 6 + i) * 2, y - 16 - k * 10, 1, 2, "#e8e8f0");
    }
    ctx.globalAlpha = 1;
  },
  chat: (ctx, x, y, t) => {
    r(ctx, x, y + 3, 8, 7, "#141218");
    r(ctx, x + 1, y, 6, 4, "#141218");
    r(ctx, x + 1, y - 1, 1, 1, "#141218");
    r(ctx, x + 6, y - 1, 1, 1, "#141218");
    if ((t + 900) % 4200 > 160) {
      r(ctx, x + 2, y + 1, 1, 1, "#f2c230");
      r(ctx, x + 5, y + 1, 1, 1, "#f2c230");
    }
    const tail = Math.floor(t / 400) % 4;
    r(ctx, x + 8, y + 8 - (tail === 1 ? 1 : 0), 3, 1, "#141218");
    r(ctx, x + 10, y + 5 + (tail === 2 ? 1 : 0), 1, 3, "#141218");
  },
};

/* ------------------------------------------------------------------ */
/* Décor statique                                                      */
/* ------------------------------------------------------------------ */

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

export function drawBackground(ctx: Ctx, geo: Geometry) {
  ctx.imageSmoothingEnabled = false;
  const { floor, wall } = geo.config;

  // Sol en briques
  const floorLight = shade(floor, 0.06);
  const floorDark = shade(floor, -0.1);
  const mortar = shade(floor, -0.25);
  r(ctx, 0, 0, SCENE_W, SCENE_H, floor);
  const rand = rng(7);
  for (let row = 0; row * 8 + WALL_H < SCENE_H; row++) {
    const y = WALL_H + row * 8;
    const off = row % 2 ? 8 : 0;
    for (let x = -off; x < SCENE_W; x += 16) {
      const v = rand();
      r(ctx, x, y, 16, 8, v > 0.8 ? floorLight : v < 0.2 ? floorDark : floor);
      r(ctx, x, y, 16, 1, mortar);
      r(ctx, x, y, 1, 8, mortar);
    }
  }

  // Mur du fond
  r(ctx, 0, 0, SCENE_W, WALL_H, wall);
  for (let x = 0; x < SCENE_W; x += 24) r(ctx, x, 2, 1, 38, shade(wall, -0.15));
  r(ctx, 0, 0, SCENE_W, 2, shade(wall, -0.35));
  r(ctx, 0, 40, SCENE_W, 4, shade(wall, -0.42));
  r(ctx, 0, 40, SCENE_W, 1, shade(wall, 0.12));
  r(ctx, 0, WALL_H, SCENE_W, 3, shade(floor, -0.3));

  // Ce qui est accroché au mur passe sous les tapis, le reste du mobilier dessus.
  const onWall = (d: { y: number }) => d.y < WALL_H;
  for (const d of geo.decor) if (d.visible && onWall(d)) DECOR_DRAW[d.id](ctx, d.x, d.y);

  // Zones : tapis et chaises
  for (const z of geo.zones) {
    drawRug(ctx, z, z.rug, z.rugDark);
    for (let i = 0; i < 3; i++) {
      const d = deskRect(z, i);
      drawChair(ctx, d.x + 18, d.y - 19, 18, 17);
    }
  }

  // Bureau du chef
  drawRug(ctx, geo.chef.rug, "#4e321e", "#3a2414");
  drawChair(ctx, geo.chef.anchor.x, geo.chef.desk.y - 22, 22, 20);

  for (const d of geo.decor) if (d.visible && !onWall(d)) DECOR_DRAW[d.id](ctx, d.x, d.y);
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
  const bob = o.walking ? Math.floor(t / 160) % 2 : o.busy ? Math.floor((t + seed * 97) / 420) % 2 : 0;
  const y = top + bob;
  const body = chef ? "#3a3844" : look.subagent ? "#d6ecff" : "#e9eef4";
  const head = chef ? "#e8873a" : body;
  const shadeC = chef ? "#b8652a" : look.subagent ? "#9fc0dc" : "#b8c2cf";
  const blink = (t + seed * 431) % 3800 < 140;
  const eye = o.busy || chef ? (chef ? "#ffb070" : look.accent) : "#6a8a9a";

  if (o.selected) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t / 180);
    r(ctx, cx - 10, y - 8, 20, 30, "#fff3b0");
    ctx.globalAlpha = 1;
  }

  if (o.walking) {
    const step = Math.floor(t / 160) % 2;
    r(ctx, cx - 4, y + 17, 3, step ? 4 : 3, OUTLINE);
    r(ctx, cx + 1, y + 17, 3, step ? 3 : 4, OUTLINE);
  }
  r(ctx, cx - 6, y + 8, 12, 10, OUTLINE);
  r(ctx, cx - 5, y + 9, 10, 8, chef ? body : "#cdd6e0");
  if (chef) r(ctx, cx - 1, y + 10, 2, 5, "#e07a3a");
  else r(ctx, cx - 1, y + 11, 2, 2, look.accent);
  const type = o.busy && !o.walking ? Math.floor((t + seed * 53) / 140) % 2 : 0;
  r(ctx, cx - 8, y + 10 + type, 2, 5, OUTLINE);
  r(ctx, cx + 6, y + 11 - type, 2, 5, OUTLINE);
  r(ctx, cx - 7, y - 1, 14, 11, OUTLINE);
  r(ctx, cx - 6, y, 12, 9, head);
  r(ctx, cx - 6, y + 8, 12, 1, shadeC);
  r(ctx, cx - 4, y + 2, 8, 5, "#1d2433");
  if (blink) {
    r(ctx, cx - 3, y + 4, 2, 1, eye);
    r(ctx, cx + 1, y + 4, 2, 1, eye);
  } else {
    r(ctx, cx - 3, y + 3, 2, 2, eye);
    r(ctx, cx + 1, y + 3, 2, 2, eye);
  }

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
  r(ctx, d.x + 10, d.y - 7, 16, 9, OUTLINE);
  r(ctx, d.x + 11, d.y - 6, 14, 7, "#2a2a33");
  const glow = busy && Math.floor(t / 500) % 2 === 0;
  r(ctx, d.x + 17, d.y - 3, 2, 2, busy ? (glow ? z.accent : "#ffffff") : "#44444f");
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

function drawChefDesk(ctx: Ctx, d: { x: number; y: number; w: number; h: number }, busy: boolean, t: number) {
  r(ctx, d.x - 1, d.y - 1, d.w + 2, d.h + 2, OUTLINE);
  r(ctx, d.x, d.y, d.w, 5, "#2c2932");
  r(ctx, d.x, d.y + 5, d.w, d.h - 5, "#1a181e");
  r(ctx, d.x + 2, d.y + 6, d.w - 4, 1, "#e07a3a");
  r(ctx, d.x + 28, d.y + 12, 12, 3, "#e07a3a");
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

function pathFor(geo: Geometry, zone: ZoneDef, seat: number) {
  const a = seatAnchor(zone, seat);
  // L'allée longe le côté de la zone tourné vers le centre de la pièce.
  const aisle = zone.x + zone.w / 2 < SCENE_W / 2 ? zone.x + zone.w + 4 : zone.x - 6;
  const corridor = Math.max(WALL_H + 20, geo.door.y - 40);
  return [
    { x: geo.door.x, y: geo.door.y - 6 },
    { x: geo.door.x, y: corridor },
    { x: aisle, y: corridor },
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

export function robotPose(a: Agent, now: number, geo: Geometry): Pose {
  const zone = geo.byId[a.zone];
  if (a.seat < 0 || !zone) return { mode: "gone", x: 0, y: 0 };
  const path = pathFor(geo, zone, a.seat);
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
  geo: Geometry,
  editing = false,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);
  const t = now;

  for (const d of geo.decor) if (d.visible) DECOR_ANIM[d.id]?.(ctx, d.x, d.y, t);

  const poses = new Map<string, Pose>();
  for (const a of office.present) poses.set(a.key, robotPose(a, now, geo));
  const seatedAt = new Map<string, Agent>();
  for (const a of office.present) if (poses.get(a.key)?.mode === "seated") seatedAt.set(`${a.zone}:${a.seat}`, a);

  for (const z of geo.zones) {
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

  const chefBusy = office.chef.status === "thinking" || office.chef.status === "waiting";
  drawRobot(ctx, geo.chef.anchor.x, geo.chef.anchor.y, { zone: "chef", subagent: false, accent: "#ffb070" }, {
    walking: false,
    busy: chefBusy,
    t,
    seed: 3,
    selected: selected === "chef",
  });
  drawChefDesk(ctx, geo.chef.desk, chefBusy, t);

  for (const a of office.present) {
    const p = poses.get(a.key)!;
    if (p.mode !== "walk") continue;
    const z = geo.byId[a.zone];
    drawRobot(ctx, p.x, p.y, { zone: a.zone, subagent: a.kind === "subagent", accent: z.accent }, {
      walking: true,
      busy: false,
      t,
      seed: a.seat,
      selected: selected === a.key,
    });
  }

  const g = ctx.createRadialGradient(
    geo.chef.anchor.x,
    geo.chef.anchor.y + 18,
    10,
    SCENE_W / 2,
    SCENE_H / 2,
    260,
  );
  g.addColorStop(0, "rgba(255,190,120,0.07)");
  g.addColorStop(0.6, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);

  // Quadrillage d'aide en mode « Aménager »
  if (editing) {
    ctx.globalAlpha = 0.09;
    for (let x = 0; x < SCENE_W; x += 8) r(ctx, x, 0, 1, SCENE_H, "#ffffff");
    for (let y = 0; y < SCENE_H; y += 8) r(ctx, 0, y, SCENE_W, 1, "#ffffff");
    ctx.globalAlpha = 1;
  }
}
