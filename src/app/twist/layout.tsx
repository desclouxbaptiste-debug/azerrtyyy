import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";

import { TwistMotionProvider } from "@/components/twist/motion-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-twist",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-ui",
});

export const metadata: Metadata = {
  title: "Twist — L'IA qui close vos deals",
  description:
    "Twist analyse vos appels commerciaux en temps réel, neutralise les objections et fait progresser vos deals plus vite.",
};

export default function TwistLayout({ children }: LayoutProps<"/twist">) {
  return (
    <div
      className={`${inter.variable} ${playfairDisplay.variable} ${jetBrainsMono.variable} min-h-svh bg-[#F6F4EF] font-[family-name:var(--font-twist)] text-[#111110] antialiased`}
    >
      <TwistMotionProvider>{children}</TwistMotionProvider>
    </div>
  );
}
