"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { fadeWindow } from "./scrollStages";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

type OverlayRefs = {
  origin: HTMLDivElement | null;
  meta: HTMLDivElement | null;
  glory: HTMLDivElement | null;
  nectar: HTMLDivElement | null;
  progressBar: HTMLDivElement | null;
};

function applyFade(el: HTMLDivElement | null, opacity: number) {
  if (!el) return;
  el.style.opacity = String(opacity);
  el.style.transform = `translateY(${(1 - opacity) * 18}px)`;
  el.style.pointerEvents = opacity > 0.6 ? "auto" : "none";
}

export function OlympeExperience({ fontClassName }: { fontClassName: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const refs = useRef<OverlayRefs>({ origin: null, meta: null, glory: null, nectar: null, progressBar: null });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: wrapperRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        const p = self.progress;
        applyFade(refs.current.origin, fadeWindow(p, 0, 0.05, 0.18, 0.25));
        applyFade(refs.current.meta, fadeWindow(p, 0.26, 0.32, 0.44, 0.5));
        applyFade(refs.current.glory, fadeWindow(p, 0.51, 0.57, 0.69, 0.75));
        applyFade(refs.current.nectar, fadeWindow(p, 0.76, 0.85, 1.01, 1.02));
        if (refs.current.progressBar) refs.current.progressBar.style.transform = `scaleX(${p})`;
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`relative bg-[#0b0a10] text-[#f5eede] ${fontClassName}`}
      style={{ height: "420vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0b0a10]">
        <SceneCanvas progressRef={progressRef} />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            ref={(el) => {
              refs.current.origin = el;
            }}
            className="absolute inset-x-0 top-[14%] flex flex-col items-center text-center opacity-0"
          >
            <span className="text-xs font-medium tracking-[0.35em] text-[#e8c98a] uppercase">
              Une offrande de l&apos;Olympe
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-5xl font-black tracking-tight text-[#f5eede] sm:text-7xl">
              La Poire des Dieux
            </h1>
            <p className="mt-4 max-w-md px-6 text-sm text-[#cfc3ad] sm:text-base">
              Scellée dans le marbre et l&apos;or, elle attend l&apos;éveil.
            </p>
          </div>

          <div
            ref={(el) => {
              refs.current.meta = el;
            }}
            className="absolute inset-x-0 top-[16%] flex flex-col items-center text-center opacity-0"
          >
            <span className="text-xs font-medium tracking-[0.35em] text-[#e8c98a] uppercase">
              Chapitre II
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-4xl font-black tracking-tight text-[#f5eede] sm:text-6xl">
              La Métamorphose
            </h2>
            <p className="mt-4 max-w-md px-6 text-sm text-[#cfc3ad] sm:text-base">
              La pierre s&apos;attendrit, la rosée perle : le fruit s&apos;éveille à la vie.
            </p>
          </div>

          <div
            ref={(el) => {
              refs.current.glory = el;
            }}
            className="absolute inset-x-0 top-[14%] flex flex-col items-center text-center opacity-0"
          >
            <span className="text-xs font-medium tracking-[0.35em] text-[#e8c98a] uppercase">
              Chapitre III
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-4xl font-black tracking-tight text-[#f5eede] sm:text-6xl">
              L&apos;Éclat des Dieux
            </h2>
            <p className="mt-4 max-w-md px-6 text-sm text-[#cfc3ad] sm:text-base">
              Zeus insuffle sa foudre. La fraîcheur explose au grand jour.
            </p>
          </div>

          <div
            ref={(el) => {
              refs.current.nectar = el;
            }}
            className="absolute inset-x-0 bottom-[10%] flex flex-col items-center text-center opacity-0 sm:bottom-[14%] sm:right-[8%] sm:left-auto sm:items-end sm:text-right"
          >
            <span className="text-xs font-medium tracking-[0.35em] text-[#e8c98a] uppercase">
              Chapitre IV
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-4xl font-black tracking-tight text-[#f5eede] sm:text-5xl">
              Le Nectar Final
            </h2>
            <p className="mt-4 max-w-sm px-6 text-sm text-[#cfc3ad] sm:px-0 sm:text-base">
              Une gorgée, et l&apos;Olympe descend jusqu&apos;à vous.
            </p>
            <a
              href="#nectar-cta"
              className="pointer-events-auto mt-6 rounded-full bg-gradient-to-r from-[#e8c98a] to-[#c9962f] px-8 py-4 text-sm font-bold tracking-wide text-[#1a1408] shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-transform hover:scale-105 active:scale-95"
            >
              Goûter au Nectar
            </a>
          </div>
        </div>

        <div className="absolute top-0 right-0 left-0 z-20 h-[2px] bg-white/5">
          <div
            ref={(el) => {
              refs.current.progressBar = el;
            }}
            className="h-full w-full origin-left bg-gradient-to-r from-[#e8c98a] to-[#c9962f]"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
          <span className="text-[10px] font-medium tracking-[0.3em] text-[#e8c98a]/60 uppercase">
            Défile pour éveiller la poire
          </span>
        </div>
      </div>
    </div>
  );
}
