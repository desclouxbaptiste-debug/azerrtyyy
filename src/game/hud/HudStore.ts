import type { WeaponId } from "../weapons-data";

export type GamePhase = "menu" | "playing" | "wave-intermission" | "dead" | "shop";

export interface HudState {
  phase: GamePhase;
  health: number;
  maxHealth: number;
  wave: number;
  enemiesRemaining: number;
  credits: number;
  gold: number;
  score: number;
  weaponId: WeaponId;
  ammoInMag: number;
  magSize: number;
  reloading: boolean;
  ads: boolean;
  hitMarker: number; // increments to trigger a flash
  damageFlash: number; // increments to trigger a red flash
  killFeed: { id: number; text: string }[];
  fps: number;
}

const initialState: HudState = {
  phase: "menu",
  health: 100,
  maxHealth: 100,
  wave: 0,
  enemiesRemaining: 0,
  credits: 0,
  gold: 0,
  score: 0,
  weaponId: "pistol",
  ammoInMag: 0,
  magSize: 0,
  reloading: false,
  ads: false,
  hitMarker: 0,
  damageFlash: 0,
  killFeed: [],
  fps: 0,
};

type Listener = () => void;

/** Minimal external store so the Three.js loop can push frequent updates
 * without triggering a React re-render unless a field actually changed. */
export class HudStore {
  private state: HudState = { ...initialState };
  private listeners = new Set<Listener>();

  getSnapshot = (): HudState => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  set(partial: Partial<HudState>) {
    let changed = false;
    for (const key in partial) {
      if (this.state[key as keyof HudState] !== partial[key as keyof HudState]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener();
  }

  pushKill(text: string) {
    const entry = { id: Date.now() + Math.random(), text };
    const killFeed = [...this.state.killFeed.slice(-3), entry];
    this.set({ killFeed });
  }

  reset() {
    this.state = { ...initialState };
    for (const listener of this.listeners) listener();
  }
}
