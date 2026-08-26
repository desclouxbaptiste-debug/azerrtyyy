"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { AuroraBackground } from "./aurora-background";
import { fadeUp, staggerContainer } from "./variants";

export function TwistCta() {
  return (
    <section id="cta" className="px-6 py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer(0.12)}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 px-8 py-16 text-center sm:px-16"
      >
        <AuroraBackground intensity="subtle" />

        <motion.h2
          variants={fadeUp}
          className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
        >
          Prêt à closer plus vite ?
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-pretty text-white/60">
          Rejoignez les équipes commerciales qui laissent Twist faire le travail difficile
          pendant qu&apos;elles signent.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#top"
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-3.5 text-sm font-bold text-[#1a0f00] transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Démarrer gratuitement
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
          <a
            href="mailto:hello@twist.app"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Parler à un expert
          </a>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-xs text-white/40">
          Aucune carte bancaire requise · Setup en 5 minutes
        </motion.p>
      </motion.div>
    </section>
  );
}
