// Lists, set by set, the solid things that pass through each other in a 3D story video (lib/recit3d.js).
// Usage: NODE_PATH=$(npm root -g) node videos/lib/collisions.mjs videos/<folder> [--pas 0.2] [--marge 0.03] [--segment id]
// Fir trees overlapping other fir trees are a forest, not a mistake: they are left out.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { basename, dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = resolve(process.argv[2]), name = basename(dir);
const arg = (flag, def) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : def; };
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".ttf": "font/ttf" };
const server = http.createServer(async (req, res) => {
  const file = resolve(root, "." + decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0, "127.0.0.1");
await new Promise(r => server.on("listening", r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", e => { console.error("scene error:", e.message); process.exit(1); });
await page.goto(`http://127.0.0.1:${server.address().port}/${name}/scene.html`);
await page.waitForFunction(() => window.ready);
await page.evaluate(() => window.ready);
const pas = Number(arg("--pas", 0.2)), marge = Number(arg("--marge", 0.03)), seul = arg("--segment");
const found = await page.evaluate(({ pas, marge, seul }) => {
  const out = {}, D = window.TIMELINE.DURATION;
  for (let t = 0; t < D; t += pas) for (const c of window.__collisions(t, marge)) {
    if ((seul && c.id !== seul) || (c.a.startsWith("sapin") && c.b.startsWith("sapin"))) continue;
    const k = `${c.id} | ${c.a.split("@")[0]} × ${c.b.split("@")[0]} | ${c.a.split("@")[1]} ~ ${c.b.split("@")[1]}`;
    const e = out[k] || (out[k] = { de: t, a: t, d: 0 });
    e.a = t; e.d = Math.max(e.d, c.d);
  }
  return out;
}, { pas, marge, seul });
const lignes = Object.entries(found);
if (!lignes.length) console.log("aucun chevauchement");
for (const [k, e] of lignes) console.log(`${k} | ${e.de.toFixed(1)}–${e.a.toFixed(1)} s | ${(e.d * 100).toFixed(0)} cm`);
await browser.close(); server.close();
