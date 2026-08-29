import * as THREE from "three";

/**
 * Silhouette of the pear (radius, height) traced bottom → top, revolved
 * into a LatheGeometry. Tuned against a reference photo for the
 * characteristic wide, rounded base, pronounced shoulder, and short neck
 * (a plain teardrop reads as an onion, not a pear — the shoulder is the tell).
 */
const PROFILE_POINTS: [number, number][] = [
  [0, 0],
  [0.18, 0.03],
  [0.3, 0.09],
  [0.38, 0.18],
  [0.415, 0.28],
  [0.42, 0.36],
  [0.4, 0.45],
  [0.36, 0.53],
  [0.3, 0.62],
  [0.23, 0.7],
  [0.17, 0.79],
  [0.135, 0.87],
  [0.115, 0.95],
  [0.1, 1.02],
  [0.088, 1.08],
  [0.075, 1.14],
  [0, 1.2],
];

export function buildPearGeometry(radialSegments = 96): THREE.LatheGeometry {
  const points = PROFILE_POINTS.map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(points, radialSegments);
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

export const PEAR_HEIGHT = PROFILE_POINTS[PROFILE_POINTS.length - 1][1];
export const PEAR_CENTER_Y = PEAR_HEIGHT / 2;

/** Interpolated pear radius at a given height fraction (0 = base, 1 = stem end). */
export function pearRadiusAt(heightFrac: number): number {
  const y = THREE.MathUtils.clamp(heightFrac, 0, 1) * PEAR_HEIGHT;
  for (let i = 0; i < PROFILE_POINTS.length - 1; i++) {
    const [x0, y0] = PROFILE_POINTS[i];
    const [x1, y1] = PROFILE_POINTS[i + 1];
    if (y >= y0 && y <= y1) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      return THREE.MathUtils.lerp(x0, x1, t);
    }
  }
  return 0;
}
