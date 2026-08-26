"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { clipReveal, drawLine, fadeUp, staggerContainer } from "./variants";

const features = [
  {
    index: "01",
    title: "Détection des signaux d'achat",
    description:
      "Twist repère en temps réel les intentions d'achat cachées dans chaque échange et alerte vos commerciaux au bon moment.",
  },
  {
    index: "02",
    title: "Objections neutralisées à l'instant",
    description:
      "Une bibliothèque de réponses générée à partir de vos meilleurs deals, suggérée en direct pendant l'appel.",
  },
  {
    index: "03",
    title: "Pipeline piloté par la donnée",
    description:
      "Prévisions de closing fiables à 92 %, priorisation automatique des deals chauds, reporting sans effort.",
  },
];

export function TwistFeatures() {
  return (
    <section id="features" className="relative px-6 py-28">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.1)}
          className="max-w-2xl"
        >
          <motion.span
            variants={fadeUp}
            className="font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-[0.25em] text-orange-700"
          >
            Pourquoi Twist
          </motion.span>
          <h2 className="mt-4 overflow-hidden text-balance font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[#111110] sm:text-4xl">
            <motion.span variants={clipReveal} className="block">
              Tout ce qu&apos;il faut pour closer plus vite
            </motion.span>
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.15)}
          className="mt-16 border-t border-[#111110]/10"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.index}
              variants={fadeUp}
              className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-6 border-b border-[#111110]/10 py-10 sm:grid-cols-[4rem_1fr_auto] sm:items-center sm:gap-10"
            >
              <span className="font-[family-name:var(--font-mono-ui)] text-sm text-[#111110]/40">{feature.index}</span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#111110] sm:text-2xl">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#111110]/60 sm:text-base">
                  {feature.description}
                </p>
              </div>
              <ArrowUpRight className="hidden size-6 shrink-0 text-[#111110]/30 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-orange-700 sm:block" />
              <motion.span
                variants={drawLine}
                className="absolute bottom-0 left-0 h-px w-full origin-left bg-orange-700"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
