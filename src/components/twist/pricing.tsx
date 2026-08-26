"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";

import { clipReveal, fadeUp, staggerContainer } from "./variants";

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
    <section id="pricing" className="relative border-t border-[#111110]/10 px-6 py-28">
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
            className="font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-[0.25em] text-orange-700"
          >
            Tarifs
          </motion.span>
          <h2 className="mt-4 overflow-hidden text-balance font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[#111110] sm:text-4xl">
            <motion.span variants={clipReveal} className="block">
              Un prix simple. Un ROI immédiat.
            </motion.span>
          </h2>
          <motion.p variants={fadeUp} className="mt-4 text-pretty text-[#111110]/60">
            Sans engagement. Changez de formule à tout moment.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mx-auto mt-8 inline-flex items-center border border-[#111110]/15 p-1"
          >
            {(["monthly", "annual"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`relative cursor-pointer px-5 py-2 font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-widest transition-colors duration-200 ${
                  cycle === option ? "text-[#F6F4EF]" : "text-[#111110]/60 hover:text-[#111110]"
                }`}
              >
                {cycle === option && (
                  <motion.span
                    layoutId="pricing-toggle-pill"
                    className="absolute inset-0 bg-[#111110]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  {option === "monthly" ? "Mensuel" : "Annuel"}
                  {option === "annual" && (
                    <span className="ml-1.5 text-orange-500">-20%</span>
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
          className="mt-16 grid items-stretch gap-px border border-[#111110]/15 bg-[#111110]/15 md:grid-cols-3"
        >
          {tiers.map((tier) => {
            const price = tier.price[cycle];

            return (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                className={`relative flex h-full flex-col p-8 ${
                  tier.popular ? "bg-[#111110] text-[#F6F4EF]" : "bg-[#F6F4EF] text-[#111110]"
                }`}
              >
                {tier.popular && (
                  <span className="absolute right-6 top-6 font-[family-name:var(--font-mono-ui)] text-[10px] uppercase tracking-widest text-orange-500">
                    Le plus choisi
                  </span>
                )}

                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">{tier.name}</h3>
                <p className={`mt-2 text-sm ${tier.popular ? "text-[#F6F4EF]/60" : "text-[#111110]/60"}`}>
                  {tier.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    {price !== null ? (
                      <motion.span
                        key={`${tier.name}-${cycle}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="font-[family-name:var(--font-mono-ui)] text-4xl font-bold"
                      >
                        {price}€
                      </motion.span>
                    ) : (
                      <motion.span
                        key={`${tier.name}-custom`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="font-[family-name:var(--font-display)] text-4xl font-bold italic"
                      >
                        Sur devis
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {price !== null && (
                    <span className={`text-sm ${tier.popular ? "text-[#F6F4EF]/50" : "text-[#111110]/50"}`}>
                      / mois
                    </span>
                  )}
                </div>

                <a
                  href="#cta"
                  className={`mt-8 inline-flex cursor-pointer items-center justify-center border px-6 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    tier.popular
                      ? "border-orange-700 bg-orange-700 text-[#F6F4EF] hover:bg-orange-600 focus-visible:outline-orange-500"
                      : "border-[#111110] text-[#111110] hover:bg-[#111110] hover:text-[#F6F4EF] focus-visible:outline-[#111110]"
                  }`}
                >
                  {tier.cta}
                </a>

                <ul className="mt-8 flex flex-1 flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${tier.popular ? "text-orange-500" : "text-orange-700"}`}
                      />
                      <span className={tier.popular ? "text-[#F6F4EF]/80" : "text-[#111110]/70"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
