"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";

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

    return { animate: { x: path, y: path.map((v) => v * 0.6) }, transition };
  };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className={`absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/40 blur-[110px] ${subtle ? "opacity-30" : "opacity-60"}`}
        {...loop(20, [-60, 60, -60])}
      />
      <motion.div
        className={`absolute right-[5%] top-[20%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/30 blur-[100px] ${subtle ? "opacity-25" : "opacity-50"}`}
        {...loop(24, [50, -40, 50])}
      />
      <motion.div
        className={`absolute left-[8%] bottom-[-5%] h-[26rem] w-[26rem] rounded-full bg-violet-600/30 blur-[100px] ${subtle ? "opacity-25" : "opacity-45"}`}
        {...loop(28, [-40, 50, -40])}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#07070d_75%)]" />
    </div>
  );
}
