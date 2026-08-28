"use client";

import dynamic from "next/dynamic";
import type { Flavor } from "./flavors";

const CanCanvas = dynamic(() => import("./CanCanvas"), { ssr: false });

export function Hero({ flavor }: { flavor: Flavor }) {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-16 lg:flex-row lg:pt-24"
    >
      <div className="relative z-10 max-w-xl text-center lg:text-left">
        <span className="inline-block rounded-full bg-white/60 px-4 py-1 text-sm font-bold tracking-wide text-[#2F2521]/70 backdrop-blur">
          100% naturel · vivant · pétillant
        </span>
        <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] text-[#2F2521] sm:text-6xl lg:text-7xl">
          Le kombucha qui
          <span className="block bg-gradient-to-r from-[var(--flavor-from)] to-[var(--flavor-to)] bg-clip-text text-transparent">
            pétille de vie
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-[#2F2521]/70 lg:mx-0">
          Thé fermenté artisanalement, gorgé de bulles naturelles et de saveurs
          qui claquent. Zéro triche, que du vivant.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
          <a
            href="#saveurs"
            className="rounded-full bg-[#2F2521] px-8 py-4 font-extrabold text-[#FCF6EC] transition-transform hover:scale-105 active:scale-95"
          >
            Choisir ma saveur
          </a>
          <a
            href="#fabrication"
            className="rounded-full border-2 border-[#2F2521]/20 px-8 py-4 font-bold text-[#2F2521] transition-colors hover:border-[#2F2521]/50"
          >
            Comment on le fait
          </a>
        </div>
      </div>

      <div className="relative z-10 mt-12 h-[380px] w-full max-w-md lg:mt-0 lg:h-[560px] lg:max-w-lg">
        <div className="droplet droplet-1" />
        <div className="droplet droplet-2" />
        <div className="droplet droplet-3" />
        <CanCanvas flavor={flavor} />
      </div>

      <a
        href="#saveurs"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2F2521]/60"
      >
        Explorer
        <span className="explore-arrow flex h-6 w-6 items-center justify-center rounded-full border border-[#2F2521]/30">
          ↓
        </span>
      </a>
    </section>
  );
}
