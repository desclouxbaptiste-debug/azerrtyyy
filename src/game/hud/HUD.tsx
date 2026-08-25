"use client";

import { useSyncExternalStore } from "react";
import type { HudStore } from "./HudStore";
import { WEAPONS } from "../weapons-data";

export function HUD({ store }: { store: HudStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  if (state.phase !== "playing" && state.phase !== "wave-intermission") return null;

  const weapon = WEAPONS[state.weaponId];
  const healthPct = Math.max(0, Math.min(100, (state.health / state.maxHealth) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none font-mono text-white">
      {state.damageFlash > 0 && (
        <div
          key={state.damageFlash}
          className="dmg-flash absolute inset-0 bg-red-600/25"
          style={{ boxShadow: "inset 0 0 140px 40px rgba(220,20,20,0.55)" }}
        />
      )}

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-1 w-1 rounded-full bg-white/90" />
        {state.hitMarker > 0 && (
          <div
            key={state.hitMarker}
            className="hit-pulse absolute left-1/2 top-1/2 h-3 w-3 rounded-full border-2 border-amber-300"
          />
        )}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform ${state.ads ? "scale-0" : "scale-100"}`}
        >
          <div className="relative h-8 w-8">
            <span className="absolute left-1/2 top-0 h-2.5 w-[2px] -translate-x-1/2 bg-white/80" />
            <span className="absolute left-1/2 bottom-0 h-2.5 w-[2px] -translate-x-1/2 bg-white/80" />
            <span className="absolute top-1/2 left-0 h-[2px] w-2.5 -translate-y-1/2 bg-white/80" />
            <span className="absolute top-1/2 right-0 h-[2px] w-2.5 -translate-y-1/2 bg-white/80" />
          </div>
        </div>
      </div>

      {/* Wave / enemies remaining */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <div className="text-xs tracking-[0.3em] text-white/60">VAGUE</div>
        <div className="text-2xl font-bold tabular-nums">{state.wave}</div>
        <div className="text-xs text-white/50">{state.enemiesRemaining} restants</div>
      </div>

      {state.phase === "wave-intermission" && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-4 py-2 text-sm tracking-widest text-amber-300 backdrop-blur">
          VAGUE {state.wave} ÉLIMINÉE — PROCHAINE VAGUE IMMINENTE
        </div>
      )}

      {/* Currency */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 text-sm">
        <div className="rounded bg-black/40 px-2 py-1 backdrop-blur">
          <span className="text-emerald-300">{Math.floor(state.credits)}</span>{" "}
          <span className="text-white/50">crédits</span>
        </div>
        <div className="rounded bg-black/40 px-2 py-1 backdrop-blur">
          <span className="text-amber-300">{Math.floor(state.gold)}</span>{" "}
          <span className="text-white/50">or</span>
        </div>
        {state.fps > 0 && <div className="text-[10px] text-white/30">{state.fps} fps</div>}
      </div>

      {/* Kill feed */}
      <div className="absolute top-32 right-4 flex flex-col items-end gap-1">
        {state.killFeed.map((k) => (
          <div key={k.id} className="rounded bg-black/40 px-2 py-0.5 text-xs text-white/70">
            {k.text}
          </div>
        ))}
      </div>

      {/* Bottom-left: health */}
      <div className="absolute bottom-6 left-6 w-52">
        <div className="mb-1 text-xs tracking-widest text-white/60">
          PV {Math.round(state.health)}/{state.maxHealth}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${healthPct > 50 ? "bg-emerald-400" : healthPct > 25 ? "bg-amber-400" : "bg-red-500"}`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
      </div>

      {/* Bottom-right: weapon + ammo */}
      <div className="absolute bottom-6 right-6 text-right">
        <div
          className="text-sm font-semibold"
          style={{ color: `#${weapon.color.toString(16).padStart(6, "0")}` }}
        >
          {weapon.name}
        </div>
        <div className="text-3xl font-bold tabular-nums">
          {state.reloading ? (
            <span className="text-amber-300 text-lg">RECHARGEMENT…</span>
          ) : (
            <>
              {state.ammoInMag}
              <span className="text-base text-white/40"> / {state.magSize}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
