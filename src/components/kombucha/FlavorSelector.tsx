"use client";

import { flavors, type Flavor } from "./flavors";

export function FlavorSelector({
  selected,
  onSelect,
}: {
  selected: Flavor;
  onSelect: (flavor: Flavor) => void;
}) {
  return (
    <section id="saveurs" className="relative z-10 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-4xl font-black text-[#2F2521] sm:text-5xl">
          8 saveurs, zéro ennui
        </h2>
        <p className="mt-4 text-lg text-[#2F2521]/70">
          Touche une vignette, regarde la canette (et le monde) changer de couleur.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
        {flavors.map((flavor) => {
          const active = flavor.id === selected.id;
          return (
            <button
              key={flavor.id}
              type="button"
              onClick={() => onSelect(flavor)}
              aria-pressed={active}
              className={`group relative flex flex-col items-center gap-2 rounded-3xl p-5 text-center transition-all duration-300 ${
                active
                  ? "scale-105 shadow-xl ring-4 ring-[#2F2521]/10"
                  : "hover:-translate-y-1 hover:shadow-lg"
              }`}
              style={{ background: `linear-gradient(160deg, ${flavor.from}, ${flavor.to})` }}
            >
              <span className="text-4xl drop-shadow" aria-hidden>
                {flavor.emoji}
              </span>
              <span className="text-sm font-extrabold text-white drop-shadow-sm">
                {flavor.name}
              </span>
              {active && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2F2521] text-xs text-[#FCF6EC]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
