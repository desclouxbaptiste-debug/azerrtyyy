// Rule check of a lib/epure.js video: every text drawn, at every step, must be at least 48 px and inside the safe
// zone (nothing in the bottom 250 px or the right 150 px).
// Usage: NODE_PATH=$(npm root -g) node videos/lib/audit.mjs videos/<folder> [step in seconds, default 0.1]
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { basename, dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = dirname(dirname(fileURLToPath(import.meta.url))), name = basename(resolve(process.argv[2])), pas = Number(process.argv[3] || 0.1);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".ttf": "font/ttf" };
const server = http.createServer(async (req, res) => {
  const file = resolve(root, "." + decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }); res.end(body); } catch { res.writeHead(404); res.end(); }
}).listen(0, "127.0.0.1");
await new Promise(r => server.on("listening", r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "warning" || m.type() === "error") errs.push(m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/${name}/scene.html`);
await page.waitForFunction(() => window.ready); await page.evaluate(() => window.ready);
const r = await page.evaluate(pas => {
  const out = {}; let min = 999, n = 0;
  for (let t = 0; t < window.TIMELINE.DURATION; t += pas) { const a = window.__audit(t); min = Math.min(min, a.min); n++;
    for (const h of a.hors) { const k = `${h.s} | ${h.px}px | x ${h.x0}–${h.x1} | y ${h.y0}–${h.y1}`; (out[k] = out[k] || []).push(+t.toFixed(1)); } }
  return { out, min, n, duree: window.TIMELINE.DURATION };
}, pas);
console.log(`durée ${r.duree}s, ${r.n} instants vérifiés, plus petit texte : ${r.min.toFixed(1)} px`);
const k = Object.entries(r.out);
console.log(k.length ? k.map(([s, ts]) => `HORS RÈGLE  ${s}  (${ts[0]}–${ts[ts.length - 1]} s)`).join("\n") : "aucun texte hors zone ni sous 48 px");
if (errs.length) console.log("messages :", [...new Set(errs)].join(" | "));
await browser.close(); server.close();
