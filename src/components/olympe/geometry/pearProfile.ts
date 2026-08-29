import * as THREE from "three";

/**
 * Silhouette of the pear (radius, height) traced bottom → top, revolved
 * into a LatheGeometry. Values tuned by eye for a classic Anjou-pear profile.
 */
const PROFILE_POINTS: [number, number][] = [
  [0, 0],
  [0.32, 0.02],
  [0.5, 0.08],
  [0.6, 0.18],
  [0.63, 0.3],
  [0.6, 0.45],
  [0.52, 0.62],
  [0.42, 0.76],
  [0.32, 0.87],
  [0.24, 0.95],
  [0.17, 1.02],
  [0.12, 1.09],
  [0.09, 1.16],
  [0.06, 1.22],
  [0, 1.27],
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
