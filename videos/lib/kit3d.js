// 3D + subtitle toolkit for narrated explainer videos (ES module, used with three.js r170).
// A scene: builds a THREE.Scene, then each frame calls kit.frame(t, drawOverlay).
import * as THREE from "./vendor/three.module.min.js";

export { THREE };
export const W = 1080, H = 1920;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x, c1 = 1.70158) => 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
};
export const smooth = (t, a, b) => ease.inOut(prog(t, a, b));

export function createKit({ background = "#14161f", fog = null, exposure = 1.0 } = {}) {
  const out = document.getElementById("c");
  const ctx = out.getContext("2d");
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.Fog(fog.color || background, fog.near, fog.far);
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);
  return { THREE, renderer, scene, camera, ctx, out };
}

export function studioLights(scene, { key = "#fff1de", fill = "#bcd4ff", ground = "#2a2433", intensity = 1 } = {}) {
  scene.add(new THREE.HemisphereLight(fill, ground, 1.1 * intensity));
  const sun = new THREE.DirectionalLight(key, 2.6 * intensity);
  sun.position.set(5, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 40 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#ffffff", 0.8 * intensity);
  rim.position.set(-6, 5, -6);
  scene.add(rim);
  return { sun, rim };
}

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.55, metalness: o.metalness ?? 0, emissive: o.emissive || "#000000", emissiveIntensity: o.emissiveIntensity ?? 1, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1 });

export function mesh(geo, material, { shadow = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = shadow; m.receiveShadow = receive;
  return m;
}

// Simple stylised character: capsule body, sphere head, capsule arms, two eyes.
export function person(color = "#e9e4da", { scale = 1, eyes = true } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.45 });
  const body = mesh(new THREE.CapsuleGeometry(0.34, 0.62, 8, 24), m); body.position.y = 0.68;
  const head = mesh(new THREE.SphereGeometry(0.27, 32, 24), m); head.position.y = 1.47;
  const armGeo = new THREE.CapsuleGeometry(0.09, 0.42, 6, 12);
  const armL = new THREE.Group(), armR = new THREE.Group();
  const al = mesh(armGeo, m), ar = mesh(armGeo, m);
  al.position.y = -0.28; ar.position.y = -0.28;
  armL.add(al); armR.add(ar);
  armL.position.set(-0.42, 1.08, 0); armR.position.set(0.42, 1.08, 0);
  armL.rotation.z = -0.12; armR.rotation.z = 0.12;
  g.add(body, head, armL, armR);
  if (eyes) {
    const em = mat("#15161c", { roughness: 0.3 });
    for (const x of [-0.09, 0.09]) { const e = mesh(new THREE.SphereGeometry(0.035, 12, 8), em, { shadow: false }); e.position.set(x, 1.5, 0.245); head.add(e); e.position.y -= 1.47; }
  }
  g.scale.setScalar(scale);
  g.userData = { body, head, armL, armR, material: m };
  return g;
}

// gestures, all functions of time (stateless => frames can render in any order)
export const pose = {
  idle(p, t, seed = 0) { p.userData.body.scale.y = 1 + 0.015 * Math.sin(t * 2.2 + seed); p.userData.head.position.y = 1.47 + 0.01 * Math.sin(t * 2.2 + seed); },
  wave(p, t, k = 1) { p.userData.armR.rotation.z = lerp(0.12, 2.6, k) + Math.sin(t * 10) * 0.25 * k; },
  raiseHand(p, k) { p.userData.armR.rotation.z = lerp(0.12, 2.9, k); },
  armsUp(p, k) { p.userData.armL.rotation.z = lerp(-0.12, -2.7, k); p.userData.armR.rotation.z = lerp(0.12, 2.7, k); },
  shake(p, t, k) { p.userData.head.rotation.y = Math.sin(t * 14) * 0.35 * k; },
  nod(p, t, k) { p.userData.head.rotation.x = Math.max(0, Math.sin(t * 9)) * 0.3 * k; },
  look(p, yaw, pitch = 0) { p.userData.head.rotation.y = yaw; p.userData.head.rotation.x = pitch; },
  walk(p, t, k = 1) { const s = Math.sin(t * 9); p.userData.armL.rotation.x = s * 0.6 * k; p.userData.armR.rotation.x = -s * 0.6 * k; p.position.y = Math.abs(s) * 0.06 * k; },
};

// Camera keyframes: [{t, pos:[x,y,z], look:[x,y,z], fov?}] eased between keys
export function cameraAt(camera, keys, t) {
  let i = 0;
  while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = b === a ? 0 : ease.inOut(clamp((t - a.t) / (b.t - a.t)));
  const v = (x, y) => x.map((n, j) => lerp(n, y[j], k));
  camera.position.set(...v(a.pos, b.pos));
  camera.lookAt(...v(a.look, b.look));
  const fov = lerp(a.fov || 38, b.fov || 38, k);
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// Canvas texture for labels/screens inside the 3D world
export function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------- 2D overlay
export function txt(ctx, str, x, y, size, font, fill, o = {}) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = o.align || "center"; ctx.textBaseline = o.baseline || "middle";
  if (o.spacing) ctx.letterSpacing = o.spacing + "px";
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur ?? 24; ctx.shadowOffsetY = o.dy ?? 6; }
  if (o.stroke) { ctx.lineWidth = o.strokeW || 10; ctx.strokeStyle = o.stroke; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); ctx.shadowColor = "transparent"; }
  if (fill) { ctx.fillStyle = fill; ctx.fillText(str, x, y); }
  ctx.restore();
}

// Turns timings.json into subtitle "cards" of 1-3 words (never across sentences), each word timed.
export function buildCaptions(timings, { maxChars = 16, maxWords = 3 } = {}) {
  const cards = [];
  for (const seg of timings.segments) for (const s of seg.sentences) {
    let cur = [];
    const flush = () => { if (cur.length) cards.push({ words: cur, start: cur[0].s, end: cur[cur.length - 1].e, seg: seg.id }); cur = []; };
    for (const w of s.words) {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
      if (cur.length && (len > maxChars || cur.length >= maxWords)) flush();
      cur.push(w);
      if (/[,.;:!?…]$/.test(w.w)) flush();
    }
    flush();
  }
  // each card stays until the next one starts (no flicker in short pauses)
  cards.forEach((c, i) => { c.until = i + 1 < cards.length ? Math.min(cards[i + 1].start, c.end + 0.6) : c.end + 0.6; });
  return cards;
}

// Word-by-word subtitles: white with thick dark outline, the spoken word turns accent colour and pops.
export function drawCaptions(ctx, cards, t, { y = 1290, size = 82, font = "MontX", accent = "#FFD400", highlight = null } = {}) {
  const c = cards.find(c => t >= c.start - 0.05 && t < c.until);
  if (!c) return;
  const appear = ease.outBack(prog(t, c.start - 0.05, c.start + 0.12), 2.2);
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const words = c.words.map(w => ({ ...w, text: w.w.toUpperCase().replace(/[,.;:]$/, ""), }));
  const space = size * 0.3;
  const widths = words.map(w => ctx.measureText(w.text).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x = W / 2 - total / 2;
  ctx.translate(W / 2, y); ctx.scale(0.85 + 0.15 * appear, 0.85 + 0.15 * appear); ctx.translate(-W / 2, -y);
  ctx.globalAlpha = clamp(appear * 1.5);
  words.forEach((w, i) => {
    const active = t >= w.s - 0.03 && (i === words.length - 1 || t < words[i + 1].s - 0.03);
    const spoken = t >= w.s - 0.03;
    const key = highlight && highlight(w.text);
    const pop = active ? 1 + 0.1 * (1 - ease.outCubic(prog(t, w.s - 0.03, w.s + 0.15))) : 1;
    const cx = x + widths[i] / 2;
    ctx.save(); ctx.translate(cx, y); ctx.scale(pop, pop);
    txt(ctx, w.text, 0, 0, size, font, active ? accent : key ? key : spoken ? "#ffffff" : "rgba(255,255,255,0.92)", { stroke: "#0b0b10", strokeW: size * 0.2, shadow: "rgba(0,0,0,.55)", blur: 18, dy: 6 });
    ctx.restore();
    x += widths[i] + space;
  });
  ctx.restore();
}

export function vignette(ctx, strength = 0.55) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

export function makeGrain(n = 4, seed = 1) {
  const out = [];
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let k = 0; k < n; k++) {
    const g = document.createElement("canvas"); g.width = 540; g.height = 960;
    const gc = g.getContext("2d"); const img = gc.createImageData(540, 960);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gc.putImageData(img, 0, 0); out.push(g);
  }
  return out;
}
export function grain(ctx, grains, frame, alpha = 0.05) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(grains[frame % grains.length], 0, 0, W, H); ctx.restore();
}

export async function loadFonts(families) {
  await Promise.all(families.map(f => document.fonts.load(`100px ${f}`)));
}
