"use client";

import { useState, type CSSProperties } from "react";
import { flavors, type Flavor } from "./flavors";
import { FlavorBackdrop } from "./FlavorBackdrop";
import { Hero } from "./Hero";
import { FlavorSelector } from "./FlavorSelector";
import { Fabrication } from "./Fabrication";
import { Footer } from "./Footer";

export function KombuchaLanding() {
  const [flavor, setFlavor] = useState<Flavor>(flavors[0]);

  const flavorVars = {
    "--flavor-from": flavor.from,
    "--flavor-to": flavor.to,
  } as CSSProperties;

  return (
    <div
      className="relative min-h-screen overflow-x-hidden transition-[--flavor-from,--flavor-to] duration-500 ease-out"
      style={flavorVars}
    >
      <FlavorBackdrop flavor={flavor} />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-display text-lg font-black text-[#2F2521]">🫧 Tchiao</span>
        <a
          href="#saveurs"
          className="rounded-full bg-[#2F2521]/90 px-5 py-2 text-sm font-bold text-[#FCF6EC] backdrop-blur transition-transform hover:scale-105"
        >
          Nos saveurs
        </a>
      </header>

      <Hero flavor={flavor} />
      <FlavorSelector selected={flavor} onSelect={setFlavor} />
      <Fabrication />
      <Footer />
    </div>
  );
}
