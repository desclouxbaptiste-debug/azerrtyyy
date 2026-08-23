import { HeroFuturistic } from "@/components/ui/hero-futuristic";
import { Navbar } from "@/components/site/navbar";
import { ClubIntro } from "@/components/site/club-intro";
import { Honours } from "@/components/site/honours";
import { Stadium } from "@/components/site/stadium";
import { Supporters } from "@/components/site/supporters";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <div id="top">
      <Navbar />

      <HeroFuturistic
        eyebrow="Ligue 1 · Paris"
        title="Ici c'est Paris"
        subtitle="Le Paris Saint-Germain, club le plus titré de France, écrit son histoire au Parc des Princes."
        ctaLabel="Découvrir le club"
      />

      <main>
        <ClubIntro />
        <Honours />
        <Stadium />
        <Supporters />
      </main>

      <Footer />
    </div>
  );
}
