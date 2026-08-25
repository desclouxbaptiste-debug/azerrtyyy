import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strike Protocol — Jeu FPS",
  description:
    "FPS par vagues jouable dans le navigateur, sur PC comme sur mobile : armes variées, ennemis progressifs et boutique de déblocages.",
};

export default function GameLayout({ children }: LayoutProps<"/game">) {
  return children;
}
