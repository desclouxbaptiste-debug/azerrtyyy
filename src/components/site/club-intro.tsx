import Image from "next/image";
import { ShieldCheck, Sparkles, Users2 } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Un club historique",
    desc: "Fondé en 1970, le PSG s'est imposé comme la référence du football français au fil des décennies.",
  },
  {
    icon: Sparkles,
    title: "Champion d'Europe",
    desc: "Sacré vainqueur de la Ligue des Champions en 2025, le club a franchi un cap historique.",
  },
  {
    icon: Users2,
    title: "Une formation d'exception",
    desc: "Le centre de formation du Camp des Loges révèle chaque saison de nouveaux talents.",
  },
];

export function ClubIntro() {
  return (
    <section id="club" className="bg-background py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            Le Club
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">
            Plus qu&apos;un club, une identité
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Depuis sa création, le Paris Saint-Germain porte les couleurs de
            la capitale sur toutes les scènes du football européen. Entre
            exigence sportive, ambition internationale et attachement au
            Parc des Princes, le club a bâti une identité reconnaissable
            entre toutes : le bleu, le rouge, et l&apos;esprit de Paris.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-1">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl">
          <Image
            src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80"
            alt="Ballon de football sur la pelouse"
            fill
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050914]/70 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
