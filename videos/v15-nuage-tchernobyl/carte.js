// Europe of 1986 drawn as vectors (simplified coasts, lon/lat), the cloud of Chernobyl as a mass of particles that
// travels with the dates, and the France of the weather maps. Every function draws into any 2D context (the frame,
// or the canvas of a television screen), so the same map is on the TV, full screen, and in the small radar inset.
export const ACC = "#C6F03A";            // the only accent: the radioactive yellow-green, kept for the cloud
const COS = Math.cos(50 * Math.PI / 180);

const EUROPE = [[-9.0, 43.0], [-9.4, 40.0], [-8.9, 37.0], [-6.0, 36.6], [-5.4, 36.0], [-2.2, 36.7], [-0.6, 38.0], [0.0, 39.5], [0.9, 41.0], [3.2, 42.0], [3.0, 43.2], [4.6, 43.4], [6.0, 43.1], [7.5, 43.8], [8.8, 44.4], [10.2, 43.9], [11.0, 42.4], [12.4, 41.6], [14.0, 40.8], [15.6, 40.1], [16.0, 38.0], [16.6, 38.9], [17.2, 39.4], [17.0, 40.4], [18.5, 40.1], [16.0, 41.6], [13.6, 43.6], [12.3, 44.6], [12.4, 45.4], [13.7, 45.6], [15.0, 44.5], [17.5, 43.0], [19.4, 41.8], [19.4, 40.4], [21.0, 38.3], [22.2, 36.5], [23.0, 37.9], [24.0, 38.2], [22.9, 40.6], [26.0, 40.8], [28.9, 41.1], [28.0, 42.0], [27.9, 43.2], [28.6, 44.2], [29.7, 45.2], [30.7, 46.5], [31.8, 46.4], [33.5, 46.0], [32.5, 45.4], [33.6, 44.5], [35.4, 45.0], [36.5, 45.3], [35.0, 46.2], [37.5, 47.1], [39.3, 47.2], [38.2, 46.4], [37.8, 44.7], [39.0, 44.2], [41.6, 41.6], [46, 41.5], [46, 68], [41.0, 67.0], [36.0, 66.5], [33.0, 69.4], [28.5, 71.0], [24, 71], [19, 70], [15, 68.5], [12.5, 66], [10, 64], [5.2, 62], [5.0, 60], [5.6, 58.9], [7.0, 58.0], [8.5, 58.3], [10.5, 59.4], [11.2, 58.4], [12.0, 57.4], [12.8, 56.3], [12.9, 55.4], [14.3, 55.6], [16.0, 56.2], [16.6, 57.6], [16.8, 59.0], [18.5, 59.4], [17.5, 61.0], [17.4, 62.4], [19.0, 63.6], [21.3, 64.6], [24.0, 65.8], [25.4, 65.0], [21.6, 63.0], [21.4, 61.0], [22.0, 60.2], [25.0, 60.2], [28.5, 60.5], [30.2, 59.9], [28.0, 59.5], [23.5, 59.3], [23.4, 58.3], [24.4, 57.2], [23.0, 57.0], [21.0, 56.8], [21.1, 55.7], [20.0, 54.9], [18.6, 54.4], [16.0, 54.3], [14.2, 53.9], [12.0, 54.2], [10.9, 54.4], [10.0, 54.8], [10.5, 56.5], [10.6, 57.7], [8.6, 57.1], [8.1, 56.0], [8.6, 55.0], [8.9, 54.0], [7.0, 53.6], [5.0, 53.3], [4.2, 52.0], [3.2, 51.3], [1.6, 51.0], [1.5, 50.2], [0.2, 49.6], [-1.3, 49.6], [-1.6, 48.6], [-3.0, 48.8], [-4.7, 48.4], [-4.2, 47.8], [-2.5, 47.3], [-1.2, 46.0], [-1.2, 44.6], [-1.5, 43.4], [-3.8, 43.4], [-6.0, 43.6], [-8.0, 43.7]];
const ILES = [
  [[-5.7, 50.1], [-3.0, 50.6], [0.0, 50.8], [1.4, 51.2], [1.7, 52.6], [0.3, 53.4], [-0.2, 54.2], [-1.5, 55.5], [-2.0, 56.0], [-1.8, 57.5], [-3.2, 58.6], [-5.0, 58.6], [-6.2, 57.5], [-5.6, 56.3], [-5.0, 55.0], [-3.2, 54.9], [-3.4, 54.0], [-3.0, 53.4], [-4.6, 53.3], [-4.2, 52.3], [-5.2, 51.7], [-3.2, 51.4]],
  [[-6.0, 52.2], [-6.2, 53.5], [-5.6, 54.6], [-7.3, 55.3], [-8.5, 54.3], [-10.0, 54.0], [-9.6, 53.0], [-10.2, 51.8], [-8.5, 51.6]],
  [[9.4, 43.0], [9.6, 42.2], [9.2, 41.4], [8.6, 41.9], [8.6, 42.6]],
  [[9.6, 41.2], [9.8, 40.0], [9.5, 39.1], [8.4, 38.9], [8.4, 40.5], [8.2, 40.9]],
  [[12.4, 38.1], [15.6, 38.3], [15.1, 36.7], [12.5, 37.6]],
  [[11.0, 55.4], [12.6, 55.6], [12.3, 56.1], [11.2, 55.8]],
  [[26.2, 40.0], [29.0, 41.2], [31.5, 41.3], [35.0, 42.0], [38.0, 41.0], [41.6, 41.6], [46, 41.4], [46, 33], [36, 33], [36, 36.8], [32, 36.2], [30, 36.3], [28, 36.8], [27.2, 37.9], [26.3, 38.6]],
  [[-11, 33], [-11, 35.0], [-6, 35.8], [-2, 35.1], [3, 36.8], [10, 37.3], [11, 36.8], [10.3, 35.0], [11, 33]],
];
// France: the Atlantic and Channel coasts, the Mediterranean, and the land border; EST is the eastern border alone
export const FRANCE = [[2.55, 51.09], [3.2, 50.7], [4.2, 49.95], [4.9, 49.8], [5.8, 49.5], [6.4, 49.45], [7.6, 49.05], [8.2, 49.0], [7.6, 47.6], [7.0, 47.4], [6.1, 46.6], [6.1, 46.15], [6.8, 46.0], [7.0, 45.2], [6.6, 44.4], [7.5, 43.8], [6.0, 43.1], [4.6, 43.4], [3.0, 43.2], [3.2, 42.45], [1.7, 42.5], [0.0, 42.7], [-1.8, 43.35], [-1.5, 44.3], [-1.2, 46.0], [-2.2, 47.1], [-4.7, 48.4], [-3.0, 48.8], [-1.6, 48.65], [-1.8, 49.7], [-1.2, 49.4], [0.2, 49.5], [1.5, 50.2], [1.6, 50.9]];
export const EST = FRANCE.slice(0, 16);
export const CORSE = ILES[2];
export const LIEUX = { tchernobyl: [30.1, 51.4], moscou: [37.6, 55.75], forsmark: [18.2, 60.4], village: [6.6, 48.6], paris: [2.35, 48.85], stop: [7.35, 48.3] };

/** A view: centre (lon, lat) and scale (pixels per degree of latitude) inside a rectangle. */
export function vue(x, y, w, h, lon, lat, k) {
  const p = ([a, b]) => [x + w / 2 + (a - lon) * COS * k, y + h / 2 - (b - lat) * k];
  return { x, y, w, h, k, p };
}
const trace = (c, V, pts, ferme = true) => { c.beginPath(); pts.forEach((q, i) => { const [a, b] = V.p(q); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); if (ferme) c.closePath(); };

/** Sea, land, France picked out, faint graticule. o.terre / o.france: fill colours; o.alpha. */
export function fondCarte(c, V, o = {}) {
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  c.beginPath(); c.rect(V.x, V.y, V.w, V.h); c.clip();
  c.fillStyle = o.mer || "#0A0D0C"; c.fillRect(V.x, V.y, V.w, V.h);
  c.strokeStyle = "rgba(160,180,160,.07)"; c.lineWidth = 1;
  for (let lo = -20; lo <= 50; lo += 5) { trace(c, V, [[lo, 30], [lo, 75]], false); c.stroke(); }
  for (let la = 30; la <= 75; la += 5) { trace(c, V, [[-20, la], [50, la]], false); c.stroke(); }
  c.fillStyle = o.terre || "#27302B"; c.strokeStyle = o.cote || "#55615A"; c.lineWidth = o.trait ?? 1.6; c.lineJoin = "round";
  for (const poly of [EUROPE, ...ILES]) { trace(c, V, poly); c.fill(); c.stroke(); }
  if (o.france !== false) {
    c.fillStyle = o.france || "#3A453E"; trace(c, V, FRANCE); c.fill(); trace(c, V, CORSE); c.fill();
    c.strokeStyle = o.bordFrance || "#B9BFB0"; c.lineWidth = (o.trait ?? 1.6) * 1.4; trace(c, V, FRANCE); c.stroke(); trace(c, V, CORSE); c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- the cloud: dates are days after 26 April 01:23
const BRANCHES = [
  [[0, 30.1, 51.4], [1, 26, 55], [2, 19, 60.2], [3, 16, 63], [5, 15, 65.5], [9, 18, 67]],
  [[0, 30.1, 51.4], [1.5, 23, 52.5], [2.5, 17, 51.5], [3.4, 12, 49.8], [4.2, 8.5, 48.7], [5.0, 5, 47.6], [6, 2, 46.5], [7, -1, 46], [9, -4, 47], [12, -8, 49]],
  [[0, 30.1, 51.4], [2, 24, 48], [3, 18, 46.5], [4, 13, 46], [5, 10, 44], [6, 9, 42], [7.5, 12, 40], [10, 16, 39]],
];
const N = 1700, PARTS = (() => {
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: N }, () => { const u = r(); return { b: u < 0.28 ? 0 : u < 0.75 ? 1 : 2, l: r() * r() * 1.6, a: r() * 6.283, ra: Math.sqrt(r()), w: (r() - 0.5) * 0.6, s: 0.6 + r() * 1.0, f: r() }; });
})();
function surBranche(br, age) {
  if (age <= br[0][0]) return [br[0][1], br[0][2]];
  for (let i = 1; i < br.length; i++) if (age <= br[i][0]) { const [a0, x0, y0] = br[i - 1], [a1, x1, y1] = br[i], k = (age - a0) / (a1 - a0); return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]; }
  const z = br[br.length - 1]; return [z[1], z[2]];
}
/** Positions [lon, lat, alpha, size] of the particles at date d (o.part: keep one in n; o.depart: drift away). */
export function nuage(d, o = {}) {
  const out = [], pas = o.part || 1;
  for (let i = 0; i < N; i += pas) {
    const q = PARTS[i], age = d - q.l;
    if (age < 0) continue;
    const [lo, la] = surBranche(BRANCHES[q.b], age), r = (0.35 + 0.5 * Math.min(age, 8)) * q.ra, an = q.a + q.w * age;
    let x = lo + r * Math.cos(an) / COS * 0.8, y = la + r * Math.sin(an) * 0.75;
    let a = Math.min(1, age / 0.35);
    if (d > 9) a *= Math.max(0.12, 1 - (d - 9) / 6);              // after ten days it thins out
    if (o.depart) { x += o.depart * (4 + 6 * q.f); y += o.depart * 1.5 * (q.f - 0.3); a *= 1 - Math.min(1, o.depart) * 0.85; }
    out.push([x, y, a, q.s]);
  }
  return out;
}
/** The particles drawn as soft yellow-green specks. o.taille: pixels; o.alpha; o.clip: a function that clips. */
export function dessinerNuage(c, V, d, o = {}) {
  const pts = nuage(d, o), k = o.taille ?? 6, base = o.alpha ?? 0.34;
  c.save(); c.beginPath(); c.rect(V.x, V.y, V.w, V.h); c.clip();
  if (o.clip) o.clip(c);
  c.fillStyle = ACC;
  for (const [lo, la, a, s] of pts) {
    const [x, y] = V.p([lo, la]);
    if (x < V.x - 20 || x > V.x + V.w + 20 || y < V.y - 20 || y > V.y + V.h + 20) continue;
    c.globalAlpha = base * a; c.beginPath(); c.arc(x, y, k * s, 0, 6.2832); c.fill();
  }
  c.restore();
}
/** Clip that keeps everything except France (the weather map's cloud that "stops" at the border). */
export function horsFrance(V) { return c => { c.beginPath(); c.rect(V.x, V.y, V.w, V.h); trace(c, V, FRANCE); c.clip("evenodd"); }; }

/** The fallout left in France: spots, denser in the east and in Corsica (an illustration, not a measured map). */
export const TACHES = (() => {
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  while (out.length < 260) {
    const lo = -4.5 + r() * 13, la = 41.4 + r() * 9.6, est = Math.min(1, Math.max(0, (lo - 1) / 6)), corse = lo > 8.5 && la < 43.1 ? 1 : 0;
    if (!dansFrance(lo, la)) continue;
    if (r() < 0.12 + 0.75 * est + 0.8 * corse) out.push([lo, la, 0.4 + r() * 0.9, r()]);
  }
  return out;
})();
function dedans(lo, la, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c; } return c; }
export function dansFrance(lo, la) { return dedans(lo, la, FRANCE) || dedans(lo, la, CORSE); }

/** A plain STOP sign (octagon, off-white, no colour of its own: the accent stays for the cloud). */
export function panneauStop(c, x, y, r, o = {}) {
  c.save(); c.globalAlpha *= o.alpha ?? 1; c.translate(x, y);
  if (o.pied !== false) { c.fillStyle = "#8C928A"; c.fillRect(-r * 0.07, r * 0.9, r * 0.14, r * 1.5); }
  const oct = s => { c.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; c.lineTo(Math.cos(a) * s, Math.sin(a) * s); } c.closePath(); };
  c.fillStyle = "#050506"; oct(r * 1.08); c.fill();
  c.fillStyle = o.fond || "#EDE7DA"; oct(r); c.fill();
  c.strokeStyle = "#050506"; c.lineWidth = r * 0.07; oct(r * 0.86); c.stroke();
  c.fillStyle = "#050506"; c.font = `${Math.round(r * 0.56)}px MontX`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("STOP", 0, r * 0.03);
  c.restore();
}
