// Renders scene.html frame by frame into an MP4.
// Usage: node render.mjs [--stills 1.5,4,8]   (stills = preview PNGs only)
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// playwright is installed globally in this environment; resolve it via NODE_PATH
const { chromium } = createRequire(import.meta.url)("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(join(here, "scene.html")).href);
await page.evaluate(() => window.ready);
const tl = await page.evaluate(() => window.TIMELINE);
writeFileSync(join(out, "sfx.json"), JSON.stringify(await page.evaluate(() => window.SFX), null, 1));

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

execFileSync("python3", [join(here, "audio.py"), join(out, "sfx.json"), join(out, "audio.wav")], { stdio: "inherit" });

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(tl.FPS), "-c:v", "mjpeg", "-i", "-",
  "-i", join(out, "audio.wav"),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
  join(out, "demo-5-faits.mp4"),
], { stdio: ["pipe", "inherit", "inherit"] });

const total = tl.DURATION * tl.FPS;
for (let i = 0; i < total; i++) {
  const url = await grab(i / tl.FPS);
  if (!ff.stdin.write(Buffer.from(url.split(",")[1], "base64"))) await new Promise(r => ff.stdin.once("drain", r));
  if (i % 90 === 0) process.stdout.write(`frame ${i}/${total}\n`);
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
await browser.close();
console.log("done ->", join(out, "demo-5-faits.mp4"));
