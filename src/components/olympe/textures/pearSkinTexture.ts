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

export type PearTextureSet = {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
};

/** Procedural pear-skin texture: green→gold body gradient, blush patches, speckling. */
export function createPearSkinTextures(seed = 3, size = 1024): PearTextureSet {
  const rng = mulberry32(seed);

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cctx = colorCanvas.getContext("2d")!;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext("2d")!;

  // v=0 is the base (blossom end), v=1 the stem end — LatheGeometry maps v bottom→top.
  // A golden Bartlett-pear base: warm yellow throughout, deepening slightly at the base.
  const base = cctx.createLinearGradient(0, size, 0, 0);
  base.addColorStop(0, "#d9a83a");
  base.addColorStop(0.3, "#e8bc44");
  base.addColorStop(0.65, "#f0cb58");
  base.addColorStop(1, "#e6bd4e");
  cctx.fillStyle = base;
  cctx.fillRect(0, 0, size, size);

  // faint warm blush, subtle rather than the dominant feature
  for (let i = 0; i < 3; i++) {
    const x = rng() * size;
    const y = size * (0.15 + rng() * 0.5);
    const r = size * (0.1 + rng() * 0.1);
    const blush = cctx.createRadialGradient(x, y, 0, x, y, r);
    blush.addColorStop(0, "rgba(214,120,45,0.16)");
    blush.addColorStop(1, "rgba(214,120,45,0)");
    cctx.fillStyle = blush;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();
  }

  // dense russet speckling, concentrated toward the base like the reference photo
  rctx.fillStyle = "#8f8f8f";
  rctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const x = rng() * size;
    // v=0 (base) is at the bottom of the canvas per the gradient above.
    const v = rng();
    const density = 0.25 + 0.75 * (1 - v) ** 1.4;
    if (rng() > density) continue;
    const y = v * size;
    const r = 0.7 + rng() * 2.1;
    cctx.fillStyle = `rgba(150,80,30,${0.16 + rng() * 0.24})`;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();

    rctx.fillStyle = `rgba(60,60,60,${0.12 + rng() * 0.22})`;
    rctx.beginPath();
    rctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
    rctx.fill();
  }

  // fine vertical striping typical of pear skin
  for (let i = 0; i < 140; i++) {
    const x = rng() * size;
    const h = size * (0.1 + rng() * 0.3);
    const y = rng() * (size - h);
    cctx.strokeStyle = `rgba(255,255,255,${0.03 + rng() * 0.05})`;
    cctx.lineWidth = 1;
    cctx.beginPath();
    cctx.moveTo(x, y);
    cctx.lineTo(x + (rng() - 0.5) * 6, y + h);
    cctx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;

  return { map, roughnessMap };
}
