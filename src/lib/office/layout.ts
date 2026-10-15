import type { ZoneId } from "./types";

/** Résolution logique de la scène (pixels "art"), mise à l'échelle en CSS. */
export const SCENE_W = 384;
export const SCENE_H = 320;

export type Rect = { x: number; y: number; w: number; h: number };

export type ZoneDef = Rect & {
  id: ZoneId;
  label: string;
  role: string;
  rug: string;
  rugDark: string;
  accent: string;
  names: [string, string, string];
};

export const ZONES: ZoneDef[] = [
  {
    id: "recherche",
    label: "RECHERCHE",
    role: "Chercheur",
    x: 6,
    y: 54,
    w: 132,
    h: 78,
    rug: "#294766",
    rugDark: "#1d3550",
    accent: "#7cc4ff",
    names: ["Hugo", "Zoé", "Léo"],
  },
  {
    id: "code",
    label: "CODE",
    role: "Développeur",
    x: 246,
    y: 54,
    w: 132,
    h: 66,
    rug: "#2a5648",
    rugDark: "#1e4136",
    accent: "#7ef0b0",
    names: ["Inès", "Tom", "Nina"],
  },
  {
    id: "design",
    label: "DESIGN",
    role: "Designer",
    x: 246,
    y: 128,
    w: 132,
    h: 66,
    rug: "#55304f",
    rugDark: "#41233c",
    accent: "#ff8fcf",
    names: ["Jade", "Paul", "Chloé"],
  },
  {
    id: "action",
    label: "ACTION",
    role: "Opérateur",
    x: 6,
    y: 186,
    w: 132,
    h: 70,
    rug: "#352d63",
    rugDark: "#28224d",
    accent: "#b49cff",
    names: ["Lucas", "Emma", "Noah"],
  },
  {
    id: "analyse",
    label: "ANALYSE",
    role: "Analyste",
    x: 246,
    y: 202,
    w: 132,
    h: 66,
    rug: "#56552a",
    rugDark: "#42411e",
    accent: "#e8e070",
    names: ["Lina", "Arthur", "Rose"],
  },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<
  ZoneId,
  ZoneDef
>;

export const DESK_W = 36;
export const DESK_H = 16;

export function deskRect(zone: ZoneDef, seat: number): Rect {
  return {
    x: zone.x + 7 + seat * 41,
    y: zone.y + zone.h - 22,
    w: DESK_W,
    h: DESK_H,
  };
}

/** Point d'ancrage (haut de la tête) d'un robot assis à un poste. */
export function seatAnchor(zone: ZoneDef, seat: number) {
  const d = deskRect(zone, seat);
  return { x: d.x + 18, y: d.y - 16 };
}

export const CHEF_RUG: Rect = { x: 150, y: 84, w: 84, h: 74 };
export const CHEF_DESK: Rect = { x: 158, y: 120, w: 68, h: 20 };
export const CHEF_ANCHOR = { x: 192, y: 102 };

/** La porte d'entrée (paillasson), d'où arrivent les robots. */
export const DOOR = { x: 192, y: 316 };

export const toPct = (x: number, y: number) => ({
  left: `${(x / SCENE_W) * 100}%`,
  top: `${(y / SCENE_H) * 100}%`,
});
