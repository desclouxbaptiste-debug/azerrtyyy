"use client";

export function DeathScreen({
  wave,
  kills,
  creditsEarned,
  onRetry,
  onMenu,
}: {
  wave: number;
  kills: number;
  creditsEarned: number;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 text-white backdrop-blur-sm">
      <p className="text-sm tracking-[0.5em] text-red-400">HORS DE COMBAT</p>
      <h2 className="mt-2 text-4xl font-black">Vague {wave}</h2>

      <div className="mt-6 flex gap-10 text-center text-sm text-white/70">
        <div>
          <div className="text-2xl font-bold text-white">{kills}</div>
          <div className="tracking-widest">ÉLIMINATIONS</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-300">+{creditsEarned}</div>
          <div className="tracking-widest">CRÉDITS GAGNÉS</div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-md bg-cyan-500 px-8 py-3 font-bold text-black transition hover:bg-cyan-400 active:scale-95"
        >
          REJOUER
        </button>
        <button
          onClick={onMenu}
          className="rounded-md border border-white/25 bg-white/5 px-8 py-3 font-semibold transition hover:bg-white/10 active:scale-95"
        >
          MENU
        </button>
      </div>
    </div>
  );
}
