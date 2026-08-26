"use client";

import { MotionConfig } from "framer-motion";

/**
 * Global Framer Motion config for the Twist page.
 * reducedMotion="user" auto-converts transform-based animations (x/y/scale)
 * to opacity fades for visitors with prefers-reduced-motion enabled.
 */
export function TwistMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  );
}
