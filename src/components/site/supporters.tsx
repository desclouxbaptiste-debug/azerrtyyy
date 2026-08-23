import Image from "next/image";

import { Button } from "@/components/ui/button";

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=900&q=80",
    alt: "Foule de supporters dans un stade",
  },
  {
    src: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80",
    alt: "Ballon de football sur la pelouse au coucher du soleil",
  },
  {
    src: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=900&q=80",
    alt: "Stade illuminé de nuit",
  },
];

export function Supporters() {
  return (
    <section id="supporters" className="bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
              L&apos;ambiance
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">
              Portés par nos supporters
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Du Kop of Boulogne aux Ultras Paris, chaque match est une
            démonstration de ferveur au service du club.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {GALLERY.map((img) => (
            <div
              key={img.src}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 640px) 33vw, 90vw"
                className="object-cover transition duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h3 className="text-2xl font-bold md:text-3xl">
            Ne manquez aucun match
          </h3>
          <p className="max-w-lg text-sm text-primary-foreground/80">
            Réservez vos places pour le Parc des Princes et vivez la
            prochaine victoire depuis les tribunes.
          </p>
          <Button
            size="lg"
            className="mt-2 bg-red-600 text-white hover:bg-red-700"
          >
            Voir la billetterie
          </Button>
        </div>
      </div>
    </section>
  );
}
