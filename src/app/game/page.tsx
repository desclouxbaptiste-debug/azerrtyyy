"use client";

import dynamic from "next/dynamic";

const GameApp = dynamic(() => import("@/game/GameApp"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0c12] text-sm tracking-widest text-white/50">
      CHARGEMENT…
    </div>
  ),
});

export default function GamePage() {
  return <GameApp />;
}
