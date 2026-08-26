"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

import { AuroraBackground } from "./aurora-background";
import { clipReveal, fadeUp, staggerContainer } from "./variants";

const stats = [
  { value: "+34%", label: "Taux de closing" },
  { value: "−2j", label: "Cycle de vente moyen" },
  { value: "12 400+", label: "Appels analysés / semaine" },
];

export function TwistHero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[92svh] flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-20"
    >
      <AuroraBackground intensity="hero" />

      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <motion.span
          variants={fadeUp}
          className="mb-8 inline-flex items-center gap-2 font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-[0.25em] text-[#111110]/50"
        >
          <span className="size-1.5 bg-orange-700" />
          Twist — Sales Closing OS
        </motion.span>

        <h1 className="overflow-hidden text-balance font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight text-[#111110] sm:text-6xl lg:text-7xl">
          <motion.span variants={clipReveal} className="block">
            Closez plus vite.
          </motion.span>
          <motion.span variants={clipReveal} className="block italic text-orange-700">
            Closez plus juste.
          </motion.span>
        </h1>

        <motion.p
          variants={fadeUp}
          className="mt-8 max-w-2xl text-pretty text-base leading-relaxed text-[#111110]/60 sm:text-lg"
        >
          Twist analyse chaque appel, détecte les signaux d&apos;achat et neutralise les
          objections en temps réel — pour donner à vos commerciaux le mot juste qui fait
          signer.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#cta"
            className="group inline-flex cursor-pointer items-center gap-2 border border-[#111110] bg-[#111110] px-7 py-3.5 text-sm font-semibold text-[#F6F4EF] transition-colors duration-200 hover:bg-orange-700 hover:border-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111110]"
          >
            Démarrer gratuitement
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
          <a
            href="#features"
            className="inline-flex cursor-pointer items-center gap-2 border border-[#111110]/20 px-7 py-3.5 text-sm font-semibold text-[#111110] transition-colors duration-200 hover:border-[#111110] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111110]"
          >
            <PlayCircle className="size-4" />
            Voir Twist en action
          </a>
        </motion.div>

        <motion.dl
          variants={fadeUp}
          className="mt-16 grid w-full max-w-2xl grid-cols-1 divide-y divide-[#111110]/10 border-y border-[#111110]/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 py-6 sm:py-8">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-[family-name:var(--font-mono-ui)] text-2xl font-bold text-[#111110] sm:text-3xl">{stat.value}</dd>
              <span className="text-xs uppercase tracking-wide text-[#111110]/50">{stat.label}</span>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
