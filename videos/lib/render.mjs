// Renders a video folder (scene.html + core.js) frame by frame into an MP4.
// Usage: NODE_PATH=$(npm root -g) node videos/lib/render.mjs videos/<folder> [--stills 1.5,4,8] [--workers 2]
// The videos/ directory is served over a local HTTP server so scenes can fetch() their timings and voice files.
import { createRequire } from "node:module";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// playwright is installed globally in this environment; resolve it via NODE_PATH
const { chromium } = createRequire(import.meta.url)("playwright");
const lib = dirname(fileURLToPath(import.meta.url));
const root = dirname(lib);
const dir = resolve(process.argv[2]);
const name = basename(dir);
const out = join(dir, "out");
mkdirSync(out, { recursive: true });
const arg = (flag, def) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : def; };

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".ttf": "font/ttf", ".wav": "audio/wav", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer(async (req, res) => {
  const file = resolve(root, "." + decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0, "127.0.0.1");
await new Promise(r => server.on("listening", r));
const url = `http://127.0.0.1:${server.address().port}/${name}/scene.html`;

const browser = await chromium.launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => { console.error("scene error:", e.message); process.exit(1); });
  await page.goto(url);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.ready);
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.render(t); return document.getElementById("c").toDataURL("image/jpeg", 0.94); }, t);

const page = await openPage();
const tl = await page.evaluate(() => window.TIMELINE);

const stills = arg("--stills");
if (stills) {
  for (const t of stills.split(",").map(Number)) {
    const data = await grab(page, t);
    writeFileSync(join(out, `still_${t.toFixed(2)}.jpg`), Buffer.from(data.split(",")[1], "base64"));
  }
  await browser.close(); server.close();
  process.exit(0);
}

const cues = { duration: tl.DURATION, music: tl.MUSIC, events: await page.evaluate(() => window.SFX) };
if (tl.VOICE) cues.voice = { ...tl.VOICE, path: join(dir, tl.VOICE.path) };
writeFileSync(join(out, "sfx.json"), JSON.stringify(cues, null, 1));
execFileSync("python3", [join(lib, "audio.py"), join(out, "sfx.json"), join(out, "audio.wav")], { stdio: "inherit" });
if (tl.LOUDNESS) {
  // two-pass EBU R128 normalisation to the platforms' level (TikTok / Shorts play back around -14 LUFS)
  const wav = join(out, "audio.wav"), tmp = join(out, "audio_ln.wav"), ln = `loudnorm=I=${tl.LOUDNESS}:TP=-1:LRA=11`;
  const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", `${ln}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const m = JSON.parse(probe.slice(probe.lastIndexOf("{")));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", `${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, "-ar", "44100", tmp]);
  renameSync(tmp, wav);
}

// each worker renders a contiguous range of frames into its own video-only segment
const total = Math.round(tl.DURATION * tl.FPS);
const workers = Math.max(1, Number(arg("--workers", 1)));
const per = Math.ceil(total / workers);
async function renderRange(w, pg) {
  const seg = join(out, `seg_${w}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(tl.FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", seg], { stdio: ["pipe", "inherit", "inherit"] });
  const from = w * per, to = Math.min(total, from + per);
  for (let i = from; i < to; i++) {
    const data = await grab(pg, i / tl.FPS);
    if (!ff.stdin.write(Buffer.from(data.split(",")[1], "base64"))) await new Promise(r => ff.stdin.once("drain", r));
    if ((i - from) % 150 === 0) console.log(`${name}[${w}]: frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  return seg;
}
const pages = [page, ...(await Promise.all(Array.from({ length: workers - 1 }, openPage)))];
const segs = await Promise.all(pages.map((pg, w) => renderRange(w, pg)));
await browser.close(); server.close();

const list = join(out, "segments.txt");
writeFileSync(list, segs.map(s => `file '${s}'`).join("\n"));
const file = join(out, `${name}.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-i", join(out, "audio.wav"),
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", file], { stdio: "inherit" });
segs.forEach(s => rmSync(s)); rmSync(list);
console.log("done ->", file);
