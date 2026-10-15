"use client";

import type { ZoneDef } from "@/lib/office/layout";
import { currentTask } from "@/lib/office/reduce";
import type { Agent, OfficeState, Task, ZoneId } from "@/lib/office/types";

type Zones = Record<ZoneId, ZoneDef>;
import s from "./office.module.css";

const hhmmss = (ts: number) =>
  new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const duration = (t: Task, now: number) => {
  const ms = (t.end ?? now) - t.start;
  return ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
};

function Status({ t }: { t: Task }) {
  if (t.end === undefined) return <span className={s.run}>⏳ en cours</span>;
  return t.ok === false ? <span className={s.ko}>✗ échec</span> : <span className={s.ok}>✓ fait</span>;
}

function TaskItem({ t, now, who }: { t: Task; now: number; who?: string }) {
  const input = t.input && Object.keys(t.input).length ? JSON.stringify(t.input, null, 2) : undefined;
  return (
    <details className={s.step}>
      <summary>
        <span aria-hidden>{t.icon}</span>
        <span>
          {who && <b>{who} · </b>}
          {t.summary}
        </span>
        <span className={s.time}>{hhmmss(t.start)}</span>
      </summary>
      <div className={s.stepBody}>
        <div>
          <Status t={t} /> · {duration(t, now)} · outil <b>{t.tool}</b>
        </div>
        {t.detail && <div className={s.mono}>{t.detail}</div>}
        {input && (
          <>
            <div style={{ marginTop: 8 }}>Paramètres</div>
            <div className={s.mono}>{input.length > 4000 ? `${input.slice(0, 4000)}…` : input}</div>
          </>
        )}
        {t.output && (
          <>
            <div style={{ marginTop: 8 }}>Résultat</div>
            <div className={s.mono}>{t.output}</div>
          </>
        )}
      </div>
    </details>
  );
}

function Shell({
  avatar,
  color,
  title,
  subtitle,
  onClose,
  children,
}: {
  avatar: string;
  color: string;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className={s.panel} role="dialog" aria-label={title}>
      <div className={s.panelHead}>
        <div className={s.avatar} style={{ background: color }} aria-hidden>
          {avatar}
        </div>
        <div className={s.panelTitle}>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button className={s.btn} onClick={onClose} aria-label="Fermer le panneau">
          ✕
        </button>
      </div>
      <div className={s.panelBody}>{children}</div>
    </aside>
  );
}

export function AgentPanel({
  agent,
  now,
  zones,
  chefName,
  onClose,
}: {
  agent: Agent;
  now: number;
  zones: Zones;
  chefName: string;
  onClose: () => void;
}) {
  const zone = zones[agent.zone];
  const cur = currentTask(agent);
  const history = [...agent.tasks].reverse();
  const done = agent.tasks.filter((t) => t.end !== undefined).length;
  return (
    <Shell
      avatar={agent.kind === "subagent" ? "🛰️" : "🤖"}
      color={zone.accent}
      title={agent.name}
      subtitle={`${agent.role} · zone ${zone.label} · ${agent.busy ? "au travail" : "en pause"} · ${done}/${agent.tasks.length} tâches`}
      onClose={onClose}
    >
      {agent.mission && (
        <div className={s.card}>
          <h3>MISSION CONFIÉE PAR {chefName.toUpperCase()}</h3>
          <p>
            <b>{agent.mission}</b>
          </p>
          {agent.missionDetail && <div className={s.mono}>{agent.missionDetail}</div>}
        </div>
      )}
      {cur && (
        <div className={s.card}>
          <h3>{cur.end === undefined ? "EN CE MOMENT" : "DERNIÈRE TÂCHE"}</h3>
          <p>
            {cur.icon} {cur.summary}
          </p>
          {cur.detail && <div className={s.mono}>{cur.detail}</div>}
        </div>
      )}
      {agent.finalMessage && (
        <div className={s.card}>
          <h3>RAPPORT RENDU</h3>
          <div className={s.mono}>{agent.finalMessage}</div>
        </div>
      )}
      <div className={s.section}>
        <h3>HISTORIQUE ({history.length})</h3>
        <div className={s.timeline}>
          {history.map((t) => (
            <TaskItem key={t.id} t={t} now={now} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

const CHEF_STATUS = {
  idle: "☕ attend une requête",
  thinking: "🧠 réfléchit",
  waiting: "⏳ attend les rapports de l'équipe",
  done: "✅ a répondu",
};

export function ChefPanel({
  office,
  zones,
  onClose,
  onPick,
}: {
  office: OfficeState;
  zones: Zones;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const { chef, now } = office;
  const team = Object.values(office.all).filter((a) => a.tasks.length > 0);
  return (
    <Shell
      avatar="🧑‍💼"
      color="#e8873a"
      title={`${chef.name} — le chef`}
      subtitle={`Claude, l'orchestrateur · ${CHEF_STATUS[chef.status]}`}
      onClose={onClose}
    >
      <div className={s.card}>
        <h3>REQUÊTE EN COURS</h3>
        <p>{chef.currentPrompt ?? "Aucune requête pour l'instant."}</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          Rapports reçus : {chef.reportsDone} / {chef.reportsTotal}
        </p>
      </div>
      <div className={s.section}>
        <h3>L&apos;ÉQUIPE ({team.length})</h3>
        <div className={s.stats}>
          {team.map((a) => (
            <button key={a.key} className={s.btn} onClick={() => onPick(a.key)}>
              <span style={{ color: zones[a.zone].accent }}>■</span> {a.name}
              {a.busy ? " ⏳" : ""}
            </button>
          ))}
        </div>
      </div>
      {chef.tasks.length > 0 && (
        <div className={s.section}>
          <h3>DÉCISIONS DU CHEF</h3>
          <div className={s.timeline}>
            {[...chef.tasks].reverse().map((t) => (
              <TaskItem key={t.id} t={t} now={now} />
            ))}
          </div>
        </div>
      )}
      <div className={s.section}>
        <h3>REQUÊTES REÇUES ({chef.prompts.length})</h3>
        <div className={s.timeline}>
          {[...chef.prompts].reverse().map((p) => (
            <div key={p.ts} className={s.step} style={{ padding: "7px 9px" }}>
              <span className={s.time}>{hhmmss(p.ts)}</span> — {p.text}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function JournalPanel({ office, onClose }: { office: OfficeState; onClose: () => void }) {
  const items = [...office.tasks].reverse().slice(0, 300);
  const nameOf = (key: string) => (key === "chef" ? office.chef.name : office.all[key]?.name ?? "?");
  return (
    <Shell avatar="📜" color="#a99fb8" title="Journal" subtitle={`${office.tasks.length} actions enregistrées`} onClose={onClose}>
      <div className={s.timeline}>
        {items.length === 0 && <p className={s.help}>Rien pour l&apos;instant.</p>}
        {items.map((t) => (
          <TaskItem key={t.id} t={t} now={office.now} who={nameOf(t.agentKey)} />
        ))}
      </div>
    </Shell>
  );
}
