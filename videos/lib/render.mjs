// Renders a video folder (scene.html + core.js) frame by frame into an MP4.
// Usage: NODE_PATH=$(npm root -g) node videos/lib/render.mjs videos/<folder> [--stills 1.5,4,8]
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// playwright is installed globally in this environment; resolve it via NODE_PATH
const { chromium } = createRequire(import.meta.url)("playwright");
const lib = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2]);
const name = basename(dir);
const out = join(dir, "out");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("pageerror", e => { console.error("scene error:", e.message); process.exit(1); });
await page.goto(pathToFileURL(join(dir, "scene.html")).href);
await page.evaluate(() => window.ready);
const tl = await page.evaluate(() => window.TIMELINE);
const cues = { duration: tl.DURATION, music: tl.MUSIC, events: await page.evaluate(() => window.SFX) };
writeFileSync(join(out, "sfx.json"), JSON.stringify(cues, null, 1));

const grab = t => page.evaluate(t => { window.render(t); return document.getElementById("c").toDataURL("image/jpeg", 0.94); }, t);

const stillsArg = process.argv.indexOf("--stills");
if (stillsArg > -1) {
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    const url = await grab(t);
    writeFileSync(join(out, `still_${t.toFixed(2)}.jpg`), Buffer.from(url.split(",")[1], "base64"));
  }
  await browser.close();
  process.exit(0);
}

execFileSync("python3", [join(lib, "audio.py"), join(out, "sfx.json"), join(out, "audio.wav")], { stdio: "inherit" });

const file = join(out, `${name}.mp4`);
const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(tl.FPS), "-c:v", "mjpeg", "-i", "-",
  "-i", join(out, "audio.wav"),
  "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", file,
], { stdio: ["pipe", "inherit", "inherit"] });

const total = Math.round(tl.DURATION * tl.FPS);
for (let i = 0; i < total; i++) {
  const url = await grab(i / tl.FPS);
  if (!ff.stdin.write(Buffer.from(url.split(",")[1], "base64"))) await new Promise(r => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`${name}: frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
await browser.close();
console.log("done ->", file);
