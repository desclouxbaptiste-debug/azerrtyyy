"use client";

import { useEffect, useState } from "react";
import type { OfficeEvent } from "@/lib/office/types";
import { Office, type FeedStatus } from "./office";
import s from "./office.module.css";

const POLL_MS = 1500;

/** Bureau alimenté par le journal local des hooks (`/api/office`). */
export function LocalOffice() {
  const [events, setEvents] = useState<OfficeEvent[]>([]);
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/office", { cache: "no-store" });
        const data = (await res.json()) as { events?: OfficeEvent[] };
        if (!alive) return;
        setEvents(data.events ?? []);
        setReachable(true);
      } catch {
        if (alive) setReachable(false);
      }
    };
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const clear = async () => {
    if (!window.confirm("Vider le journal des agents ?")) return;
    await fetch("/api/office", { method: "DELETE" }).catch(() => {});
    setEvents([]);
  };

  const status: FeedStatus =
    reachable === false
      ? { tone: "error", label: "JOURNAL INJOIGNABLE" }
      : events.length
        ? { tone: "live", label: "EN DIRECT" }
        : { tone: "wait", label: "EN ATTENTE" };

  return (
    <Office
      events={events}
      status={status}
      toolbar={
        events.length > 0 && (
          <button className={s.btn} onClick={clear}>
            🧹 Vider
          </button>
        )
      }
      notice={
        events.length === 0 && (
          <>
            <b>Le bureau attend Claude.</b> Les hooks de <code>.claude/settings.json</code> écrivent chaque requête,
            outil et sous-agent dans <code>.claude/office/events.jsonl</code>. Lance Claude Code dans ce dépôt : les
            robots arrivent dès sa première action.
          </>
        )
      }
    />
  );
}
