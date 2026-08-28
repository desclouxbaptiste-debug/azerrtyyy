"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Leaf, FlaskConical, Sparkles, PackageCheck } from "lucide-react";

const steps = [
  {
    icon: Leaf,
    title: "Récolte du thé",
    text: "Feuilles de thé vert et noir sélectionnées à la main chez des producteurs partenaires.",
  },
  {
    icon: FlaskConical,
    title: "Fermentation",
    text: "Le SCOBY transforme le thé sucré en kombucha vivant pendant 10 à 15 jours.",
  },
  {
    icon: Sparkles,
    title: "Infusion des saveurs",
    text: "Fruits et plantes fraîches infusés pour une explosion de goût 100% naturelle.",
  },
  {
    icon: PackageCheck,
    title: "Mise en canette",
    text: "Embouteillage à froid pour préserver les bulles et les probiotiques vivants.",
  },
];

export function Fabrication() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".fab-card", {
        opacity: 0,
        y: 60,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="fabrication"
      ref={sectionRef}
      className="relative z-10 px-6 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="font-display text-4xl font-black text-[#2F2521] sm:text-5xl">
          De la feuille à la bulle
        </h2>
        <p className="mt-4 text-lg text-[#2F2521]/70">
          Un savoir-faire artisanal, sans triche, à chaque étape.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="fab-card rounded-3xl bg-white/70 p-6 text-left shadow-sm backdrop-blur"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F2521] text-[#FCF6EC]">
              <step.icon size={22} />
            </div>
            <span className="mt-4 block text-xs font-bold uppercase tracking-wide text-[#2F2521]/40">
              Étape {i + 1}
            </span>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#2F2521]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-[#2F2521]/70">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
