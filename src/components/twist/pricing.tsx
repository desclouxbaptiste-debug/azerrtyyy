"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";

import { fadeUp, staggerContainer } from "./variants";

type Cycle = "monthly" | "annual";

const tiers = [
  {
    name: "Starter",
    description: "Pour les indépendants et petites équipes.",
    price: { monthly: 49, annual: 39 },
    cta: "Démarrer gratuitement",
    popular: false,
    features: [
      "Jusqu'à 3 utilisateurs",
      "200 appels analysés / mois",
      "Bibliothèque d'objections basique",
      "Support par email",
    ],
  },
  {
    name: "Pro",
    description: "Pour les équipes commerciales en croissance.",
    price: { monthly: 129, annual: 99 },
    cta: "Choisir Pro",
    popular: true,
    features: [
      "Jusqu'à 20 utilisateurs",
      "Analyse d'appels illimitée",
      "Assistant objections en temps réel",
      "Prévisions de pipeline",
      "Intégrations CRM & Slack",
      "Support prioritaire",
    ],
  },
  {
    name: "Enterprise",
    description: "Pour les organisations à grande échelle.",
    price: { monthly: null, annual: null },
    cta: "Nous contacter",
    popular: false,
    features: [
      "Utilisateurs illimités",
      "Intégrations sur-mesure",
      "SSO / SAML",
      "SLA 99,9 %",
      "Customer Success Manager dédié",
      "Onboarding sur-mesure",
    ],
  },
];

export function TwistPricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <section id="pricing" className="relative px-6 py-28">
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
            Tarifs
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            Un prix simple. Un ROI immédiat.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-pretty text-white/60">
            Sans engagement. Changez de formule à tout moment.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-8 inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1"
          >
            {(["monthly", "annual"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`relative cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 ${
                  cycle === option ? "text-[#07070d]" : "text-white/70 hover:text-white"
                }`}
              >
                {cycle === option && (
                  <motion.span
                    layoutId="pricing-toggle-pill"
                    className="absolute inset-0 rounded-full bg-white"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  {option === "monthly" ? "Mensuel" : "Annuel"}
                  {option === "annual" && (
                    <span className="ml-1.5 text-emerald-500">-20%</span>
                  )}
                </span>
              </button>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.12)}
          className="mt-16 grid items-start gap-6 md:grid-cols-3"
        >
          {tiers.map((tier) => {
            const price = tier.price[cycle];

            return (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={
                  tier.popular
                    ? "rounded-2xl bg-gradient-to-b from-indigo-500 via-fuchsia-500 to-amber-400 p-[1px] shadow-[0_0_50px_rgba(168,85,247,0.35)] md:-translate-y-4"
                    : ""
                }
              >
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-8 backdrop-blur-xl ${
                    tier.popular
                      ? "border-transparent bg-[#0a0a12]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 px-3 py-1 text-xs font-bold text-white">
                      Le plus choisi
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                  <p className="mt-2 text-sm text-white/60">{tier.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      {price !== null ? (
                        <motion.span
                          key={`${tier.name}-${cycle}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          className="text-4xl font-extrabold text-white"
                        >
                          {price}€
                        </motion.span>
                      ) : (
                        <motion.span
                          key={`${tier.name}-custom`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          className="text-4xl font-extrabold text-white"
                        >
                          Sur devis
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {price !== null && <span className="text-sm text-white/50">/ mois</span>}
                  </div>

                  <a
                    href="#cta"
                    className={`mt-8 inline-flex cursor-pointer items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      tier.popular
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-[#1a0f00] focus-visible:outline-amber-300"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-white"
                    }`}
                  >
                    {tier.cta}
                  </a>

                  <ul className="mt-8 flex flex-1 flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
