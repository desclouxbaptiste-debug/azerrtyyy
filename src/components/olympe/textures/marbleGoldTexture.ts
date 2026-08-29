import * as THREE from "three";

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A single vein: a mostly-straight fracture line with a gentle wobble that
 * eases to zero at both ends, rather than a fully random walk (which reads
 * as a childish scribble instead of stone veining).
 */
function drawVein(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  strokeStyle: string,
  lineWidth: number,
  alpha: number,
) {
  const angle = rng() * Math.PI * 2;
  const length = w * (0.35 + rng() * 0.55);
  const startX = rng() * w;
  const startY = rng() * h;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const perpX = -dy;
  const perpY = dx;
  const wobbleAmp = w * (0.01 + rng() * 0.02);
  const wobbleFreq = 1 + rng() * 2;
  const segments = 18;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const envelope = Math.sin(t * Math.PI);
    const wobble = Math.sin(t * Math.PI * wobbleFreq) * wobbleAmp * envelope;
    const x = startX + dx * length * t + perpX * wobble;
    const y = startY + dy * length * t + perpY * wobble;
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export type StatueTextureSet = {
  map: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
};

/** Procedural marble-with-gold-veins texture set, no external image assets. */
export function createStatueTextures(seed = 7, size = 1024): StatueTextureSet {
  const rng = mulberry32(seed);

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cctx = colorCanvas.getContext("2d")!;

  const metalCanvas = document.createElement("canvas");
  metalCanvas.width = size;
  metalCanvas.height = size;
  const mctx = metalCanvas.getContext("2d")!;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext("2d")!;

  const base = cctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#f4efe4");
  base.addColorStop(0.5, "#e9e1d0");
  base.addColorStop(1, "#ddd3bd");
  cctx.fillStyle = base;
  cctx.fillRect(0, 0, size, size);

  rctx.fillStyle = "#8a8a8a";
  rctx.fillRect(0, 0, size, size);

  mctx.fillStyle = "#000000";
  mctx.fillRect(0, 0, size, size);

  cctx.filter = "blur(3px)";
  for (let i = 0; i < 34; i++) {
    const tone = 190 + Math.floor(rng() * 40);
    drawVein(cctx, size, size, rng, `rgb(${tone - 30},${tone - 32},${tone - 36})`, 1.5 + rng() * 2.5, 0.14 + rng() * 0.1);
  }
  cctx.filter = "none";

  const goldStrokes = 9;
  for (let i = 0; i < goldStrokes; i++) {
    const w = 1.8 + rng() * 2.2;
    cctx.filter = "blur(1px)";
    drawVein(cctx, size, size, rng, "#d8ad3f", w, 0.5 + rng() * 0.3);
    cctx.filter = "none";

    mctx.filter = "blur(1px)";
    drawVein(mctx, size, size, rng, "#ffffff", w * 1.1, 0.9);
    mctx.filter = "none";

    rctx.filter = "blur(1px)";
    drawVein(rctx, size, size, rng, "#222222", w * 1.1, 0.9);
    rctx.filter = "none";
  }

  // fine speckle for a polished-stone micro-texture
  for (let i = 0; i < 900; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = rng() * 1.2;
    cctx.fillStyle = rng() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(90,80,60,0.08)";
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;

  const metalnessMap = new THREE.CanvasTexture(metalCanvas);
  metalnessMap.wrapS = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;

  return { map, metalnessMap, roughnessMap };
}
