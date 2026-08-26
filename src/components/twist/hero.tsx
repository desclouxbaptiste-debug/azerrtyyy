"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";

import { AuroraBackground } from "./aurora-background";
import { fadeUp, staggerContainer } from "./variants";

const stats = [
  { value: "+34%", label: "taux de closing" },
  { value: "-2 jours", label: "cycle de vente moyen" },
  { value: "12 400+", label: "appels analysés / semaine" },
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
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-md"
        >
          <Sparkles className="size-3.5 text-fuchsia-400" />
          Twist — Sales Closing OS
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Closez plus vite.
          <br />
          Closez{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
            plus juste.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-2xl text-pretty text-base text-white/60 sm:text-lg"
        >
          Twist analyse chaque appel, détecte les signaux d&apos;achat et neutralise les
          objections en temps réel — pour donner à vos commerciaux le mot juste qui fait
          signer.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#cta"
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-3.5 text-sm font-bold text-[#1a0f00] transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Démarrer gratuitement
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
          <a
            href="#features"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <PlayCircle className="size-4" />
            Voir Twist en action
          </a>
        </motion.div>

        <motion.dl
          variants={fadeUp}
          className="mt-16 grid grid-cols-1 gap-8 border-t border-white/10 pt-10 sm:grid-cols-3 sm:gap-12"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-2xl font-extrabold text-white sm:text-3xl">{stat.value}</dd>
              <span className="mt-1 text-xs text-white/50 sm:text-sm">{stat.label}</span>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
