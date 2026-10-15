import type { ZoneId } from "./types";

/** Résolution logique de la scène (pixels "art"), mise à l'échelle en CSS. */
export const SCENE_W = 384;
export const SCENE_H = 320;
/** Hauteur du mur du fond : le sol commence en dessous. */
export const WALL_H = 44;

export type Rect = { x: number; y: number; w: number; h: number };

// Déclaré tôt : DEFAULT_GEOMETRY (plus bas) appelle shade() dès le chargement du module.
const HEX = /^#[0-9a-f]{6}$/i;

/* ------------------------------------------------------------------ */
/* Configuration éditable (mode « Aménager »)                          */
/* ------------------------------------------------------------------ */

export type ZoneConfig = {
  id: ZoneId;
  label: string;
  role: string;
  x: number;
  y: number;
  rug: string;
  accent: string;
  names: [string, string, string];
};

export const DECOR_IDS = [
  "fenetreG",
  "fenetreD",
  "cadre",
  "tableau",
  "horloge",
  "petitCadre",
  "serveur",
  "fontaine",
  "planteG",
  "canape",
  "bibliotheque",
  "poubelle",
  "cactus",
  "paillasson",
  "planteBas",
  "jukebox",
  "plantePetite",
  "cuisine",
  "chat",
] as const;
export type DecorId = (typeof DECOR_IDS)[number];

export type DecorConfig = { id: DecorId; x: number; y: number; visible: boolean };

export type OfficeConfig = {
  version: 1;
  title: string;
  chefName: string;
  /** Coin haut-gauche du tapis du chef. */
  chef: { x: number; y: number };
  wall: string;
  floor: string;
  zones: ZoneConfig[];
  decor: DecorConfig[];
};

/** Nom affiché et zone cliquable (relative au point d'ancrage) de chaque meuble. */
export const DECOR_META: Record<DecorId, { label: string; box: Rect }> = {
  fenetreG: { label: "Fenêtre gauche", box: { x: -3, y: -2, w: 74, h: 34 } },
  fenetreD: { label: "Fenêtre droite", box: { x: -3, y: -2, w: 78, h: 34 } },
  cadre: { label: "Tableau doré", box: { x: 0, y: 0, w: 24, h: 16 } },
  tableau: { label: "Tableau blanc", box: { x: 0, y: 0, w: 124, h: 37 } },
  horloge: { label: "Horloge", box: { x: 0, y: 0, w: 15, h: 15 } },
  petitCadre: { label: "Petit cadre", box: { x: 0, y: 0, w: 16, h: 20 } },
  serveur: { label: "Baie serveur", box: { x: 0, y: 0, w: 16, h: 50 } },
  fontaine: { label: "Fontaine à eau", box: { x: 0, y: 0, w: 12, h: 30 } },
  planteG: { label: "Grande plante", box: { x: -4, y: -20, w: 24, h: 31 } },
  canape: { label: "Canapé", box: { x: 0, y: -3, w: 56, h: 33 } },
  bibliotheque: { label: "Bibliothèque", box: { x: 0, y: 0, w: 34, h: 48 } },
  poubelle: { label: "Poubelle", box: { x: 0, y: 0, w: 12, h: 17 } },
  cactus: { label: "Cactus", box: { x: 0, y: 0, w: 14, h: 38 } },
  paillasson: { label: "Porte d'entrée", box: { x: 0, y: 0, w: 40, h: 14 } },
  planteBas: { label: "Plante", box: { x: -4, y: -14, w: 18, h: 22 } },
  jukebox: { label: "Juke-box", box: { x: 0, y: 0, w: 38, h: 52 } },
  plantePetite: { label: "Petite plante", box: { x: -4, y: -12, w: 16, h: 19 } },
  cuisine: { label: "Coin café", box: { x: 0, y: -24, w: 76, h: 54 } },
  chat: { label: "Le chat", box: { x: 0, y: -1, w: 11, h: 11 } },
};

const DECOR_DEFAULT: Record<DecorId, [number, number]> = {
  fenetreG: [6, 6],
  fenetreD: [306, 6],
  cadre: [86, 9],
  tableau: [126, 2],
  horloge: [255, 7],
  petitCadre: [276, 6],
  serveur: [252, 26],
  fontaine: [18, 146],
  planteG: [112, 166],
  canape: [8, 280],
  bibliotheque: [70, 264],
  poubelle: [118, 293],
  cactus: [146, 272],
  paillasson: [172, 306],
  planteBas: [222, 296],
  jukebox: [248, 262],
  plantePetite: [290, 298],
  cuisine: [306, 288],
  chat: [230, 176],
};

const ZONE_SIZE: Record<ZoneId, { w: number; h: number }> = {
  recherche: { w: 132, h: 78 },
  code: { w: 132, h: 66 },
  design: { w: 132, h: 66 },
  action: { w: 132, h: 70 },
  analyse: { w: 132, h: 66 },
};

export const DEFAULT_CONFIG: OfficeConfig = {
  version: 1,
  title: "Le Bureau de Claude",
  chefName: "Max",
  chef: { x: 150, y: 84 },
  wall: "#2b2236",
  floor: "#2e2420",
  zones: [
    {
      id: "recherche",
      label: "RECHERCHE",
      role: "Chercheur",
      x: 6,
      y: 54,
      rug: "#294766",
      accent: "#7cc4ff",
      names: ["Hugo", "Zoé", "Léo"],
    },
    {
      id: "code",
      label: "CODE",
      role: "Développeur",
      x: 246,
      y: 54,
      rug: "#2a5648",
      accent: "#7ef0b0",
      names: ["Inès", "Tom", "Nina"],
    },
    {
      id: "design",
      label: "DESIGN",
      role: "Designer",
      x: 246,
      y: 128,
      rug: "#55304f",
      accent: "#ff8fcf",
      names: ["Jade", "Paul", "Chloé"],
    },
    {
      id: "action",
      label: "ACTION",
      role: "Opérateur",
      x: 6,
      y: 186,
      rug: "#352d63",
      accent: "#b49cff",
      names: ["Lucas", "Emma", "Noah"],
    },
    {
      id: "analyse",
      label: "ANALYSE",
      role: "Analyste",
      x: 246,
      y: 202,
      rug: "#56552a",
      accent: "#e8e070",
      names: ["Lina", "Arthur", "Rose"],
    },
  ],
  decor: DECOR_IDS.map((id) => ({ id, x: DECOR_DEFAULT[id][0], y: DECOR_DEFAULT[id][1], visible: true })),
};

/* ------------------------------------------------------------------ */
/* Géométrie dérivée de la configuration                               */
/* ------------------------------------------------------------------ */

export type ZoneDef = Rect & {
  id: ZoneId;
  label: string;
  role: string;
  rug: string;
  rugDark: string;
  accent: string;
  names: [string, string, string];
};

export type Geometry = {
  zones: ZoneDef[];
  byId: Record<ZoneId, ZoneDef>;
  chef: { rug: Rect; desk: Rect; anchor: { x: number; y: number } };
  /** La porte d'entrée (centre du paillasson), d'où arrivent les robots. */
  door: { x: number; y: number };
  decor: DecorConfig[];
  config: OfficeConfig;
};

export function geometry(cfg: OfficeConfig): Geometry {
  const zones = cfg.zones.map<ZoneDef>((z) => ({
    ...z,
    ...ZONE_SIZE[z.id],
    rugDark: shade(z.rug, -0.3),
  }));
  const { x, y } = cfg.chef;
  const mat = cfg.decor.find((d) => d.id === "paillasson") ?? { x: 172, y: 306 };
  return {
    zones,
    byId: Object.fromEntries(zones.map((z) => [z.id, z])) as Record<ZoneId, ZoneDef>,
    chef: {
      rug: { x, y, w: 84, h: 74 },
      desk: { x: x + 8, y: y + 36, w: 68, h: 20 },
      anchor: { x: x + 42, y: y + 18 },
    },
    door: { x: mat.x + 20, y: mat.y + 10 },
    decor: cfg.decor,
    config: cfg,
  };
}

export const DEFAULT_GEOMETRY = geometry(DEFAULT_CONFIG);

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

export const toPct = (x: number, y: number) => ({
  left: `${(x / SCENE_W) * 100}%`,
  top: `${(y / SCENE_H) * 100}%`,
});

export const rectPct = (r: Rect) => ({
  ...toPct(r.x, r.y),
  width: `${(r.w / SCENE_W) * 100}%`,
  height: `${(r.h / SCENE_H) * 100}%`,
});

/* ------------------------------------------------------------------ */
/* Couleurs et validation                                              */
/* ------------------------------------------------------------------ */

/** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur #rrggbb. */
export function shade(hex: string, amt: number) {
  if (!HEX.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const target = amt < 0 ? 0 : 255;
  const k = Math.min(1, Math.abs(amt));
  const ch = (v: number) => Math.round(v + (target - v) * k);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(ch);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v))) : fallback;
const text = (v: unknown, fallback: string, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);

export function clampZone(id: ZoneId, x: number, y: number) {
  const s = ZONE_SIZE[id];
  return { x: clamp(x, 0, SCENE_W - s.w, 0), y: clamp(y, WALL_H, SCENE_H - s.h, WALL_H) };
}

export function clampChef(x: number, y: number) {
  return { x: clamp(x, 0, SCENE_W - 84, 0), y: clamp(y, WALL_H, SCENE_H - 74, WALL_H) };
}

export function clampDecor(id: DecorId, x: number, y: number) {
  const b = DECOR_META[id].box;
  return {
    x: clamp(x, -b.x, SCENE_W - b.x - b.w, -b.x),
    y: clamp(y, -b.y, SCENE_H - b.y - b.h, -b.y),
  };
}

/** Accepte n'importe quel JSON (import, stockage) et renvoie une configuration valide. */
export function sanitizeConfig(raw: unknown): OfficeConfig {
  const d = DEFAULT_CONFIG;
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof OfficeConfig, unknown>>;
  const zonesIn = Array.isArray(o.zones) ? (o.zones as Partial<ZoneConfig>[]) : [];
  const decorIn = Array.isArray(o.decor) ? (o.decor as Partial<DecorConfig>[]) : [];
  const chefIn = (o.chef && typeof o.chef === "object" ? o.chef : {}) as { x?: unknown; y?: unknown };
  return {
    version: 1,
    title: text(o.title, d.title, 40),
    chefName: text(o.chefName, d.chefName, 14),
    chef: clampChef(
      clamp(chefIn.x, -1e9, 1e9, d.chef.x),
      clamp(chefIn.y, -1e9, 1e9, d.chef.y),
    ),
    wall: color(o.wall, d.wall),
    floor: color(o.floor, d.floor),
    zones: d.zones.map((def) => {
      const z = zonesIn.find((x) => x?.id === def.id) ?? {};
      const names = Array.isArray(z.names) ? z.names : [];
      const pos = clampZone(def.id, clamp(z.x, -1e9, 1e9, def.x), clamp(z.y, -1e9, 1e9, def.y));
      return {
        id: def.id,
        label: text(z.label, def.label, 14),
        role: text(z.role, def.role, 20),
        ...pos,
        rug: color(z.rug, def.rug),
        accent: color(z.accent, def.accent),
        names: def.names.map((n, i) => text(names[i], n, 12)) as [string, string, string],
      };
    }),
    decor: d.decor.map((def) => {
      const it = decorIn.find((x) => x?.id === def.id) ?? {};
      const pos = clampDecor(def.id, clamp(it.x, -1e9, 1e9, def.x), clamp(it.y, -1e9, 1e9, def.y));
      return { id: def.id, ...pos, visible: typeof it.visible === "boolean" ? it.visible : true };
    }),
  };
}
