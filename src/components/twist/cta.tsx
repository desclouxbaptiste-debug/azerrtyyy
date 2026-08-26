"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { clipReveal, drawLine, fadeUp, staggerContainer } from "./variants";

export function TwistCta() {
  return (
    <section id="cta" className="px-6 py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer(0.12)}
        className="relative mx-auto max-w-5xl bg-[#111110] px-8 py-16 text-center text-[#F6F4EF] sm:px-16"
      >
        <motion.span
          variants={drawLine}
          className="absolute left-0 top-0 h-[3px] w-full origin-left bg-orange-700"
        />

        <h2 className="overflow-hidden text-balance font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          <motion.span variants={clipReveal} className="block">
            Prêt à closer plus vite ?
          </motion.span>
        </h2>
        <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-pretty text-[#F6F4EF]/60">
          Rejoignez les équipes commerciales qui laissent Twist faire le travail difficile
          pendant qu&apos;elles signent.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#top"
            className="group inline-flex cursor-pointer items-center gap-2 border border-orange-700 bg-orange-700 px-7 py-3.5 text-sm font-semibold text-[#F6F4EF] transition-colors duration-200 hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
          >
            Démarrer gratuitement
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
          <a
            href="mailto:hello@twist.app"
            className="inline-flex cursor-pointer items-center gap-2 border border-[#F6F4EF]/20 px-7 py-3.5 text-sm font-semibold text-[#F6F4EF] transition-colors duration-200 hover:border-[#F6F4EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F6F4EF]"
          >
            Parler à un expert
          </a>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-widest text-[#F6F4EF]/40">
          Aucune carte bancaire requise · Setup en 5 minutes
        </motion.p>
      </motion.div>
    </section>
  );
}
