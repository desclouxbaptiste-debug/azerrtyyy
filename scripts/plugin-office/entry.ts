/**
 * Le bureau pour l'extension Claude Code « bureau-agents » : mêmes règles
 * (`buildOffice`) et même dessin (`drawBackground`, `drawFrame`) que le bureau
 * web, rendus sans navigateur en SVG (bureau, appli mobile) ou en cellules de
 * terminal. Construit dans `plugins/bureau-agents/hooks/office.gen.js` par
 * `npm run build:plugin-office`.
 */
import { drawBackground, drawFrame, robotPose } from "@/components/office/scene";
import { DEFAULT_GEOMETRY, SCENE_H, SCENE_W } from "@/lib/office/layout";
import { LIVE_OPTIONS, buildOffice, currentTask } from "@/lib/office/reduce";
import type { Agent, OfficeEvent, OfficeState } from "@/lib/office/types";
import { PixelCanvas, PixelCtx, toCells, toSvgShapes, type GradientFill } from "./pixels";

export type { OfficeEvent };

const geo = DEFAULT_GEOMETRY;
type Ctx = CanvasRenderingContext2D;

let background: PixelCanvas | undefined;
function backgroundCanvas() {
  if (!background) {
    background = new PixelCanvas(SCENE_W, SCENE_H);
    drawBackground(new PixelCtx(background) as unknown as Ctx, geo);
  }
  return background;
}

function paint(office: OfficeState, now: number, vector: boolean) {
  const canvas = new PixelCanvas(SCENE_W, SCENE_H);
  const ctx = new PixelCtx(canvas, vector);
  drawFrame(ctx as unknown as Ctx, backgroundCanvas() as unknown as HTMLCanvasElement, office, now, null, geo, false);
  return { canvas, gradients: ctx.gradients };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const chars = (s: string) => Array.from(s);
const cut = (s: string, n: number) => {
  const c = chars(s.replace(/\s+/g, " ").trim());
  return c.length > n ? `${c.slice(0, n - 1).join("")}…` : c.join("");
};
/** Largeur approximative d'un texte (police à chasse fixe, émojis plus larges). */
const textWidth = (s: string, size: number) =>
  chars(s).reduce((w, ch) => w + (/\p{Extended_Pictographic}/u.test(ch) ? 1.15 : 0.6) * size, 0);

const FONT = `font-family="ui-monospace,Menlo,Consolas,monospace"`;

/** Ce que dit le chef, comme dans le bureau web. */
function chefSays(office: OfficeState) {
  const chef = office.chef;
  if (chef.status === "idle") return { icon: "☕", text: "J'attends une requête" };
  if (chef.status === "waiting")
    return {
      icon: "⏳",
      text: `J'attends l'équipe : ${chef.reportsDone} rapport${chef.reportsDone > 1 ? "s" : ""} sur ${chef.reportsTotal}`,
    };
  if (chef.status === "done") return { icon: "✅", text: "Réponse envoyée !" };
  return { icon: "🧠", text: "Je réfléchis à la demande…" };
}

/** Une bulle : nom (avec la couleur de la zone) et ce que fait le robot, pointant vers (x, y). */
function bubble(x: number, y: number, name: string, color: string, icon: string, text: string, compact: boolean) {
  const size = compact ? 5.6 : 6.6;
  const pad = 3;
  const lines = compact ? [] : wrap(`${icon} ${text}`, 24, 2);
  const head = compact ? `${icon} ${name}` : name;
  const w = Math.min(
    compact ? 64 : 118,
    pad * 2 + Math.max(textWidth(head, size * 0.85) + (compact ? 0 : 7), ...lines.map((l) => textWidth(l, size))),
  );
  const h = pad * 2 + size * 0.95 + lines.length * size * 1.2;
  const shiftK = x < 70 ? 0.18 : x > SCENE_W - 70 ? 0.82 : 0.5;
  const left = Math.max(1, Math.min(SCENE_W - w - 1, x - w * shiftK));
  const top = Math.max(1, y - h - 4);
  const tail = Math.max(left + 3, Math.min(left + w - 3, x));
  let out = `<g>`;
  out += `<rect x="${left + 1.5}" y="${top + 1.8}" width="${w}" height="${h}" fill="#000" opacity="0.35"/>`;
  out += `<rect x="${left}" y="${top}" width="${w}" height="${h}" fill="#f6f1e4" stroke="#15121b" stroke-width="1"/>`;
  out += `<path d="M${tail - 2.5} ${top + h - 0.5}h5l-2.5 3.5z" fill="#f6f1e4"/>`;
  const nameX = compact ? left + pad : left + pad + 6;
  if (!compact)
    out += `<rect x="${left + pad}" y="${top + pad + 0.5}" width="4" height="4" fill="${esc(color)}" stroke="#15121b" stroke-width="0.6"/>`;
  out += `<text x="${nameX}" y="${top + pad + size * 0.8}" font-size="${(size * 0.85).toFixed(2)}" fill="#15121b" opacity="0.8" ${FONT}>${esc(
    cut(head, compact ? 14 : 30),
  )}</text>`;
  lines.forEach((l, i) => {
    out += `<text x="${left + pad}" y="${top + pad + size * 0.95 + (i + 0.85) * size * 1.2}" font-size="${size}" fill="#15121b" ${FONT}>${esc(l)}</text>`;
  });
  return out + `</g>`;
}

/** Coupe un texte en `max` lignes d'environ `per` caractères (la dernière se termine par « … »). */
function wrap(text: string, per: number, max: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (chars(next).length <= per) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = chars(w).length > per ? cut(w, per) : w;
    }
    if (lines.length === max) break;
  }
  if (lines.length < max && cur) lines.push(cur);
  const all = lines.join(" ");
  if (lines.length === max && chars(all).length < chars(text).length - 1)
    lines[max - 1] = cut(`${lines[max - 1]}…`, per);
  return lines;
}

function label(x: number, y: number, text: string, bg: string, fg: string) {
  const size = 6;
  const w = textWidth(text, size) + 5;
  return `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${size + 3.5}" fill="${bg}"/><text x="${x + 2.5}" y="${
    y + size + 1.2
  }" font-size="${size}" fill="${fg}" letter-spacing="0.4" ${FONT}>${esc(text)}</text>`;
}

function gradientSvg(fills: GradientFill[]) {
  return fills
    .map(({ gradient: g, x, y, w, h, alpha }, i) => {
      const stops = g.stops
        .map(
          (s) =>
            `<stop offset="${s.offset}" stop-color="rgb(${s.color.slice(0, 3).map(Math.round).join(",")})" stop-opacity="${s.color[3]}"/>`,
        )
        .join("");
      return `<defs><radialGradient id="g${i}" gradientUnits="userSpaceOnUse" cx="${g.x1}" cy="${g.y1}" r="${g.r1}" fx="${g.x0}" fy="${g.y0}" fr="${g.r0}">${stops}</radialGradient></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g${i})" opacity="${alpha}"/>`;
    })
    .join("");
}

export type OfficeView = {
  /** Le dessin, `<svg …>…</svg>` (moins de 131 072 caractères). */
  svg: string;
  /** Description du bureau pour qui ne voit pas le dessin. */
  alt: string;
  /** Robots au bureau, tâches en cours et faites. */
  present: number;
  running: number;
  done: number;
};

type Seated = { a: Agent; x: number; y: number };

function seatedOf(office: OfficeState, now: number): Seated[] {
  return office.present
    .map((a) => ({ a, pose: robotPose(a, now, geo) }))
    .filter(({ pose }) => pose.mode === "seated")
    .map(({ a, pose }) => ({ a, x: pose.x, y: pose.y }));
}

function describe(office: OfficeState, seated: Seated[]) {
  const chef = chefSays(office);
  const busy = seated.filter(({ a }) => a.busy);
  const parts = [`Bureau de Claude. ${office.chef.name} (chef) : ${chef.text}`];
  if (office.chef.currentPrompt) parts.push(`Demande : ${cut(office.chef.currentPrompt, 120)}`);
  if (busy.length)
    parts.push(
      `${busy.length} robot${busy.length > 1 ? "s" : ""} au travail : ${busy
        .map(({ a }) => `${a.name} (${geo.byId[a.zone].label}) ${currentTask(a)?.summary ?? "au travail"}`)
        .join(" ; ")}`,
    );
  else parts.push("Aucun robot au travail.");
  return parts.join(". ");
}

/** Le bureau à l'instant `now`, en SVG. */
export function renderOfficeSvg(events: OfficeEvent[], now: number): OfficeView {
  const office = buildOffice(events, now, LIVE_OPTIONS, geo);
  const { canvas, gradients } = paint(office, now, true);
  const seated = seatedOf(office, now);

  // Une grande bulle par zone (le plus récent au travail), les autres en version courte.
  const best = new Map<string, { key: string; start: number }>();
  for (const { a } of seated) {
    const t = currentTask(a);
    if (!a.busy || !t) continue;
    const cur = best.get(a.zone);
    if (!cur || t.start > cur.start) best.set(a.zone, { key: a.key, start: t.start });
  }
  const featured = new Set([...best.values()].map((v) => v.key));

  let overlay = "";
  for (const z of geo.zones) overlay += label(z.x + 3, z.y + 3, z.label, "#17131c", "#d9d2e6");
  const { rug, anchor } = geo.chef;
  overlay += label(rug.x + 8, rug.y + rug.h - 13, "CHEF", "#2a1a10", "#ffb070");
  // Les bulles courtes d'abord : une grande bulle voisine passe devant, jamais l'inverse.
  const busy = seated.filter(({ a }) => a.busy).sort((p, q) => Number(featured.has(p.a.key)) - Number(featured.has(q.a.key)));
  for (const { a, x, y } of busy) {
    const t = currentTask(a);
    overlay += bubble(x, y - 8, a.name, geo.byId[a.zone].accent, t?.icon ?? "⚙️", t?.summary ?? "Au travail", !featured.has(a.key));
  }
  const chef = chefSays(office);
  overlay += bubble(anchor.x, anchor.y - 6, office.chef.name, "#e8873a", chef.icon, chef.text, false);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W * 2}" height="${SCENE_H * 2}">` +
    `<g shape-rendering="crispEdges">${toSvgShapes(canvas)}</g>${gradientSvg(gradients)}${overlay}</svg>`;

  return {
    svg,
    alt: describe(office, seated),
    present: office.present.length,
    running: office.tasks.filter((t) => t.end === undefined).length,
    done: office.tasks.filter((t) => t.end !== undefined).length,
  };
}

/** Le bureau à l'instant `now`, en cellules de terminal (« ▀ ») sur `columns` colonnes. */
export function renderOfficeCells(events: OfficeEvent[], now: number, columns: number) {
  const office = buildOffice(events, now, LIVE_OPTIONS, geo);
  const { canvas } = paint(office, now, false);
  return { ...toCells(canvas, columns), alt: describe(office, seatedOf(office, now)) };
}
