export type WeaponId = "pistol" | "smg" | "rifle" | "shotgun" | "sniper";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  description: string;
  damage: number;
  pelletCount: number; // >1 for shotgun-style spread
  fireRateMs: number; // delay between shots
  magSize: number;
  reloadMs: number;
  spread: number; // radians, hip-fire
  adsSpreadMult: number; // spread multiplier while aiming down sights
  adsFov: number; // camera fov while aiming
  range: number;
  auto: boolean; // held-fire vs semi-auto
  unlockCost: number; // soft currency, 0 = owned by default
  color: number; // accent color for the weapon model / muzzle flash tint
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: "pistol",
    name: "Sidearm P9",
    description: "Fiable, rechargement rapide. Ton point de départ.",
    damage: 22,
    pelletCount: 1,
    fireRateMs: 220,
    magSize: 12,
    reloadMs: 900,
    spread: 0.012,
    adsSpreadMult: 0.35,
    adsFov: 0.85,
    range: 60,
    auto: false,
    unlockCost: 0,
    color: 0x9fb4c7,
  },
  smg: {
    id: "smg",
    name: "Riposte SMG",
    description: "Cadence élevée, idéal au corps à corps, faible portée.",
    damage: 14,
    pelletCount: 1,
    fireRateMs: 90,
    magSize: 32,
    reloadMs: 1400,
    spread: 0.035,
    adsSpreadMult: 0.45,
    adsFov: 0.92,
    range: 34,
    auto: true,
    unlockCost: 400,
    color: 0xffb545,
  },
  rifle: {
    id: "rifle",
    name: "Vindex AR",
    description: "Polyvalent : dégâts et portée équilibrés.",
    damage: 26,
    pelletCount: 1,
    fireRateMs: 130,
    magSize: 30,
    reloadMs: 1700,
    spread: 0.02,
    adsSpreadMult: 0.3,
    adsFov: 0.8,
    range: 70,
    auto: true,
    unlockCost: 900,
    color: 0x5ad1ff,
  },
  shotgun: {
    id: "shotgun",
    name: "Ravage 12",
    description: "Dévastateur à courte portée, lent à recharger.",
    damage: 16,
    pelletCount: 8,
    fireRateMs: 700,
    magSize: 6,
    reloadMs: 2200,
    spread: 0.11,
    adsSpreadMult: 0.7,
    adsFov: 0.95,
    range: 18,
    auto: false,
    unlockCost: 1200,
    color: 0xff5a5a,
  },
  sniper: {
    id: "sniper",
    name: "Apex .50",
    description: "Un coup, une élimination. Zoom longue portée.",
    damage: 100,
    pelletCount: 1,
    fireRateMs: 1150,
    magSize: 5,
    reloadMs: 2400,
    spread: 0.004,
    adsSpreadMult: 0.05,
    adsFov: 0.35,
    range: 140,
    auto: false,
    unlockCost: 2200,
    color: 0xa06bff,
  },
};

export const WEAPON_ORDER: WeaponId[] = ["pistol", "smg", "rifle", "shotgun", "sniper"];

export const DEFAULT_OWNED_WEAPONS: WeaponId[] = ["pistol"];
