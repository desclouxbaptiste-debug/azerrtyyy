import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { OlympeExperience } from "@/components/olympe/OlympeExperience";
import { NectarSection } from "@/components/olympe/NectarSection";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "La Poire des Dieux — Nectar de l'Olympe",
  description:
    "Une poire scellée dans le marbre et l'or s'éveille en fruit vivant sous le regard des Dieux. Une expérience scroll 3D signée Nectar de l'Olympe.",
};

export default function PoireOlympePage() {
  return (
    <div className={`${playfair.variable} bg-[#0b0a10]`}>
      <OlympeExperience fontClassName={playfair.variable} />
      <NectarSection />
    </div>
  );
}
