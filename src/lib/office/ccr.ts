import { isSystemPrompt, relayedText } from "./describe";
import type { OfficeEvent } from "./types";

/**
 * Lecture des sessions Claude Code via le connecteur « Claude Code Remote »
 * (outils `list_sessions` et `list_events`) et conversion de leur journal
 * en événements du bureau.
 */

export type SessionSummary = {
  id: string;
  title: string;
  updatedAt: number;
  /** working, blocked, review_ready, completed, failed… (en minuscules) */
  bucket: string;
};

export type EventPage = {
  events: OfficeEvent[];
  firstId?: string;
  lastId?: string;
  hasMore: boolean;
};

/** Les outils ne prennent que ces types d'événements : le reste (hooks, flux) est du bruit. */
export const TRANSCRIPT_KINDS = ["user", "assistant", "result"] as const;

const MAX_STR = 1500;
const MAX_OUTPUT = 800;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** Le connecteur renvoie `{ccr: {...}}` ; on accepte aussi l'objet nu ou du texte JSON. */
export function unwrapPayload(payload: unknown): Obj | null {
  let p = payload;
  if (typeof p === "string") {
    const start = p.indexOf("{");
    const end = p.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      p = JSON.parse(p.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!isObj(p)) return null;
  return isObj(p.ccr) ? p.ccr : p;
}

function trimDeep(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > MAX_STR ? `${v.slice(0, MAX_STR)}…` : v;
  if (Array.isArray(v)) return depth > 2 ? `[${v.length} éléments]` : v.slice(0, 20).map((x) => trimDeep(x, depth + 1));
  if (isObj(v)) {
    if (depth > 2) return "{…}";
    return Object.fromEntries(
      Object.entries(v)
        .slice(0, 30)
        .map(([k, x]) => [k, trimDeep(x, depth + 1)]),
    );
  }
  return v;
}

/** Texte lisible d'un contenu de résultat d'outil (chaîne ou blocs). */
function textOf(content: unknown): string | undefined {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .map((b) => (typeof b === "string" ? b : isObj(b) && typeof b.text === "string" ? b.text : ""))
      .filter(Boolean);
    return parts.length ? parts.join("\n") : undefined;
  }
  return undefined;
}

const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n)}…` : s);

export type SessionPage = { sessions: SessionSummary[]; hasMore: boolean; lastId?: string };

/** Une page de `list_sessions` ; `lastId` se passe en `after_id` pour la suivante (plus anciennes). */
export function parseSessionPage(payload: unknown): SessionPage {
  const p = unwrapPayload(payload);
  return { sessions: parseSessions(payload), hasMore: p?.has_more === true, lastId: str(p?.last_id) };
}

export function parseSessions(payload: unknown): SessionSummary[] {
  const p = unwrapPayload(payload);
  const data = Array.isArray(p?.data) ? p.data : [];
  return data.filter(isObj).flatMap((s) => {
    const id = str(s.id);
    if (!id) return [];
    const updated = Date.parse(str(s.updated_at) ?? str(s.created_at) ?? "");
    return [
      {
        id,
        title: str(s.title)?.trim() || "Session sans titre",
        updatedAt: Number.isFinite(updated) ? updated : 0,
        bucket: (str(s.status_bucket) ?? str(s.session_status) ?? "")
          .replace(/^SESSION_STATUS_(BUCKET_)?/, "")
          .toLowerCase(),
      },
    ];
  });
}

/** Convertit une page de `list_events` en événements du bureau, dans l'ordre. */
export function parseEventPage(payload: unknown): EventPage {
  const p = unwrapPayload(payload);
  const data = Array.isArray(p?.data) ? p.data : [];
  const events: OfficeEvent[] = [];

  data.filter(isObj).forEach((e, i) => {
    const kind = (["user", "assistant", "result"] as const).find((k) => isObj(e[k]));
    if (!kind) return;
    const wrapper = e[kind] as Obj;
    const body = isObj(wrapper.internal_anthropic_catchall) ? wrapper.internal_anthropic_catchall : wrapper;
    const ts = Date.parse(str(body.timestamp) ?? str(e.created_at) ?? "");
    if (!Number.isFinite(ts)) return;
    const uid = str(wrapper.uuid) ?? str(body.uuid) ?? `${ts}-${i}`;
    // Les messages d'un sous-agent portent l'id de l'appel « Agent » qui l'a lancé.
    const parent = str(body.parent_tool_use_id);
    const agentId = parent || undefined;
    const message = isObj(body.message) ? body.message : undefined;
    const content = message?.content;

    if (kind === "result") {
      if (!agentId) events.push({ id: `${uid}:stop`, ts, type: "stop" });
      return;
    }

    if (kind === "user") {
      // Un message relayé (case « Ta demande », autre session) arrive marqué synthétique : c'est quand même une demande.
      const relayed = agentId ? undefined : relayedText(textOf(content) ?? "");
      if (relayed) events.push({ id: `${uid}:prompt`, ts, type: "prompt", text: clip(relayed, MAX_STR) });
      else if (body.isSynthetic === true || body.is_synthetic === true) return;
      if (typeof content === "string") {
        if (!relayed && !agentId && content.trim() && !isSystemPrompt(content))
          events.push({ id: `${uid}:prompt`, ts, type: "prompt", text: clip(content, MAX_STR) });
        return;
      }
      if (!Array.isArray(content)) return;
      const texts: string[] = [];
      content.filter(isObj).forEach((b, j) => {
        if (b.type === "tool_result" && typeof b.tool_use_id === "string") {
          events.push({
            id: `${uid}:end:${j}`,
            ts,
            type: "tool_end",
            toolUseId: b.tool_use_id,
            agentId,
            ok: b.is_error !== true,
            output: clip(textOf(b.content), MAX_OUTPUT),
          });
        } else if (b.type === "text" && typeof b.text === "string") {
          texts.push(b.text);
        }
      });
      const text = texts.join("\n").trim();
      if (!relayed && !agentId && text && !isSystemPrompt(text))
        events.push({ id: `${uid}:prompt`, ts, type: "prompt", text: clip(text, MAX_STR) });
      return;
    }

    // assistant : chaque appel d'outil démarre une tâche
    if (!Array.isArray(content)) return;
    content.filter(isObj).forEach((b, j) => {
      if (b.type !== "tool_use" || typeof b.id !== "string" || typeof b.name !== "string") return;
      events.push({
        id: `${uid}:start:${j}`,
        ts,
        type: "tool_start",
        tool: b.name,
        toolUseId: b.id,
        agentId,
        input: isObj(b.input) ? (trimDeep(b.input) as Obj) : {},
      });
    });
  });

  return {
    events,
    firstId: str(p?.first_id),
    lastId: str(p?.last_id),
    hasMore: p?.has_more === true,
  };
}
