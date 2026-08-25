"use client";

import type { EconomyState } from "../economy";

export function MainMenu({
  economy,
  isTouch,
  onPlay,
  onShop,
}: {
  economy: EconomyState;
  isTouch: boolean;
  onPlay: () => void;
  onShop: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0c12] text-white">
      <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_20%,rgba(90,209,255,0.18),transparent_60%)]" />

      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div>
          <p className="text-xs tracking-[0.5em] text-cyan-300/70">TIR TACTIQUE PAR VAGUES</p>
          <h1 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">
            STRIKE <span className="text-cyan-400">PROTOCOL</span>
          </h1>
        </div>

        <div className="flex gap-8 text-sm text-white/70">
          <div>
            <div className="text-2xl font-bold text-white">{economy.bestWave}</div>
            <div className="tracking-widest">MEILLEURE VAGUE</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{economy.totalKills}</div>
            <div className="tracking-widest">ÉLIMINATIONS</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-300">{economy.credits}</div>
            <div className="tracking-widest">CRÉDITS</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onPlay}
            className="rounded-md bg-cyan-500 px-10 py-3 text-lg font-bold text-black shadow-[0_0_30px_rgba(90,209,255,0.5)] transition hover:bg-cyan-400 active:scale-95"
          >
            JOUER
          </button>
          <button
            onClick={onShop}
            className="rounded-md border border-white/25 bg-white/5 px-10 py-3 text-lg font-semibold transition hover:bg-white/10 active:scale-95"
          >
            BOUTIQUE
          </button>
        </div>

        <p className="max-w-md text-xs text-white/40">
          {isTouch
            ? "Joystick à gauche pour te déplacer, glisse à droite pour viser, boutons pour tirer/recharger."
            : "ZQSD/WASD pour te déplacer, souris pour viser, clic gauche pour tirer, clic droit pour viser, R pour recharger, molette pour changer d'arme."}
        </p>
      </div>
    </div>
  );
}
