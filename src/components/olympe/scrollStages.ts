/** Global scroll progress (0→1) is split into four equal storytelling stages. */
export const STAGES = {
  origin: [0, 0.25] as const,
  metamorphosis: [0.25, 0.5] as const,
  glory: [0.5, 0.75] as const,
  nectar: [0.75, 1] as const,
};

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** Local progress (0→1) within [a, b], clamped outside the range. */
export function localT(progress: number, [a, b]: readonly [number, number]): number {
  return clamp01((progress - a) / (b - a));
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Opacity envelope: fades in over [inStart, inEnd], holds, fades out over [outStart, outEnd]. */
export function fadeWindow(
  progress: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
): number {
  const fadeIn = smoothstep((progress - inStart) / (inEnd - inStart));
  const fadeOut = 1 - smoothstep((progress - outStart) / (outEnd - outStart));
  return Math.min(fadeIn, fadeOut);
}
