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
  const base = cctx.createLinearGradient(0, size, 0, 0);
  base.addColorStop(0, "#8fa832");
  base.addColorStop(0.35, "#c7b93a");
  base.addColorStop(0.7, "#dfc24a");
  base.addColorStop(1, "#8a9c3e");
  cctx.fillStyle = base;
  cctx.fillRect(0, 0, size, size);

  // warm sun-blush patches
  for (let i = 0; i < 5; i++) {
    const x = rng() * size;
    const y = size * (0.15 + rng() * 0.55);
    const r = size * (0.12 + rng() * 0.12);
    const blush = cctx.createRadialGradient(x, y, 0, x, y, r);
    blush.addColorStop(0, "rgba(196,74,58,0.35)");
    blush.addColorStop(1, "rgba(196,74,58,0)");
    cctx.fillStyle = blush;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();
  }

  // russet speckling (classic pear skin dots)
  rctx.fillStyle = "#8f8f8f";
  rctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 0.6 + rng() * 1.8;
    cctx.fillStyle = `rgba(120,90,45,${0.08 + rng() * 0.16})`;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();

    rctx.fillStyle = `rgba(60,60,60,${0.1 + rng() * 0.2})`;
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
