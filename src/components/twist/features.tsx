"use client";

import { motion } from "framer-motion";
import { BarChart3, MessageSquareText, TrendingUp } from "lucide-react";

import { fadeUp, staggerContainer } from "./variants";

const features = [
  {
    icon: TrendingUp,
    title: "Détection des signaux d'achat",
    description:
      "Twist repère en temps réel les intentions d'achat cachées dans chaque échange et alerte vos commerciaux au bon moment.",
  },
  {
    icon: MessageSquareText,
    title: "Objections neutralisées à l'instant",
    description:
      "Une bibliothèque de réponses générée à partir de vos meilleurs deals, suggérée en direct pendant l'appel.",
  },
  {
    icon: BarChart3,
    title: "Pipeline piloté par la donnée",
    description:
      "Prévisions de closing fiables à 92 %, priorisation automatique des deals chauds, reporting sans effort.",
  },
];

export function TwistFeatures() {
  return (
    <section id="features" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.1)}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            variants={fadeUp}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400"
          >
            Pourquoi Twist
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            Tout ce qu&apos;il faut pour closer plus vite
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-pretty text-white/60">
            Une seule plateforme pour écouter, comprendre et accélérer chaque conversation
            commerciale.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.12)}
          className="mt-16 grid gap-6 md:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl transition-colors duration-300 hover:border-white/20"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-[0_0_24px_rgba(129,86,240,0.45)]">
                <feature.icon className="size-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
