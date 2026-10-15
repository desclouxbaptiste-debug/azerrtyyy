"use client";

import { useEffect, useState } from "react";
import { TRANSCRIPT_KINDS, parseEventPage, parseSessions, type SessionSummary } from "@/lib/office/ccr";
import type { OfficeEvent } from "@/lib/office/types";
import { Office, type ConfigStore, type FeedStatus } from "./office";
import s from "./office.module.css";

/**
 * Bureau alimenté par les vraies sessions Claude Code de la personne qui
 * regarde, lues avec son connecteur « Claude Code Remote » (page publiée
 * sur claude.ai, capacité `mcp`).
 */

export const CCR_SERVER = "Claude Code Remote";
const POLL_MS = 4000;
const HIDDEN_POLL_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_EVENTS = 4000;
const SESSION_KEY = "bureau-claude:session";

type CallResult = { payload?: unknown };
type Mcp = {
  callTool(server: string, tool: string, input?: unknown, options?: { cache?: false }): Promise<CallResult>;
};
type Permissions = { manage(): Promise<void> };
type Host = { use(name: string): Promise<unknown> };

type Problem = {
  code: string;
  message: string;
  /** Le prochain essai se fera tout seul (erreur passagère). */
  retrying: boolean;
  action?: "allow" | "manage" | "retry";
};

const host = (): Host | undefined => {
  const c = (globalThis as { claude?: Partial<Host> }).claude;
  return typeof c?.use === "function" ? (c as Host) : undefined;
};

function toProblem(e: unknown): Problem {
  const err = (e && typeof e === "object" ? e : {}) as { code?: string; message?: string; retryable?: boolean };
  const code = err.code ?? "upstream_error";
  const retrying = err.retryable === true;
  switch (code) {
    case "approval_required":
    case "consent_required":
      return {
        code,
        retrying: false,
        action: "allow",
        message: "Le bureau a besoin de ton accord pour lire tes sessions Claude Code.",
      };
    case "not_in_manifest":
      return {
        code,
        retrying: false,
        action: "manage",
        message: "L'accès à tes sessions Claude Code est coupé pour cette page. Réactive-le dans ses autorisations.",
      };
    case "server_not_connected":
      return {
        code,
        retrying: false,
        action: "retry",
        message:
          "Le connecteur « Claude Code Remote » n'est pas disponible. Ouvre cette page sur claude.ai avec le compte qui utilise Claude Code.",
      };
    case "needs_reauth":
      return {
        code,
        retrying: false,
        action: "retry",
        message: "La connexion à Claude Code Remote a expiré. Reconnecte-la dans claude.ai → Paramètres → Connecteurs.",
      };
    case "selection_required":
      return {
        code,
        retrying: false,
        action: "retry",
        message: "Plusieurs connecteurs Claude Code Remote existent : choisis lequel utiliser dans claude.ai.",
      };
    case "blocked_by_policy":
      return { code, retrying: false, message: "Ton organisation bloque l'accès à Claude Code Remote depuis cette page." };
    case "not_granted":
    case "capability_disabled":
    case "capability_removed":
      return { code, retrying: false, message: "Cette vue ne peut pas lire tes sessions. Ouvre la page sur claude.ai." };
    case "tool_error":
      return {
        code,
        retrying: false,
        action: "retry",
        message: `Claude Code Remote a refusé la lecture${err.message ? ` : ${err.message}` : "."}`,
      };
    default:
      return {
        code,
        retrying,
        action: retrying ? undefined : "retry",
        message: retrying
          ? "Claude Code Remote ne répond pas pour le moment. Nouvel essai automatique…"
          : "La lecture de la session a échoué.",
      };
  }
}

const BUCKET_LABEL: Record<string, string> = {
  working: "au travail",
  running: "au travail",
  blocked: "attend ta réponse",
  review_ready: "à relire",
  completed: "terminée",
  idle: "en pause",
  failed: "en échec",
};

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveChoice(id: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, id);
  } catch {
    // choix gardé pour cette visite seulement
  }
}

function pickDefault(list: SessionSummary[]): string | null {
  const saved = readSaved();
  if (saved && list.some((x) => x.id === saved)) return saved;
  return (list.find((x) => x.bucket === "working" || x.bucket === "running") ?? list[0])?.id ?? null;
}

const hhmmss = (ts: number) =>
  new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function RemoteOffice({ store }: { store?: ConfigStore }) {
  /** `undefined` tant que la vue n'a pas répondu, `null` si elle ne peut pas appeler de connecteur. */
  const [mcp, setMcp] = useState<Mcp | null | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [lastSync, setLastSync] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [listing, setListing] = useState(0);

  // 1. Le connecteur est-il joignable depuis cette vue ?
  useEffect(() => {
    let alive = true;
    const h = host();
    (async () => {
      const m = h ? await h.use("mcp").catch(() => null) : null;
      if (alive) setMcp((m as Mcp | null) ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2. Les sessions de la personne (le premier appel lui demande son accord)
  useEffect(() => {
    if (!mcp) return;
    let alive = true;
    (async () => {
      try {
        const r = await mcp.callTool(CCR_SERVER, "list_sessions", { limit: 20 }, { cache: false });
        const list = parseSessions(r.payload).sort((a, b) => b.updatedAt - a.updatedAt);
        if (!alive) return;
        setSessions(list);
        setProblem(null);
        setSessionId((cur) => (cur && list.some((x) => x.id === cur) ? cur : pickDefault(list)));
      } catch (e) {
        if (alive) setProblem(toProblem(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [mcp, attempt, listing]);

  // 3. Le journal de la session choisie : historique récent, puis nouveautés toutes les 4 s
  useEffect(() => {
    if (!mcp || !sessionId) return;
    let alive = true;
    let timer = 0;
    let delay = POLL_MS;
    let started = false;
    let cursor: string | undefined;
    let acc: OfficeEvent[] = [];
    const seen = new Set<string>();

    const add = (evs: OfficeEvent[], prepend = false) => {
      const fresh = evs.filter((e) => !seen.has(e.id));
      fresh.forEach((e) => seen.add(e.id));
      if (!fresh.length) return;
      acc = prepend ? [...fresh, ...acc] : [...acc, ...fresh];
      if (acc.length > MAX_EVENTS) acc = acc.slice(-MAX_EVENTS);
    };

    const page = async (input: Record<string, unknown>) => {
      const r = await mcp.callTool(
        CCR_SERVER,
        "list_events",
        { session_id: sessionId, kinds: [...TRANSCRIPT_KINDS], limit: 100, ...input },
        { cache: false },
      );
      return parseEventPage(r.payload);
    };

    const backfill = async () => {
      const latest = await page({});
      add(latest.events);
      cursor = latest.lastId;
      // Remonte un peu pour retrouver la dernière demande si elle n'est pas dans la page.
      let older = latest;
      for (let n = 0; n < 3 && alive && older.hasMore && older.firstId && !acc.some((e) => e.type === "prompt"); n++) {
        older = await page({ before_id: older.firstId });
        add(older.events, true);
      }
    };

    const forward = async () => {
      for (let n = 0; n < 5 && alive; n++) {
        const next = await page(cursor ? { after_id: cursor } : {});
        add(next.events);
        if (next.lastId) cursor = next.lastId;
        if (!next.hasMore || !next.lastId) break;
      }
    };

    const tick = async () => {
      try {
        if (!started) {
          setEvents([]);
          await backfill();
          started = true;
        } else {
          await forward();
        }
        if (!alive) return;
        setEvents(acc);
        setProblem(null);
        setLastSync(Date.now());
        delay = POLL_MS;
      } catch (e) {
        if (!alive) return;
        const p = toProblem(e);
        setProblem(p);
        if (!p.retrying) return; // attend un geste : autoriser, réessayer…
        const after = (e as { retryAfterMs?: number }).retryAfterMs ?? 0;
        delay = Math.min(MAX_BACKOFF_MS, Math.max(after, delay * 2)) + Math.round(Math.random() * 1000);
      }
      if (alive) timer = window.setTimeout(tick, document.hidden ? Math.max(delay, HIDDEN_POLL_MS) : delay);
    };

    timer = window.setTimeout(tick, 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [mcp, sessionId, attempt]);

  const manage = async () => {
    const perms = (await host()?.use("permissions").catch(() => null)) as Permissions | null;
    await perms?.manage().catch(() => {});
    setAttempt((n) => n + 1);
  };

  const current = sessions?.find((x) => x.id === sessionId);

  const status: FeedStatus =
    mcp === undefined
      ? { tone: "wait", label: "CONNEXION…" }
      : mcp === null
        ? { tone: "error", label: "HORS CLAUDE.AI" }
        : problem && !problem.retrying
          ? { tone: "error", label: problem.action === "allow" || problem.action === "manage" ? "ACCÈS REQUIS" : "ERREUR" }
          : problem
            ? { tone: "wait", label: "RECONNEXION…" }
            : !sessionId || !lastSync
              ? { tone: "wait", label: "CHARGEMENT…" }
              : { tone: "live", label: "EN DIRECT" };

  const toolbar =
    sessions && sessions.length > 0 ? (
      <>
        <select
          id="session-picker"
          className={s.toolSelect}
          aria-label="Session Claude Code à regarder"
          value={sessionId ?? ""}
          onChange={(e) => {
            saveChoice(e.target.value);
            setSessionId(e.target.value);
          }}
        >
          {sessions.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
              {BUCKET_LABEL[x.bucket] ? ` — ${BUCKET_LABEL[x.bucket]}` : ""}
            </option>
          ))}
        </select>
        <button className={s.btn} onClick={() => setListing((n) => n + 1)} title="Recharger la liste des sessions">
          ↻ Sessions
        </button>
      </>
    ) : null;

  let notice: React.ReactNode;
  if (mcp === null) {
    notice = (
      <>
        <b>Ouvre cette page sur claude.ai.</b> Le bureau lit tes sessions Claude Code avec ton connecteur « Claude Code
        Remote », qui n&apos;est accessible que depuis claude.ai.
      </>
    );
  } else if (problem) {
    notice = (
      <>
        <b>{problem.retrying ? "Connexion perdue." : "Le bureau ne peut pas lire tes sessions."}</b> {problem.message}{" "}
        {problem.action === "allow" && (
          <button className={`${s.btn} ${s.btnOn}`} onClick={() => setAttempt((n) => n + 1)}>
            Autoriser l&apos;accès
          </button>
        )}
        {problem.action === "manage" && (
          <button className={s.btn} onClick={manage}>
            Gérer les autorisations
          </button>
        )}
        {problem.action === "retry" && (
          <button className={s.btn} onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </button>
        )}
      </>
    );
  } else if (sessions && sessions.length === 0) {
    notice = (
      <>
        <b>Aucune session Claude Code.</b> Lance une session sur claude.ai/code : ses robots apparaîtront ici.
      </>
    );
  } else if (current && lastSync) {
    notice = (
      <>
        Session <b>{current.title}</b>
        {BUCKET_LABEL[current.bucket] ? ` (${BUCKET_LABEL[current.bucket]})` : ""} · mise à jour à {hhmmss(lastSync)}{" "}
        · lue via Claude Code Remote
      </>
    );
  }

  return <Office events={events} status={status} toolbar={toolbar} notice={notice} store={store} />;
}
