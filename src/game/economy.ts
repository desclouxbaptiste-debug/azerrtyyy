import { DEFAULT_OWNED_WEAPONS, WEAPONS, type WeaponId } from "./weapons-data";

const STORAGE_KEY = "strike-protocol-economy-v1";

export interface EconomyState {
  credits: number; // soft currency, earned in-game
  gold: number; // premium currency, purchased with real money
  ownedWeapons: WeaponId[];
  bestWave: number;
  totalKills: number;
}

const DEFAULT_STATE: EconomyState = {
  credits: 0,
  gold: 0,
  ownedWeapons: [...DEFAULT_OWNED_WEAPONS],
  bestWave: 0,
  totalKills: 0,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadEconomy(): EconomyState {
  if (!isBrowser()) return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<EconomyState>;
    return {
      credits: parsed.credits ?? DEFAULT_STATE.credits,
      gold: parsed.gold ?? DEFAULT_STATE.gold,
      ownedWeapons:
        parsed.ownedWeapons && parsed.ownedWeapons.length > 0
          ? parsed.ownedWeapons
          : [...DEFAULT_OWNED_WEAPONS],
      bestWave: parsed.bestWave ?? 0,
      totalKills: parsed.totalKills ?? 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveEconomy(state: EconomyState) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode / quota) — silently skip persistence
  }
}

export function canAfford(state: EconomyState, weaponId: WeaponId): boolean {
  return state.ownedWeapons.includes(weaponId) || state.credits >= WEAPONS[weaponId].unlockCost;
}

export function unlockWeapon(state: EconomyState, weaponId: WeaponId): EconomyState {
  if (state.ownedWeapons.includes(weaponId)) return state;
  const cost = WEAPONS[weaponId].unlockCost;
  if (state.credits < cost) return state;
  const next: EconomyState = {
    ...state,
    credits: state.credits - cost,
    ownedWeapons: [...state.ownedWeapons, weaponId],
  };
  saveEconomy(next);
  return next;
}

export function unlockWeaponWithGold(
  state: EconomyState,
  weaponId: WeaponId,
  goldCost: number
): EconomyState {
  if (state.ownedWeapons.includes(weaponId) || state.gold < goldCost) return state;
  const next: EconomyState = {
    ...state,
    gold: state.gold - goldCost,
    ownedWeapons: [...state.ownedWeapons, weaponId],
  };
  saveEconomy(next);
  return next;
}

export function addCredits(state: EconomyState, amount: number): EconomyState {
  const next = { ...state, credits: state.credits + amount };
  saveEconomy(next);
  return next;
}

export function addGold(state: EconomyState, amount: number): EconomyState {
  const next = { ...state, gold: state.gold + amount };
  saveEconomy(next);
  return next;
}

export function recordRunResult(
  state: EconomyState,
  wave: number,
  kills: number
): EconomyState {
  const next: EconomyState = {
    ...state,
    bestWave: Math.max(state.bestWave, wave),
    totalKills: state.totalKills + kills,
  };
  saveEconomy(next);
  return next;
}

export interface GoldPack {
  id: string;
  label: string;
  gold: number;
  priceEur: number;
  bonus?: string;
}

export const GOLD_PACKS: GoldPack[] = [
  { id: "pack_s", label: "Poignée d'Or", gold: 300, priceEur: 1.99 },
  { id: "pack_m", label: "Coffre d'Or", gold: 1000, priceEur: 4.99, bonus: "+10%" },
  { id: "pack_l", label: "Caisse d'Or", gold: 2500, priceEur: 9.99, bonus: "+25%" },
  { id: "pack_xl", label: "Arsenal d'Or", gold: 6000, priceEur: 19.99, bonus: "+50%" },
];
