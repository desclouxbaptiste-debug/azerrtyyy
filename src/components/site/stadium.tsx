import Image from "next/image";
import { CalendarClock, MapPin, Users } from "lucide-react";

const FACTS = [
  { icon: Users, label: "Capacité", value: "47 929 places" },
  { icon: MapPin, label: "Adresse", value: "24 Rue du Commandant Guilbaud, Paris 16e" },
  { icon: CalendarClock, label: "Inauguration", value: "1972" },
];

export function Stadium() {
  return (
    <section id="stade" className="relative overflow-hidden bg-[#050914] py-24 text-white">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1800&q=80"
          alt="Stade de football illuminé en soirée"
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050914] via-[#050914]/90 to-[#050914]/60" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-red-400">
          Le Stade
        </span>
        <h2 className="mt-3 max-w-xl text-3xl font-extrabold md:text-5xl">
          Parc des Princes
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70">
          Antre historique du PSG depuis 1974, le Parc des Princes vibre à
          chaque rencontre au rythme des supporters. Un écrin mythique niché
          au cœur de Paris, où se sont écrites certaines des plus grandes
          pages du club.
        </p>

        <dl className="mt-12 grid gap-6 sm:grid-cols-3">
          {FACTS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
            >
              <Icon size={20} className="text-red-400" />
              <dt className="mt-4 text-xs uppercase tracking-wide text-white/50">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
