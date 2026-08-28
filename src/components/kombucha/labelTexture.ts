function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the can label (gradient + wordmark + flavor name) onto a square canvas. */
export function drawLabel(
  canvas: HTMLCanvasElement,
  fromColor: string,
  toColor: string,
  flavorName: string,
) {
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, fromColor);
  grad.addColorStop(1, toColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const shine = ctx.createLinearGradient(0, 0, w, h);
  shine.addColorStop(0, "rgba(255,255,255,0.2)");
  shine.addColorStop(0.5, "rgba(255,255,255,0)");
  shine.addColorStop(1, "rgba(255,255,255,0.08)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 26; i++) {
    const bx = (i * 137.5) % w;
    const by = (i * 91.3 + 40) % h;
    const r = 4 + ((i * 13) % 14);
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const bandY = h * 0.38;
  const bandH = h * 0.26;
  ctx.fillStyle = "rgba(252,246,236,0.95)";
  roundRect(ctx, w * 0.04, bandY, w * 0.92, bandH, 28);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "800 46px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(flavorName.toUpperCase(), w / 2, bandY - 34);

  ctx.font = "900 108px system-ui, sans-serif";
  ctx.fillStyle = "#2F2521";
  ctx.fillText("TCHIAO", w / 2, bandY + bandH * 0.42);

  ctx.font = "700 48px system-ui, sans-serif";
  ctx.fillText("KOMBUCHA", w / 2, bandY + bandH * 0.74);
}
