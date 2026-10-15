import type { ReduceOptions } from "./reduce";
import type { OfficeEvent } from "./types";

/**
 * Mode démo : scénarios rejoués en boucle quand aucun événement réel
 * n'arrive de Claude Code. Les durées sont en secondes.
 */
type Step =
  | { at: number; prompt: string }
  | { at: number; stop: true }
  | {
      at: number;
      tool: string;
      input: Record<string, unknown>;
      dur: number;
      output?: string;
      sub?: { id: string; type: string; steps: Step[]; report: string };
    };

const bash = (command: string, description: string) => ({ command, description });

const SCENARIOS: { length: number; steps: Step[] }[] = [
  {
    length: 78,
    steps: [
      { at: 0, prompt: "Fais-moi un bureau pixel art pour regarder travailler mes agents" },
      { at: 1, tool: "TodoWrite", input: {}, dur: 1 },
      {
        at: 2,
        tool: "Agent",
        dur: 20,
        input: {
          subagent_type: "Explore",
          description: "Explorer le dépôt",
          prompt: "Repère la stack, les conventions et les composants existants.",
        },
        sub: {
          id: "explore",
          type: "Explore",
          report: "Next.js 16 + Tailwind 4, App Router, composants dans src/components.",
          steps: [
            { at: 1, tool: "Glob", input: { pattern: "src/**/*.tsx" }, dur: 1.5 },
            { at: 3, tool: "Read", input: { file_path: "package.json" }, dur: 2 },
            { at: 6, tool: "Grep", input: { pattern: "export default", path: "src" }, dur: 2.5 },
            { at: 10, tool: "Read", input: { file_path: "src/app/layout.tsx" }, dur: 2 },
            { at: 14, tool: "Read", input: { file_path: "AGENTS.md" }, dur: 2 },
          ],
        },
      },
      { at: 3, tool: "WebSearch", input: { query: "pixel art office tileset palette" }, dur: 5 },
      { at: 4.5, tool: "WebSearch", input: { query: "sprites robots 16x16 inspiration" }, dur: 6 },
      { at: 6, tool: "WebFetch", input: { url: "https://lospec.com/palette-list/sweetie-16" }, dur: 4 },
      {
        at: 9,
        tool: "Read",
        input: { file_path: "node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md" },
        dur: 3,
      },
      { at: 11, tool: "Grep", input: { pattern: "LayoutProps", path: "src" }, dur: 2 },
      {
        at: 13,
        tool: "Agent",
        dur: 14,
        input: {
          subagent_type: "Plan",
          description: "Concevoir l'architecture",
          prompt: "Propose un découpage : hooks → journal → API → scène canvas.",
        },
        sub: {
          id: "plan",
          type: "Plan",
          report: "Plan : hook Node → events.jsonl → /api/office → reducer → canvas + bulles.",
          steps: [
            { at: 2, tool: "Read", input: { file_path: "src/lib/utils.ts" }, dur: 2 },
            { at: 6, tool: "Grep", input: { pattern: "use client", path: "src" }, dur: 2 },
          ],
        },
      },
      { at: 24, tool: "Write", input: { file_path: "src/lib/office/reduce.ts" }, dur: 4 },
      { at: 25.5, tool: "Write", input: { file_path: "src/components/office/scene.ts" }, dur: 5 },
      { at: 27, tool: "Write", input: { file_path: "src/components/office/office.tsx" }, dur: 6 },
      { at: 29, tool: "Edit", input: { file_path: "src/app/globals.css" }, dur: 3 },
      { at: 31, tool: "Write", input: { file_path: "public/sprites/robot.svg" }, dur: 4 },
      { at: 35, tool: "Bash", input: bash("npm run lint", "Vérifier le lint"), dur: 5, output: "✔ No problems" },
      { at: 38, tool: "Bash", input: bash("npm run build", "Compiler le projet"), dur: 9, output: "✓ Compiled successfully" },
      {
        at: 41,
        tool: "Agent",
        dur: 12,
        input: { subagent_type: "general-purpose", description: "Relire le code", prompt: "Cherche les bugs évidents." },
        sub: {
          id: "review",
          type: "general-purpose",
          report: "Rien de bloquant, deux noms de variables à clarifier.",
          steps: [
            { at: 2, tool: "Read", input: { file_path: "src/lib/office/reduce.ts" }, dur: 3 },
            { at: 6, tool: "Grep", input: { pattern: "TODO", path: "src" }, dur: 2 },
          ],
        },
      },
      { at: 48, tool: "Read", input: { file_path: "src/app/bureau/page.tsx" }, dur: 2 },
      { at: 54, tool: "Bash", input: bash("git commit -m \"Ajoute le bureau\"", "Committer le travail"), dur: 3 },
      { at: 58, tool: "Bash", input: bash("git push -u origin main", "Pousser la branche"), dur: 4 },
      { at: 63, stop: true },
    ],
  },
  {
    length: 60,
    steps: [
      { at: 0, prompt: "Compare trois cafés en grains et résume les avis clients" },
      { at: 1, tool: "TodoWrite", input: {}, dur: 1 },
      { at: 2, tool: "WebSearch", input: { query: "cafejoyeux.com café en grains N°1 L'Ordinaire" }, dur: 7 },
      { at: 3, tool: "WebFetch", input: { url: "https://www.malongo.com/cafes-en-grains" }, dur: 6 },
      {
        at: 4,
        tool: "Agent",
        dur: 18,
        input: { subagent_type: "Explore", description: "Collecter les avis clients", prompt: "Trouve des avis récents pour chaque café." },
        sub: {
          id: "avis",
          type: "Explore",
          report: "34 avis collectés, note moyenne 4,3/5.",
          steps: [
            { at: 1, tool: "WebSearch", input: { query: "avis café Malongo grains" }, dur: 4 },
            { at: 6, tool: "WebFetch", input: { url: "https://www.avis-verifies.com/cafe" }, dur: 4 },
            { at: 11, tool: "WebSearch", input: { query: "note café Joyeux grains" }, dur: 3 },
          ],
        },
      },
      { at: 9, tool: "WebFetch", input: { url: "https://www.cafejoyeux.com/fr/cafe-en-grains" }, dur: 5 },
      {
        at: 12,
        tool: "Agent",
        dur: 12,
        input: { subagent_type: "Plan", description: "Construire la grille de notation", prompt: "Arôme, prix, origine, éthique." },
        sub: {
          id: "grille",
          type: "Plan",
          report: "Grille sur 4 critères pondérés.",
          steps: [{ at: 2, tool: "Read", input: { file_path: "notes/criteres.md" }, dur: 2 }],
        },
      },
      { at: 16, tool: "Write", input: { file_path: "rapport/comparatif.md" }, dur: 6 },
      { at: 19, tool: "Write", input: { file_path: "rapport/graphique.svg" }, dur: 5 },
      { at: 21, tool: "Edit", input: { file_path: "rapport/style.css" }, dur: 3 },
      { at: 26, tool: "Bash", input: bash("python3 scripts/score.py", "Calculer les scores"), dur: 6, output: "Joyeux 8.4 · Malongo 8.1 · Ordinaire 7.2" },
      { at: 33, tool: "Read", input: { file_path: "rapport/comparatif.md" }, dur: 3 },
      { at: 39, stop: true },
    ],
  },
];

export const DEMO_OPTIONS: ReduceOptions = { idleLeaveMs: 12_000, subagentLeaveMs: 5_000 };

function expand(steps: Step[], base: number, prefix: string, out: OfficeEvent[], agent?: { id: string; type: string }) {
  steps.forEach((s, i) => {
    const ts = base + s.at * 1000;
    const id = `${prefix}-${i}`;
    if ("prompt" in s) out.push({ id, ts, type: "prompt", text: s.prompt });
    else if ("stop" in s) out.push({ id, ts, type: "stop" });
    else {
      const end = ts + s.dur * 1000;
      out.push({ id: `${id}s`, ts, type: "tool_start", tool: s.tool, input: s.input, toolUseId: id, agentId: agent?.id, agentType: agent?.type });
      if (s.sub) {
        const sub = { id: `${prefix}-${s.sub.id}`, type: s.sub.type };
        out.push({ id: `${id}a`, ts: ts + 300, type: "subagent_start", agentId: sub.id, agentType: sub.type });
        expand(s.sub.steps, ts, `${id}-${s.sub.id}`, out, sub);
        out.push({ id: `${id}b`, ts: end - 400, type: "subagent_end", agentId: sub.id, agentType: sub.type, text: s.sub.report });
      }
      out.push({
        id: `${id}e`,
        ts: end,
        type: "tool_end",
        tool: s.tool,
        toolUseId: id,
        agentId: agent?.id,
        ok: true,
        output: s.output ?? s.sub?.report ?? "OK",
      });
    }
  });
}

/** Tous les événements de démo survenus avant `now` (boucles récentes uniquement). */
export function demoEvents(origin: number, now: number): OfficeEvent[] {
  const out: OfficeEvent[] = [];
  let base = origin;
  let loop = 0;
  const loops: { base: number; loop: number }[] = [];
  while (base <= now) {
    loops.push({ base, loop });
    base += SCENARIOS[loop % SCENARIOS.length].length * 1000;
    loop++;
  }
  for (const { base, loop } of loops.slice(-2)) {
    expand(SCENARIOS[loop % SCENARIOS.length].steps, base, `demo${loop}`, out);
  }
  return out.filter((e) => e.ts <= now);
}
