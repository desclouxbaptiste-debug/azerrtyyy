"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";

/**
 * Editorial hero backdrop: a fine hairline grid plus a single slow-moving
 * warm gradient wash — restrained on purpose, unlike a saturated aurora glow.
 */
export function AuroraBackground({
  intensity = "hero",
}: {
  intensity?: "hero" | "subtle";
}) {
  const prefersReducedMotion = useReducedMotion();
  const subtle = intensity === "subtle";

  const loop = (duration: number, path: number[]) => {
    if (prefersReducedMotion) return {};

    const transition: Transition = {
      duration,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    };

    return { animate: { x: path, y: path.map((v) => v * 0.4) }, transition };
  };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #11111008 1px, transparent 1px), linear-gradient(to bottom, #11111008 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <motion.div
        className={`absolute left-1/2 top-[-15%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-orange-600/[0.12] blur-[120px] ${subtle ? "opacity-60" : "opacity-100"}`}
        {...loop(26, [-50, 50, -50])}
      />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F6F4EF] to-transparent" />
    </div>
  );
}
