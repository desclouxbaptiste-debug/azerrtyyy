import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tchiao Kombucha — Le kombucha qui pétille de vie",
  description:
    "Tchiao Kombucha : kombucha artisanal, naturel et pétillant en 8 saveurs. Une canette 3D à faire tourner, du thé récolté à la main, une fermentation vivante.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FCF6EC] text-[#2F2521]">{children}</body>
    </html>
  );
}
