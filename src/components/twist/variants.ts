import type { Variants } from "framer-motion";

const SWISS_EASE = [0.65, 0, 0.35, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: SWISS_EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: SWISS_EASE } },
};

/** Reveals content from behind a mask, sliding up — used for headlines and section titles. */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(100% 0 0 0)", y: "20%" },
  visible: {
    clipPath: "inset(0% 0 0 0)",
    y: "0%",
    transition: { duration: 0.7, ease: SWISS_EASE },
  },
};

/** A rule/underline that draws in from 0 to full width. */
export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.8, ease: SWISS_EASE } },
};

export const staggerContainer = (stagger = 0.1, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});
