import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { TwistMotionProvider } from "@/components/twist/motion-provider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-twist",
});

export const metadata: Metadata = {
  title: "Twist — L'IA qui close vos deals",
  description:
    "Twist analyse vos appels commerciaux en temps réel, neutralise les objections et fait progresser vos deals plus vite.",
};

export default function TwistLayout({ children }: LayoutProps<"/twist">) {
  return (
    <div className={`${plusJakarta.variable} min-h-svh bg-[#07070d] font-[family-name:var(--font-twist)] text-white antialiased`}>
      <TwistMotionProvider>{children}</TwistMotionProvider>
    </div>
  );
}
