import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import { Office } from "@/components/office/office";

const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Le Bureau de Claude",
  description: "Un bureau en pixel art pour regarder Claude et ses agents travailler, tâche par tâche.",
};

export default function BureauPage() {
  return (
    <div className={pixel.className}>
      <Office />
    </div>
  );
}
