"use client";

import { useEffect, useRef, useState } from "react";
import type { OfficeEvent } from "@/lib/office/types";
import { Office, type FeedStatus } from "./office";
import s from "./office.module.css";

const POLL_MS = 1500;
const HIDDEN_POLL_MS = 10_000;

/** Bureau alimenté par le journal local des hooks (`/api/office`). */
export function LocalOffice() {
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [reachable, setReachable] = useState<boolean | null>(null);
  /** Incrémenté à chaque « Vider » : une réponse partie avant est ignorée. */
  const generation = useRef(0);
  /** Change à chaque « Vider » : le bureau repart de zéro (panneaux fermés). */
  const [clears, setClears] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    // Une seule requête à la fois : la suivante part quand la précédente a répondu.
    const poll = async () => {
      const gen = generation.current;
      try {
        const res = await fetch("/api/office", { cache: "no-store" });
        const data = (await res.json()) as { events?: OfficeEvent[] };
        if (!alive || gen !== generation.current) return;
        setEvents(data.events ?? []);
        setReachable(true);
      } catch {
        if (alive) setReachable(false);
      } finally {
        if (alive) timer = window.setTimeout(poll, document.hidden ? HIDDEN_POLL_MS : POLL_MS);
      }
    };
    poll();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  const clear = async () => {
    if (!window.confirm("Vider le journal des agents ?")) return;
    generation.current++;
    setEvents([]);
    setClears((n) => n + 1);
    await fetch("/api/office", { method: "DELETE" }).catch(() => {});
    generation.current++;
  };

  const status: FeedStatus =
    reachable === false
      ? { tone: "error", label: "JOURNAL INJOIGNABLE" }
      : events.length
        ? { tone: "live", label: "EN DIRECT" }
        : { tone: "wait", label: "EN ATTENTE" };

  return (
    <Office
      key={clears}
      events={events}
      status={status}
      emptyText={reachable === false ? null : undefined}
      toolbar={
        events.length > 0 && (
          <button className={s.btn} onClick={clear}>
            🧹 Vider
          </button>
        )
      }
      notice={
        reachable === false ? (
          <>
            <b>Le journal ne répond pas.</b> La page n&apos;arrive pas à lire <code>/api/office</code> : vérifie que le
            serveur Next tourne (<code>npm run dev</code>).
          </>
        ) : (
          events.length === 0 && (
          <>
            <b>Le bureau attend Claude.</b> Les hooks de <code>.claude/settings.json</code> écrivent chaque requête,
            outil et sous-agent dans <code>.claude/office/events.jsonl</code>. Lance Claude Code dans ce dépôt : les
            robots arrivent dès sa première action.
          </>
          )
        )
      }
    />
  );
}
