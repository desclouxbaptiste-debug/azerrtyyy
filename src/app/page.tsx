import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Réservation en ligne",
    description:
      "Vos clients réservent un créneau en quelques clics, 24h/24, sur une page à votre nom.",
  },
  {
    title: "Rappels automatiques",
    description:
      "Un email de rappel part automatiquement avant chaque rendez-vous pour réduire les absences.",
  },
  {
    title: "Disponibilités sur mesure",
    description:
      "Définissez vos horaires, la durée de vos créneaux et un battement entre deux rendez-vous.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              R
            </span>
            Rendezo
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Essayer gratuitement</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            La prise de rendez-vous, sans les oublis.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Rendezo permet à votre activité de recevoir des réservations en ligne et d&apos;envoyer
            des rappels automatiques par email à vos clients.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Créer mon espace</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="py-6">
                  <h2 className="font-semibold">{feature.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Rendezo — mini SaaS de prise de rendez-vous et rappels.
      </footer>
    </div>
  );
}
