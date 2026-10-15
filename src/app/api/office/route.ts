import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { OfficeEvent } from "@/lib/office/types";

/** Journal écrit par `.claude/hooks/office-log.mjs`. */
const EVENTS_FILE =
  process.env.OFFICE_EVENTS_FILE ?? path.join(process.cwd(), ".claude", "office", "events.jsonl");

const MAX_EVENTS = 3000;

export async function GET() {
  let raw = "";
  try {
    raw = await readFile(/*turbopackIgnore: true*/ EVENTS_FILE, "utf8");
  } catch {
    return Response.json({ events: [] });
  }
  const events: OfficeEvent[] = [];
  for (const line of raw.split("\n").slice(-MAX_EVENTS)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // ligne partielle (écriture en cours) : ignorée
    }
  }
  return Response.json({ events });
}

export async function DELETE() {
  await rm(/*turbopackIgnore: true*/ EVENTS_FILE, { force: true });
  return Response.json({ ok: true });
}
