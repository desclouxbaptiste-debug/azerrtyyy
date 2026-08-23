import { Trophy } from "lucide-react";

const HONOURS = [
  { label: "Ligue 1", value: "13" },
  { label: "Coupe de France", value: "15" },
  { label: "Coupe de la Ligue", value: "9" },
  { label: "Trophée des Champions", value: "13" },
  { label: "Ligue des Champions", value: "1" },
  { label: "Fondation", value: "1970" },
];

export function Honours() {
  return (
    <section id="palmares" className="bg-[#050914] py-24 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 flex flex-col items-start gap-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-red-400">
            <Trophy size={14} />
            Palmarès
          </span>
          <h2 className="text-3xl font-extrabold md:text-5xl">
            Un club taillé pour l&apos;histoire
          </h2>
          <p className="max-w-2xl text-sm text-white/60 md:text-base">
            Sacré champion d&apos;Europe pour la première fois de son
            histoire en 2025, le PSG confirme sa place parmi les plus grands
            clubs du monde.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {HONOURS.map((item) => (
            <div
              key={item.label}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center transition hover:border-red-500/50 hover:bg-white/[0.06]"
            >
              <div className="text-3xl font-black text-white md:text-4xl">
                {item.value}
              </div>
              <div className="mt-2 text-xs uppercase tracking-wide text-white/50">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
