import * as THREE from "three";

/** A green leaf gradient with a central vein and branching side veins. */
export function createLeafTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0, "#3c5c22");
  grad.addColorStop(0.5, "#5a7f2e");
  grad.addColorStop(1, "#7ea23f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.06);
  ctx.lineTo(size / 2, size * 0.98);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1.2;
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    const y = size * (0.15 + t * 0.72);
    const spread = size * 0.15 * (1 - Math.abs(t - 0.5) * 1.3);
    ctx.beginPath();
    ctx.moveTo(size / 2, y);
    ctx.lineTo(size / 2 - spread, y - size * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size / 2, y);
    ctx.lineTo(size / 2 + spread, y - size * 0.06);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
