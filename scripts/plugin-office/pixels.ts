/**
 * Canvas logiciel pour dessiner le bureau hors navigateur (extension Claude
 * Code « bureau-agents ») : le sous-ensemble de CanvasRenderingContext2D
 * qu'utilise `src/components/office/scene.ts`, sur un tampon de pixels RVB,
 * puis deux sorties : SVG (bureau, appli mobile) et cellules de terminal.
 */

type Rgba = [number, number, number, number];

const colorCache = new Map<string, Rgba>();

function parseColor(c: string): Rgba {
  const hit = colorCache.get(c);
  if (hit) return hit;
  let out: Rgba = [0, 0, 0, 1];
  const s = c.trim();
  if (s[0] === "#") {
    const h = s.slice(1);
    const full = h.length === 3 || h.length === 4 ? [...h].map((x) => x + x).join("") : h;
    const n = parseInt(full.slice(0, 6), 16);
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    out = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  } else {
    const m = /^rgba?\(([^)]*)\)$/i.exec(s);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      out = [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
    }
  }
  colorCache.set(c, out);
  return out;
}

/** Tampon de pixels opaques (RVB). */
export class PixelCanvas {
  readonly data: Uint8ClampedArray;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 3);
  }
  clone() {
    const c = new PixelCanvas(this.width, this.height);
    c.data.set(this.data);
    return c;
  }
}

/** Dégradé radial à deux cercles, comme `createRadialGradient`. */
export class RadialGradient {
  readonly stops: { offset: number; color: Rgba }[] = [];
  constructor(
    readonly x0: number,
    readonly y0: number,
    readonly r0: number,
    readonly x1: number,
    readonly y1: number,
    readonly r1: number,
  ) {}
  addColorStop(offset: number, color: string) {
    this.stops.push({ offset, color: parseColor(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }
  /** Position 0..1 d'un point (approximation : distance au centre extérieur). */
  at(x: number, y: number): Rgba {
    const d = Math.hypot(x - this.x1, y - this.y1);
    const t = Math.min(1, Math.max(0, (d - this.r0) / (this.r1 - this.r0)));
    const s = this.stops;
    if (!s.length) return [0, 0, 0, 0];
    if (t <= s[0].offset) return s[0].color;
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i].offset) {
        const a = s[i - 1];
        const b = s[i];
        const k = (t - a.offset) / (b.offset - a.offset || 1);
        return [0, 1, 2, 3].map((j) => a.color[j] + (b.color[j] - a.color[j]) * k) as Rgba;
      }
    }
    return s[s.length - 1].color;
  }
}

/** Remplissage par dégradé gardé pour être rendu en vectoriel (SVG). */
export type GradientFill = { gradient: RadialGradient; x: number; y: number; w: number; h: number; alpha: number };

/**
 * Contexte 2D minimal. Avec `vectorGradients`, les dégradés ne sont pas
 * pixellisés mais notés dans `gradients` (un SVG les rend nativement).
 */
export class PixelCtx {
  globalAlpha = 1;
  imageSmoothingEnabled = false;
  fillStyle: string | RadialGradient = "#000000";
  readonly gradients: GradientFill[] = [];

  constructor(
    readonly canvas: PixelCanvas,
    private readonly vectorGradients = false,
  ) {}

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new RadialGradient(x0, y0, r0, x1, y1, r1);
  }

  drawImage(src: PixelCanvas, dx = 0, dy = 0) {
    const { width: W, height: H, data } = this.canvas;
    for (let y = 0; y < src.height; y++) {
      const ty = y + Math.round(dy);
      if (ty < 0 || ty >= H) continue;
      for (let x = 0; x < src.width; x++) {
        const tx = x + Math.round(dx);
        if (tx < 0 || tx >= W) continue;
        const s = (y * src.width + x) * 3;
        const d = (ty * W + tx) * 3;
        data[d] = src.data[s];
        data[d + 1] = src.data[s + 1];
        data[d + 2] = src.data[s + 2];
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number) {
    const style = this.fillStyle;
    if (style instanceof RadialGradient && this.vectorGradients) {
      this.gradients.push({ gradient: style, x, y, w, h, alpha: this.globalAlpha });
      return;
    }
    const { width: W, height: H, data } = this.canvas;
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w));
    const y1 = Math.min(H, Math.round(y + h));
    if (x1 <= x0 || y1 <= y0) return;
    const flat = typeof style === "string" ? parseColor(style) : undefined;
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const c = flat ?? (style as RadialGradient).at(px + 0.5, py + 0.5);
        const a = Math.min(1, Math.max(0, c[3] * this.globalAlpha));
        if (a <= 0) continue;
        const i = (py * W + px) * 3;
        data[i] = c[0] * a + data[i] * (1 - a);
        data[i + 1] = c[1] * a + data[i + 1] * (1 - a);
        data[i + 2] = c[2] * a + data[i + 2] * (1 - a);
      }
    }
  }
}

const hex = (r: number, g: number, b: number) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

/**
 * Le tampon en formes SVG, couche par couche : les couleurs les plus présentes
 * d'abord, en grands rectangles qui peuvent déborder sur les pixels des couleurs
 * peintes ensuite (elles les recouvriront), jamais sur celles déjà peintes.
 * Les plages identiques d'une ligne à l'autre fusionnent ; un `<path>` par couleur.
 */
export function toSvgShapes(c: PixelCanvas): string {
  const { width: W, height: H, data } = c;
  const n = W * H;
  const px = new Uint32Array(n);
  const count = new Map<number, number>();
  const box = new Map<number, [number, number, number, number]>();
  for (let k = 0; k < n; k++) {
    const color = (data[k * 3] << 16) | (data[k * 3 + 1] << 8) | data[k * 3 + 2];
    px[k] = color;
    count.set(color, (count.get(color) ?? 0) + 1);
    const x = k % W;
    const y = (k - x) / W;
    const b = box.get(color);
    if (!b) box.set(color, [x, y, x, y]);
    else {
      if (x < b[0]) b[0] = x;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
  }
  const order = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!);
  const rank = new Map(order.map((color, r) => [color, r]));
  const rankOf = new Int32Array(n);
  for (let k = 0; k < n; k++) rankOf[k] = rank.get(px[k])!;

  let out = "";
  order.forEach((color, r) => {
    const [bx0, by0, bx1, by1] = box.get(color)!;
    const parts: string[] = [];
    type Open = { x: number; w: number; y: number };
    let open = new Map<number, Open>();
    for (let y = by0; y <= by1 + 1; y++) {
      const next = new Map<number, Open>();
      if (y <= by1) {
        let x = bx0;
        while (x <= bx1) {
          // Plage où cette couleur peut peindre (elle-même ou une couleur peinte après).
          if (rankOf[y * W + x] < r) {
            x++;
            continue;
          }
          let first = -1;
          let last = -1;
          while (x < W && rankOf[y * W + x] >= r) {
            if (px[y * W + x] === color) {
              if (first < 0) first = x;
              last = x;
            }
            if (x >= bx1 && first >= 0) {
              x++;
              break;
            }
            x++;
          }
          if (first < 0) continue;
          const key = first * 4096 + (last - first + 1);
          next.set(key, open.get(key) ?? { x: first, w: last - first + 1, y });
        }
      }
      for (const [key, o] of open) if (!next.has(key)) parts.push(`M${o.x} ${o.y}h${o.w}v${y - o.y}h-${o.w}z`);
      open = next;
    }
    out += `<path fill="${hex((color >> 16) & 255, (color >> 8) & 255, color & 255)}" d="${parts.join("")}"/>`;
  });
  return out;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}

/**
 * Le tampon réduit à `columns` colonnes de terminal : chaque cellule est un
 * « ▀ » dont le haut (premier plan) et le bas (fond) sont deux pixels moyennés.
 */
export function toCells(c: PixelCanvas, columns: number): { cells: string; columns: number; rows: number } {
  const cols = Math.max(1, Math.min(512, Math.floor(columns)));
  const rows = Math.max(1, Math.min(256, Math.round((cols * c.height) / c.width / 2)));
  const sx = c.width / cols;
  const sy = c.height / (rows * 2);
  const sample = (cx: number, cy: number) => {
    const xa = Math.floor(cx * sx);
    const xb = Math.max(xa + 1, Math.floor((cx + 1) * sx));
    const ya = Math.floor(cy * sy);
    const yb = Math.max(ya + 1, Math.floor((cy + 1) * sy));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = ya; y < yb && y < c.height; y++)
      for (let x = xa; x < xb && x < c.width; x++) {
        const i = (y * c.width + x) * 3;
        r += c.data[i];
        g += c.data[i + 1];
        b += c.data[i + 2];
        n++;
      }
    return n ? ((Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)) >>> 0 : 0;
  };
  const bytes = new Uint8Array(cols * rows * 12);
  const view = new DataView(bytes.buffer);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const k = (row * cols + col) * 12;
      // Triplets u32 little-endian [caractère, premier plan, fond], comme l'attend Raster.
      view.setUint32(k, 0x2580, true);
      view.setUint32(k + 4, sample(col, row * 2), true);
      view.setUint32(k + 8, sample(col, row * 2 + 1), true);
    }
  return { cells: base64(bytes), columns: cols, rows };
}
