"use client";

import { useEffect, useRef, useState } from "react";
import { TRANSCRIPT_KINDS, parseEventPage, parseSessionPage, type SessionSummary } from "@/lib/office/ccr";
import type { OfficeEvent } from "@/lib/office/types";
import { Composer, MAX_REQUEST_BYTES, requestBytes, type SendState } from "./composer";
import { Office, type ConfigStore, type FeedStatus } from "./office";
import s from "./office.module.css";

/**
 * Bureau alimenté par les vraies sessions Claude Code de la personne qui
 * regarde, lues avec son connecteur « Claude Code Remote » (page publiée
 * sur claude.ai, capacité `mcp`). La case « Ta demande » envoie un message
 * à la session regardée (`send_message`).
 */

export const CCR_SERVER = "Claude Code Remote";
/** Où la personne autorise les outils d'un connecteur pour les pages. */
const CONNECTOR_SETTINGS = "https://claude.ai/customize/connectors";
const POLL_MS = 4000;
const SLOW_POLL_MS = 15_000;
const HIDDEN_POLL_MS = 20_000;
const EMPTY_LIST_REFRESH_MS = 30_000;
const MAX_EVENTS = 4000;
/** Toutes les sessions de la personne, par pages de 50 (jusqu'à 200, les plus récentes). */
const SESSIONS_PER_PAGE = 50;
const MAX_SESSION_PAGES = 4;
/** Pages remontées au chargement pour retrouver la demande et les appels « Agent » en cours. */
const MAX_BACKFILL_PAGES = 8;
const SESSION_KEY = "bureau-claude:session";
const DRAFT_KEY = "bureau-claude:draft";

type CallResult = { payload?: unknown };
type Mcp = {
  callTool(server: string, tool: string, input?: unknown, options?: { cache?: false }): Promise<CallResult>;
};
type Permissions = { manage(): Promise<void> };
type Host = { use(name: string): Promise<unknown> };

type Problem = {
  code: string;
  message: string;
  /** Un nouvel essai automatique est prévu (erreur passagère). */
  retrying: boolean;
  action?: "allow" | "manage" | "retry" | "settings";
};

/** Ce qui a déjà été lu d'une session : survit aux nouveaux essais et aux allers-retours entre sessions. */
type Feed = {
  acc: OfficeEvent[];
  seen: Set<string>;
  cursor?: string;
  backfilled: boolean;
  lastSync: number;
};

const host = (): Host | undefined => {
  const c = (globalThis as { claude?: Partial<Host> }).claude;
  return typeof c?.use === "function" ? (c as Host) : undefined;
};

const jitter = () => Math.round(Math.random() * 1000);

function toProblem(e: unknown): Problem & { retryAfterMs: number } {
  const err = (e && typeof e === "object" ? e : {}) as {
    code?: string;
    message?: string;
    retryable?: boolean;
    retryAfterMs?: number;
  };
  const code = err.code ?? "upstream_error";
  const retryAfterMs = typeof err.retryAfterMs === "number" ? err.retryAfterMs : 0;
  const base = { code, retryAfterMs };
  switch (code) {
    case "approval_required":
    case "consent_required":
      return {
        ...base,
        retrying: false,
        action: "allow",
        message: "Le bureau a besoin de ton accord pour lire tes sessions Claude Code.",
      };
    case "not_in_manifest":
      return {
        ...base,
        retrying: false,
        action: "manage",
        message: "L'accès à tes sessions Claude Code est coupé pour cette page. Réactive-le dans ses autorisations.",
      };
    case "server_not_connected":
      return {
        ...base,
        retrying: false,
        action: "retry",
        message:
          "Le connecteur « Claude Code Remote » n'est pas disponible. Ouvre cette page sur claude.ai avec le compte qui utilise Claude Code.",
      };
    case "needs_reauth":
      return {
        ...base,
        retrying: false,
        action: "retry",
        message: "La connexion à Claude Code Remote a expiré. Reconnecte-la dans claude.ai → Paramètres → Connecteurs.",
      };
    case "selection_required":
      return {
        ...base,
        retrying: false,
        action: "retry",
        message: "Plusieurs connecteurs Claude Code Remote existent : choisis lequel utiliser dans claude.ai.",
      };
    case "blocked_by_policy":
      return {
        ...base,
        retrying: false,
        action: "settings",
        message:
          "Les outils du connecteur « Claude Code Remote » sont bloqués pour les pages. Dans les réglages des connecteurs, ouvre « Claude Code Remote » et autorise list_sessions, list_events et send_message, puis réessaie. Si l'option n'est pas proposée, c'est un administrateur de ton organisation qui l'a bloquée.",
      };
    case "not_granted":
    case "capability_disabled":
    case "capability_removed":
      return {
        ...base,
        retrying: false,
        message: "Cette vue ne peut pas lire tes sessions. Ouvre la page sur claude.ai.",
      };
    case "tool_error":
      return {
        ...base,
        retrying: false,
        action: "retry",
        message: `Claude Code Remote a refusé la lecture${err.message ? ` : ${err.message}` : "."}`,
      };
    default:
      return err.retryable === true
        ? { ...base, retrying: true, message: "Claude Code Remote ne répond pas pour le moment. Nouvel essai…" }
        : { ...base, retrying: false, action: "retry", message: "La lecture de tes sessions a échoué." };
  }
}

/** Après l'essai automatique autorisé, une erreur passagère attend un geste de la personne. */
const giveUp = (p: Problem): Problem => ({
  ...p,
  retrying: false,
  action: p.action ?? "retry",
  message: p.retrying ? "Claude Code Remote ne répond toujours pas." : p.message,
});

/**
 * Échec d'un envoi. Un envoi n'est jamais relancé tout seul : sans réponse
 * claire, la demande est peut-être partie, et la renvoyer la doublerait.
 */
function sendFailure(e: unknown): Extract<SendState, { kind: "error" }> {
  const err = (e && typeof e === "object" ? e : {}) as { code?: string; message?: string };
  switch (err.code) {
    case "approval_required":
    case "consent_required":
      return {
        kind: "error",
        message: "claude.ai doit te demander l'accord pour envoyer. Appuie de nouveau sur « Envoyer » et accepte.",
      };
    case "blocked_by_policy":
      return {
        kind: "error",
        message: "L'envoi est bloqué pour les pages : ouvre « Claude Code Remote » dans les réglages des connecteurs et autorise send_message.",
        link: { href: CONNECTOR_SETTINGS, label: "Ouvrir les réglages des connecteurs" },
      };
    case "not_in_manifest":
      return { kind: "error", message: "L'envoi de demandes est coupé pour cette page.", manage: true };
    case "needs_reauth":
      return {
        kind: "error",
        message: "La connexion à Claude Code Remote a expiré. Reconnecte-la dans claude.ai → Paramètres → Connecteurs.",
      };
    case "server_not_connected":
      return { kind: "error", message: "Le connecteur « Claude Code Remote » n'est pas disponible depuis cette page." };
    case "selection_required":
      return {
        kind: "error",
        message: "Plusieurs connecteurs Claude Code Remote existent : choisis lequel utiliser dans claude.ai.",
      };
    case "not_granted":
    case "capability_disabled":
    case "capability_removed":
      return { kind: "error", message: "Cette vue ne peut pas envoyer de demande. Ouvre la page sur claude.ai." };
    case "tool_error":
      return {
        kind: "error",
        message: `La session n'a pas accepté la demande${err.message ? ` : ${err.message.slice(0, 200)}` : "."}`,
      };
    case "bad_request":
      return { kind: "error", message: "La demande n'a pas pu partir (format refusé)." };
    default:
      return {
        kind: "error",
        message:
          "Pas de réponse claire de Claude Code Remote : ta demande est peut-être partie. Regarde le bureau quelques secondes avant de la renvoyer.",
      };
  }
}

/** Sessions où Claude travaille ou attend la personne : en tête de la liste. */
const ACTIVE_BUCKETS = new Set(["working", "running", "blocked"]);

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

/** Session demandée par le lien (`…#session_…`, posé par l'extension « bureau-agents »). */
function linkedSession(): string | null {
  try {
    const hash = window.location.hash.replace(/^#/, "");
    return /^session_[A-Za-z0-9]+$/.test(hash) ? hash : null;
  } catch {
    return null;
  }
}

function readDraft(): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(text: string) {
  try {
    if (text) window.localStorage.setItem(DRAFT_KEY, text);
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // brouillon gardé pour cette visite seulement
  }
}

function pickDefault(list: SessionSummary[]): string | null {
  const linked = linkedSession();
  if (linked && list.some((x) => x.id === linked)) return linked;
  const saved = readSaved();
  if (saved && list.some((x) => x.id === saved)) return saved;
  return (list.find((x) => x.bucket === "working" || x.bucket === "running") ?? list[0])?.id ?? null;
}

const hhmmss = (ts: number) =>
  new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Ajoute des événements sans doublon ; garde les MAX_EVENTS plus récents. */
function addEvents(f: Feed, evs: OfficeEvent[], prepend = false) {
  const fresh = evs.filter((e) => !f.seen.has(e.id));
  if (!fresh.length) return 0;
  fresh.forEach((e) => f.seen.add(e.id));
  f.acc = prepend ? [...fresh, ...f.acc] : [...f.acc, ...fresh];
  if (f.acc.length > MAX_EVENTS) {
    const kept = f.acc.slice(-MAX_EVENTS);
    // La dernière demande reste toujours connue, même dans une longue session.
    const lastPrompt = f.acc.findLast((e) => e.type === "prompt");
    f.acc = lastPrompt && !kept.includes(lastPrompt) ? [lastPrompt, ...kept] : kept;
    f.seen = new Set(f.acc.map((e) => e.id));
  }
  return fresh.length;
}

/** Faut-il remonter plus loin ? Oui tant que la demande ou l'appel « Agent » d'un sous-agent manque. */
function needsOlder(acc: OfficeEvent[]) {
  if (!acc.some((e) => e.type === "prompt")) return true;
  const launched = new Set(acc.filter((e) => e.type === "tool_start" && !e.agentId).map((e) => e.toolUseId));
  return acc.some((e) => e.agentId && !launched.has(e.agentId));
}

export function RemoteOffice({ store }: { store?: ConfigStore }) {
  /** `undefined` tant que la vue n'a pas répondu, `null` si elle ne peut pas appeler de connecteur. */
  const [mcp, setMcp] = useState<Mcp | null | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [listProblem, setListProblem] = useState<Problem | null>(null);
  const [feedProblem, setFeedProblem] = useState<Problem | null>(null);
  const [lastSync, setLastSync] = useState(0);
  const [listRun, setListRun] = useState(0);
  const [feedRun, setFeedRun] = useState(0);
  const [manageHint, setManageHint] = useState(false);
  const [draft, setDraft] = useState(readDraft);
  const [send, setSend] = useState<SendState>({ kind: "idle" });
  /**
   * Un bureau neuf quand une session en remplace une autre (un panneau ouvert ne
   * passe pas de l'une à l'autre) ; pas au premier choix automatique, pour ne pas
   * recréer la case « Ta demande » pendant que la personne écrit.
   */
  const [shown, setShown] = useState<{ id: string | null; key: number }>({ id: null, key: 0 });
  if (shown.id !== sessionId) setShown({ id: sessionId, key: shown.id ? shown.key + 1 : shown.key });
  /** Un envoi à la fois, même si deux gestes arrivent avant le prochain rendu. */
  const sendingRef = useRef(false);
  const feeds = useRef(new Map<string, Feed>());

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
  const listRetried = useRef(false);
  useEffect(() => {
    if (!mcp) return;
    let alive = true;
    let timer = 0;
    (async () => {
      try {
        const first = parseSessionPage(
          (await mcp.callTool(CCR_SERVER, "list_sessions", { limit: SESSIONS_PER_PAGE }, { cache: false })).payload,
        );
        const found = [...first.sessions];
        let page = first;
        try {
          for (let n = 1; n < MAX_SESSION_PAGES && alive && page.hasMore && page.lastId; n++) {
            page = parseSessionPage(
              (
                await mcp.callTool(
                  CCR_SERVER,
                  "list_sessions",
                  { limit: SESSIONS_PER_PAGE, after_id: page.lastId },
                  { cache: false },
                )
              ).payload,
            );
            found.push(...page.sessions);
          }
        } catch {
          // les plus anciennes sont un bonus : on garde ce qui est déjà lu
        }
        const seen = new Set<string>();
        const list = found
          .filter((x) => !seen.has(x.id) && !!seen.add(x.id))
          .sort((a, b) => b.updatedAt - a.updatedAt);
        if (!alive) return;
        listRetried.current = false;
        setSessions(list);
        setListProblem(null);
        setSessionId((cur) => (cur && list.some((x) => x.id === cur) ? cur : pickDefault(list)));
        // Personne au travail pour l'instant : on regarde de temps en temps si une session apparaît.
        if (!list.length) timer = window.setTimeout(() => setListRun((n) => n + 1), EMPTY_LIST_REFRESH_MS);
      } catch (e) {
        if (!alive) return;
        const p = toProblem(e);
        if (p.retrying && !listRetried.current) {
          listRetried.current = true;
          setListProblem(p);
          timer = window.setTimeout(() => setListRun((n) => n + 1), Math.max(p.retryAfterMs, 1500) + jitter());
        } else {
          setListProblem(giveUp(p));
        }
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [mcp, listRun]);

  // 3. Le journal de la session choisie : historique récent, puis nouveautés toutes les 4 s
  useEffect(() => {
    if (!mcp || !sessionId) {
      const id = window.setTimeout(() => setEvents([]), 0);
      return () => window.clearTimeout(id);
    }
    let alive = true;
    let timer = 0;
    let running = false;
    let retried = false;
    let slowUntil = 0;
    let f = feeds.current.get(sessionId);
    if (!f) {
      f = { acc: [], seen: new Set(), backfilled: false, lastSync: 0 };
      feeds.current.set(sessionId, f);
    }
    const feed = f;

    const page = async (input: Record<string, unknown>) => {
      const r = await mcp.callTool(
        CCR_SERVER,
        "list_events",
        { session_id: sessionId, kinds: [...TRANSCRIPT_KINDS], limit: 100, ...input },
        { cache: false },
      );
      return parseEventPage(r.payload);
    };

    const publish = (synced: boolean) => {
      if (!alive) return;
      setEvents(feed.acc);
      if (synced) {
        feed.lastSync = Date.now();
        setLastSync(feed.lastSync);
      }
    };

    /** Page la plus récente, puis remontée (non bloquante) jusqu'à la demande et aux appels « Agent ». */
    const backfill = async () => {
      const latest = await page({});
      addEvents(feed, latest.events);
      feed.cursor = latest.lastId;
      feed.backfilled = true;
      publish(false);
      let older = latest;
      try {
        for (let n = 0; n < MAX_BACKFILL_PAGES && alive && older.hasMore && older.firstId && needsOlder(feed.acc); n++) {
          older = await page({ before_id: older.firstId });
          addEvents(feed, older.events, true);
        }
      } catch {
        // l'historique ancien est un bonus : la suite du direct n'en dépend pas
      }
    };

    /** Nouveautés depuis le curseur. Renvoie true s'il en reste à lire tout de suite. */
    const forward = async () => {
      for (let n = 0; n < 5 && alive; n++) {
        const hadCursor = !!feed.cursor;
        const next = await page(hadCursor ? { after_id: feed.cursor } : {});
        addEvents(feed, next.events);
        if (next.lastId) feed.cursor = next.lastId;
        if (!hadCursor && next.hasMore && next.firstId) {
          // Le journal était vide et s'est rempli d'un coup : on récupère aussi ce qui précède.
          let older = next;
          for (let k = 0; k < MAX_BACKFILL_PAGES && alive && older.hasMore && older.firstId; k++) {
            older = await page({ before_id: older.firstId });
            if (!addEvents(feed, older.events, true)) break;
          }
          return false;
        }
        if (!feed.cursor || !next.hasMore) return false;
      }
      return true;
    };

    const schedule = (ms: number) => {
      window.clearTimeout(timer);
      if (alive) timer = window.setTimeout(tick, ms);
    };

    async function tick() {
      if (!alive || running) return;
      running = true;
      let wait = POLL_MS;
      try {
        let more = false;
        if (!feed.backfilled) await backfill();
        else more = await forward();
        if (!alive) return;
        publish(!more);
        setFeedProblem(null);
        retried = false;
        wait = more ? 0 : Date.now() < slowUntil ? SLOW_POLL_MS : POLL_MS;
      } catch (e) {
        if (!alive) return;
        const p = toProblem(e);
        if (p.code === "rate_limited") slowUntil = Date.now() + 120_000;
        if (p.retrying && !retried) {
          // Un seul essai automatique ; ensuite on attend un geste.
          retried = true;
          setFeedProblem(p);
          wait = Math.max(p.retryAfterMs, POLL_MS * 2) + jitter();
        } else {
          setFeedProblem(giveUp(p));
          timer = 0; // arrêt : seul un geste (Réessayer, Autoriser…) relance la lecture
          return;
        }
      } finally {
        running = false;
      }
      schedule(document.hidden ? Math.max(wait, HIDDEN_POLL_MS) : wait);
    }

    const onVisible = () => {
      if (!document.hidden && timer) schedule(0);
    };
    document.addEventListener("visibilitychange", onVisible);

    // Reprend là où on en était : historique déjà lu affiché tout de suite.
    timer = window.setTimeout(() => {
      setFeedProblem(null);
      setEvents(feed.acc);
      setLastSync(feed.lastSync);
      tick();
    }, 0);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mcp, sessionId, feedRun]);

  const manage = async () => {
    const perms = (await host()?.use("permissions").catch(() => null)) as Permissions | null;
    let opened = false;
    if (perms) {
      try {
        await perms.manage();
        opened = true;
      } catch {
        opened = false;
      }
    }
    setManageHint(!opened);
    if (opened) {
      refreshList();
      setFeedRun((n) => n + 1);
    }
  };

  const current = sessions?.find((x) => x.id === sessionId);
  // Sans liste de sessions, c'est son erreur qui compte ; ensuite, celle du direct.
  const problem = !sessions ? listProblem : (feedProblem ?? listProblem);
  const refreshList = () => {
    listRetried.current = false;
    setListRun((n) => n + 1);
  };
  const retryProblem = () => (!sessions || problem === listProblem ? refreshList() : setFeedRun((n) => n + 1));

  const editDraft = (text: string) => {
    setDraft(text);
    saveDraft(text);
    setSend((st) => (st.kind === "sending" ? st : { kind: "idle" }));
  };

  const sendRequest = async () => {
    const text = draft.trim();
    if (!mcp || !current || !text || sendingRef.current || requestBytes(text) > MAX_REQUEST_BYTES) return;
    sendingRef.current = true;
    const to = current.title;
    setSend({ kind: "sending" });
    try {
      await mcp.callTool(CCR_SERVER, "send_message", { session_id: current.id, message: text }, { cache: false });
      editDraft("");
      setSend({ kind: "sent", at: Date.now(), to });
    } catch (e) {
      setSend(sendFailure(e));
    } finally {
      sendingRef.current = false;
    }
    // Relit tout de suite la session et son statut : la demande y apparaît dès que Claude la prend.
    refreshList();
    setFeedRun((n) => n + 1);
  };

  const sendBlocked =
    mcp === undefined
      ? "Connexion à claude.ai…"
      : mcp === null
        ? "Ouvre cette page sur claude.ai pour écrire à Claude."
        : !sessions
          ? listProblem
            ? "Le bureau doit d'abord pouvoir lire tes sessions (voir le message sous la scène)."
            : "Chargement de tes sessions…"
          : !sessions.length
            ? "Aucune session à qui écrire : lance une session sur claude.ai/code."
            : !current
              ? "Choisis une session dans la liste."
              : undefined;

  const composer = (
    <Composer
      value={draft}
      onChange={editDraft}
      onSend={sendRequest}
      state={send}
      target={current?.title}
      waiting={current?.bucket === "blocked"}
      disabledReason={sendBlocked}
      onManage={manage}
    />
  );

  const status: FeedStatus =
    mcp === undefined
      ? { tone: "wait", label: "CONNEXION…" }
      : mcp === null
        ? { tone: "error", label: "HORS CLAUDE.AI" }
        : problem && !problem.retrying
          ? { tone: "error", label: problem.action === "allow" || problem.action === "manage" || problem.action === "settings" ? "ACCÈS REQUIS" : "ERREUR" }
          : problem
            ? { tone: "wait", label: "RECONNEXION…" }
            : sessions && !sessions.length
              ? { tone: "wait", label: "AUCUNE SESSION" }
              : !sessionId || !lastSync
                ? { tone: "wait", label: "CHARGEMENT…" }
                : { tone: "live", label: "EN DIRECT" };

  const toolbar = mcp ? (
    <>
      {sessions && sessions.length > 0 && (
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
          {[
            { label: "En cours", list: sessions.filter((x) => ACTIVE_BUCKETS.has(x.bucket)) },
            { label: "Autres sessions", list: sessions.filter((x) => !ACTIVE_BUCKETS.has(x.bucket)) },
          ]
            .filter((g) => g.list.length)
            .map((g) => (
              <optgroup key={g.label} label={`${g.label} (${g.list.length})`}>
                {g.list.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                    {BUCKET_LABEL[x.bucket] ? ` — ${BUCKET_LABEL[x.bucket]}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      )}
      <button className={s.btn} onClick={refreshList} title="Recharger la liste des sessions">
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
          <button className={`${s.btn} ${s.btnOn}`} onClick={retryProblem}>
            Autoriser l&apos;accès
          </button>
        )}
        {problem.action === "manage" && (
          <button className={s.btn} onClick={manage}>
            Gérer les autorisations
          </button>
        )}
        {problem.action === "settings" && (
          <>
            <a className={`${s.btn} ${s.btnOn}`} href={CONNECTOR_SETTINGS} target="_blank" rel="noreferrer">
              Ouvrir les réglages des connecteurs
            </a>{" "}
          </>
        )}
        {(problem.action === "retry" || problem.action === "settings") && (
          <button className={s.btn} onClick={retryProblem}>
            Réessayer
          </button>
        )}
        {problem.action === "manage" && manageHint && (
          <span className={s.note}>
            {" "}
            Le panneau ne s&apos;est pas ouvert : utilise le menu Autorisations de cette page sur claude.ai et réactive
            « Claude Code Remote ».
          </span>
        )}
      </>
    );
  } else if (sessions && sessions.length === 0) {
    notice = (
      <>
        <b>Aucune session Claude Code.</b> Lance une session sur claude.ai/code : la liste se met à jour toute seule et
        ses robots apparaîtront ici.
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

  return (
    <Office
      key={shown.key}
      events={events}
      status={status}
      toolbar={toolbar}
      notice={notice}
      composer={composer}
      emptyText={status.tone === "live" ? undefined : null}
      store={store}
    />
  );
}
