"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_OPTIONS, demoEvents } from "@/lib/office/demo";
import { CHEF_ANCHOR, CHEF_RUG, SCENE_H, SCENE_W, ZONES, ZONE_BY_ID, toPct } from "@/lib/office/layout";
import { LIVE_OPTIONS, buildOffice, currentTask } from "@/lib/office/reduce";
import type { Agent, OfficeEvent, OfficeState } from "@/lib/office/types";
import { AgentPanel, ChefPanel, JournalPanel } from "./panel";
import { drawBackground, drawFrame, robotPose } from "./scene";
import s from "./office.module.css";

type Mode = "auto" | "live" | "demo";
const POLL_MS = 1500;
const TICK_MS = 250;

function Bubble({
  x,
  y,
  name,
  color,
  icon,
  text,
  compact,
  selected,
  onClick,
}: {
  x: number;
  y: number;
  name: string;
  color: string;
  icon: string;
  text: string;
  compact: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  // Les bulles des bords s'alignent vers l'intérieur pour ne pas sortir du cadre.
  const shift = x < 70 ? 18 : x > SCENE_W - 70 ? 82 : 50;
  return (
    <button
      type="button"
      className={`${s.bubble} ${compact ? s.compact : ""} ${selected ? s.selected : ""}`}
      style={{ ...toPct(x, y), transform: `translate(-${shift}%, -100%)`, ["--tail" as string]: `${shift}%` }}
      onClick={onClick}
      title={`${name} — ${text}`}
    >
      <span className={s.who}>
        <span className={s.swatch} style={{ background: color }} />
        {name}
      </span>
      <span className={s.say}>
        {icon} {text}
      </span>
    </button>
  );
}

export function Office() {
  const [mode, setMode] = useState<Mode>("auto");
  const [live, setLive] = useState<{ events: OfficeEvent[]; ok: boolean }>({ events: [], ok: false });
  const [now, setNow] = useState(0);
  const [origin, setOrigin] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const officeRef = useRef<OfficeState | null>(null);
  const selectedRef = useRef<string | null>(null);

  // Horloge de la scène
  useEffect(() => {
    const start = window.setTimeout(() => {
      setOrigin(Date.now());
      setNow(Date.now());
    }, 0);
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, []);

  // Écoute du journal réel de Claude Code
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/office", { cache: "no-store" });
        const data = (await res.json()) as { events: OfficeEvent[] };
        if (alive) setLive({ events: data.events ?? [], ok: true });
      } catch {
        if (alive) setLive((l) => ({ ...l, ok: false }));
      }
    };
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const usingLive = mode === "live" || (mode === "auto" && live.events.length > 0);

  const office = useMemo(() => {
    if (!now) return null;
    return usingLive
      ? buildOffice(live.events, now, LIVE_OPTIONS)
      : buildOffice(demoEvents(origin, now), now, DEMO_OPTIONS);
  }, [usingLive, live.events, now, origin]);

  useEffect(() => {
    officeRef.current = office;
    selectedRef.current = selected;
  }, [office, selected]);

  // Boucle de rendu pixel art (~12 i/s pour garder l'esprit rétro)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const bg = document.createElement("canvas");
    bg.width = SCENE_W;
    bg.height = SCENE_H;
    drawBackground(bg.getContext("2d")!);
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 80) return;
      last = ts;
      const o = officeRef.current;
      if (o) drawFrame(ctx, bg, o, Date.now(), selectedRef.current);
      else ctx.drawImage(bg, 0, 0);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Échap ferme le panneau
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const seated = useMemo(() => {
    if (!office) return [] as { a: Agent; x: number; y: number }[];
    return office.present
      .map((a) => ({ a, pose: robotPose(a, office.now) }))
      .filter(({ pose }) => pose.mode === "seated")
      .map(({ a, pose }) => ({ a, x: pose.x, y: pose.y }));
  }, [office]);

  // Une grande bulle par zone (le plus récent au travail), les autres en version courte.
  const featured = useMemo(() => {
    const best = new Map<string, { key: string; start: number }>();
    for (const { a } of seated) {
      const t = currentTask(a);
      if (!a.busy || !t) continue;
      const cur = best.get(a.zone);
      if (!cur || t.start > cur.start) best.set(a.zone, { key: a.key, start: t.start });
    }
    return new Set([...best.values()].map((v) => v.key));
  }, [seated]);

  const clearJournal = async () => {
    if (!window.confirm("Vider le journal des agents ?")) return;
    await fetch("/api/office", { method: "DELETE" }).catch(() => {});
    setLive({ events: [], ok: true });
  };

  const running = office?.tasks.filter((t) => t.end === undefined).length ?? 0;
  const done = office?.tasks.filter((t) => t.end !== undefined).length ?? 0;
  const chef = office?.chef;
  const chefText =
    !chef || chef.status === "idle"
      ? { icon: "☕", text: "J'attends une requête" }
      : chef.status === "waiting"
        ? {
            icon: "⏳",
            text: `J'attends l'équipe : ${chef.reportsDone} rapport${chef.reportsDone > 1 ? "s" : ""} sur ${chef.reportsTotal}`,
          }
        : chef.status === "done"
          ? { icon: "✅", text: "Réponse envoyée !" }
          : { icon: "🧠", text: "Je réfléchis à la demande…" };

  const selectedAgent = selected && selected !== "chef" && selected !== "journal" ? office?.all[selected] : undefined;

  return (
    <div className={s.page}>
      <div className={s.shell}>
        <header className={s.hud}>
          <h1 className={s.title}>
            LE BUREAU DE CLAUDE
            <small>Clique sur un robot ou une bulle pour voir son travail</small>
          </h1>
          <div className={s.controls}>
            <span className={s.pill} style={{ color: usingLive ? "#7ef0b0" : "#ffb070" }}>
              <span className={s.dot} />
              {usingLive ? "EN DIRECT" : "DÉMO"}
            </span>
            <div className={s.stats}>
              <span className={s.pill}>🤖 {office?.present.length ?? 0} au bureau</span>
              <span className={s.pill}>⏳ {running} en cours</span>
              <span className={s.pill}>✅ {done} faites</span>
            </div>
          </div>
        </header>

        <div className={s.controls}>
          {(
            [
              ["auto", "Auto"],
              ["live", "Direct"],
              ["demo", "Démo"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              className={`${s.btn} ${mode === m ? s.btnOn : ""}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {label}
            </button>
          ))}
          <button className={s.btn} onClick={() => setSelected("journal")}>
            📜 Journal
          </button>
          {usingLive && (
            <button className={s.btn} onClick={clearJournal}>
              🧹 Vider
            </button>
          )}
        </div>

        <button className={s.request} onClick={() => setSelected("chef")}>
          <b>REQUÊTE ▸</b>
          <span>{chef?.currentPrompt ?? "En attente de ta prochaine demande…"}</span>
        </button>

        <div className={s.frame}>
          <div className={s.stage}>
            <canvas
              ref={canvasRef}
              className={s.canvas}
              width={SCENE_W}
              height={SCENE_H}
              role="img"
              aria-label="Bureau en pixel art : le chef au centre, les robots répartis dans les zones recherche, code, design, action et analyse"
            />

            {ZONES.map((z) => (
              <span key={z.id} className={s.label} style={toPct(z.x + 3, z.y + 3)}>
                {z.label}
              </span>
            ))}
            <span
              className={`${s.label} ${s.chefLabel}`}
              style={toPct(CHEF_RUG.x + 8, CHEF_RUG.y + CHEF_RUG.h - 13)}
            >
              CHEF
            </span>

            {seated.map(({ a, x, y }) => (
              <button
                key={`hit-${a.key}`}
                type="button"
                className={s.hit}
                style={toPct(x, y)}
                aria-label={`Voir le travail de ${a.name}`}
                onClick={() => setSelected(a.key)}
              />
            ))}
            <button
              type="button"
              className={s.hit}
              style={toPct(CHEF_ANCHOR.x, CHEF_ANCHOR.y)}
              aria-label="Voir le travail du chef"
              onClick={() => setSelected("chef")}
            />

            {seated.map(({ a, x, y }) => {
              // Robot au repos : pas de bulle (sauf s'il est sélectionné), on clique sur lui.
              if (!a.busy && selected !== a.key) return null;
              const t = currentTask(a);
              const zone = ZONE_BY_ID[a.zone];
              const big = featured.has(a.key) || selected === a.key;
              const text = a.busy ? t?.summary ?? "Au travail" : `Terminé${t ? ` : ${t.summary}` : ""}`;
              return (
                <Bubble
                  key={a.key}
                  x={x}
                  y={y - 8}
                  name={a.name}
                  color={zone.accent}
                  icon={a.busy ? t?.icon ?? "⚙️" : "✅"}
                  text={text}
                  compact={!big}
                  selected={selected === a.key}
                  onClick={() => setSelected(a.key)}
                />
              );
            })}

            {office && (
              <Bubble
                x={CHEF_ANCHOR.x}
                y={CHEF_ANCHOR.y - 6}
                name={office.chef.name}
                color="#e8873a"
                icon={chefText.icon}
                text={chefText.text}
                compact={false}
                selected={selected === "chef"}
                onClick={() => setSelected("chef")}
              />
            )}

            {mode === "live" && live.events.length === 0 && (
              <div className={s.empty}>Aucune activité enregistrée pour l&apos;instant</div>
            )}
          </div>
        </div>

        {!usingLive && (
          <div className={s.help}>
            <b>Mode démo.</b> Le bureau rejoue un scénario en attendant de vraies tâches. Pour le brancher sur
            Claude Code, lance <code>npm run dev</code> dans ce dépôt puis ouvre <code>/bureau</code> : les hooks
            de <code>.claude/settings.json</code> écrivent chaque requête, outil et sous-agent dans{" "}
            <code>.claude/office/events.jsonl</code>, et le bureau passe tout seul en <b>direct</b>.
          </div>
        )}
      </div>

      {selectedAgent && <AgentPanel agent={selectedAgent} now={now} onClose={() => setSelected(null)} />}
      {selected === "chef" && office && (
        <ChefPanel office={office} onClose={() => setSelected(null)} onPick={setSelected} />
      )}
      {selected === "journal" && office && <JournalPanel office={office} onClose={() => setSelected(null)} />}
    </div>
  );
}
