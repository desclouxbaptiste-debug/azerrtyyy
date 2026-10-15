"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_OPTIONS, demoEvents } from "@/lib/office/demo";
import {
  DECOR_META,
  DEFAULT_CONFIG,
  SCENE_H,
  SCENE_W,
  clampChef,
  clampDecor,
  clampZone,
  geometry,
  rectPct,
  sanitizeConfig,
  toPct,
  type OfficeConfig,
} from "@/lib/office/layout";
import { LIVE_OPTIONS, buildOffice, currentTask } from "@/lib/office/reduce";
import type { Agent, OfficeEvent, OfficeState } from "@/lib/office/types";
import { Atelier, type Change, type SaveState, type Selection } from "./atelier";
import { AgentPanel, ChefPanel, JournalPanel } from "./panel";
import { drawBackground, drawFrame, robotPose } from "./scene";
import s from "./office.module.css";

type Mode = "auto" | "live" | "demo";
const POLL_MS = 1500;
const TICK_MS = 250;
const LOCAL_KEY = "bureau-claude:layout";

/** Où la mise en page est enregistrée au-delà de l'appareil (ex. la base de l'artefact). */
export type ConfigStore = {
  load(): Promise<{ config: unknown; savedAt: number } | null>;
  save(config: OfficeConfig): Promise<void>;
  saveLabel: string;
};

function readLocal(): { config: unknown; savedAt: number } | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(config: OfficeConfig) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify({ config, savedAt: Date.now() }));
  } catch {
    // stockage indisponible (navigation privée…) : la mise en page reste en mémoire
  }
}

function moveSelection(c: OfficeConfig, sel: NonNullable<Selection>, x: number, y: number): OfficeConfig {
  if (sel.kind === "chef") return { ...c, chef: clampChef(x, y) };
  if (sel.kind === "zone")
    return { ...c, zones: c.zones.map((z) => (z.id === sel.id ? { ...z, ...clampZone(z.id, x, y) } : z)) };
  return { ...c, decor: c.decor.map((d) => (d.id === sel.id ? { ...d, ...clampDecor(d.id, x, y) } : d)) };
}

function positionOf(c: OfficeConfig, sel: NonNullable<Selection>) {
  if (sel.kind === "chef") return c.chef;
  if (sel.kind === "zone") return c.zones.find((z) => z.id === sel.id)!;
  return c.decor.find((d) => d.id === sel.id)!;
}

const selKey = (sel: Selection) => (!sel ? "" : sel.kind === "chef" ? "chef" : `${sel.kind}:${sel.id}`);

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

export function Office({ standalone = false, store }: { standalone?: boolean; store?: ConfigStore }) {
  const [mode, setMode] = useState<Mode>(standalone ? "demo" : "auto");
  const [live, setLive] = useState<{ events: OfficeEvent[]; ok: boolean }>({ events: [], ok: false });
  const [now, setNow] = useState(0);
  const [origin, setOrigin] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  // Mise en page et mode « Aménager »
  const [config, setConfig] = useState<OfficeConfig>(DEFAULT_CONFIG);
  const [editing, setEditing] = useState(false);
  const [editSel, setEditSel] = useState<Selection>(null);
  const [undoCount, setUndoCount] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const configRef = useRef(config);
  const undoRef = useRef<OfficeConfig[]>([]);
  const lastChange = useRef({ key: "", at: 0 });
  const loadedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<OfficeState | null>(null);
  const selectedRef = useRef<string | null>(null);
  const geoRef = useRef(geometry(DEFAULT_CONFIG));
  const editingRef = useRef(false);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const drag = useRef<{
    sel: NonNullable<Selection>;
    x0: number;
    y0: number;
    ox: number;
    oy: number;
    scale: number;
    id: number;
  } | null>(null);
  const dragCount = useRef(0);

  const geo = useMemo(() => geometry(config), [config]);

  /** Applique une modification ; les changements rapprochés d'un même réglage forment une seule étape d'annulation. */
  const change: Change = useCallback((fn, key) => {
    const prev = configRef.current;
    const t = Date.now();
    if (key !== lastChange.current.key || t - lastChange.current.at > 800) {
      undoRef.current = [...undoRef.current.slice(-49), prev];
      setUndoCount(undoRef.current.length);
    }
    lastChange.current = { key, at: t };
    const next = fn(prev);
    configRef.current = next;
    setConfig(next);
  }, []);

  const move = useCallback(
    (sel: NonNullable<Selection>, x: number, y: number, key: string) =>
      change((c) => moveSelection(c, sel, x, y), key),
    [change],
  );

  const undo = () => {
    const prev = undoRef.current.pop();
    setUndoCount(undoRef.current.length);
    if (!prev) return;
    lastChange.current = { key: "", at: 0 };
    configRef.current = prev;
    setConfig(prev);
  };

  // Charge la mise en page : la plus récente entre cet appareil et l'enregistrement partagé.
  useEffect(() => {
    let alive = true;
    const apply = (raw: unknown) => {
      const c = sanitizeConfig(raw);
      configRef.current = c;
      setConfig(c);
    };
    (async () => {
      await Promise.resolve();
      const local = readLocal();
      if (!alive) return;
      if (local) apply(local.config);
      loadedRef.current = true;
      // L'enregistrement partagé peut répondre plus tard : il ne remplace la mise en page
      // que s'il est plus récent et que rien n'a été modifié entre-temps.
      const remote = store ? await store.load().catch(() => null) : null;
      if (alive && remote && (!local || remote.savedAt > local.savedAt) && undoRef.current.length === 0) {
        apply(remote.config);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store]);

  // Garde chaque modification sur l'appareil
  useEffect(() => {
    if (!loadedRef.current) return;
    const id = window.setTimeout(() => writeLocal(config), 400);
    return () => window.clearTimeout(id);
  }, [config]);

  const saveShared = async () => {
    if (!store) return;
    setSaveState({ status: "saving" });
    try {
      await store.save(configRef.current);
      setSaveState({ status: "saved", at: Date.now() });
    } catch (e) {
      setSaveState({
        status: "error",
        message:
          e instanceof Error && e.message
            ? e.message
            : "L'enregistrement n'a pas abouti. Vérifie ta connexion puis réessaie.",
      });
    }
  };

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
    if (standalone) return;
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
  }, [standalone]);

  const usingLive = !standalone && (mode === "live" || (mode === "auto" && live.events.length > 0));

  const office = useMemo(() => {
    if (!now) return null;
    return usingLive
      ? buildOffice(live.events, now, LIVE_OPTIONS, geo)
      : buildOffice(demoEvents(origin, now), now, DEMO_OPTIONS, geo);
  }, [usingLive, live.events, now, origin, geo]);

  useEffect(() => {
    officeRef.current = office;
    selectedRef.current = selected;
    editingRef.current = editing;
  }, [office, selected, editing]);

  // Le fond (sol, murs, meubles) est redessiné à chaque changement de mise en page.
  useEffect(() => {
    geoRef.current = geo;
    const bg = bgRef.current ?? document.createElement("canvas");
    bg.width = SCENE_W;
    bg.height = SCENE_H;
    drawBackground(bg.getContext("2d")!, geo);
    bgRef.current = bg;
  }, [geo]);

  // Boucle de rendu pixel art (~12 i/s pour garder l'esprit rétro)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 80) return;
      last = ts;
      const o = officeRef.current;
      const bg = bgRef.current;
      if (!bg) return;
      if (o) drawFrame(ctx, bg, o, Date.now(), selectedRef.current, geoRef.current, editingRef.current);
      else ctx.drawImage(bg, 0, 0);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Clavier : Échap ferme, les flèches déplacent l'élément choisi en mode « Aménager »
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setEditSel(null);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!editing || !editSel || target?.closest("input, textarea, select")) return;
      const step = e.shiftKey ? 8 : 1;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
        e.key
      ];
      if (!delta) return;
      e.preventDefault();
      const p = positionOf(configRef.current, editSel);
      move(editSel, p.x + delta[0], p.y + delta[1], `nudge:${selKey(editSel)}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, editSel, move]);

  const startDrag = (e: React.PointerEvent<HTMLElement>, sel: NonNullable<Selection>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = positionOf(configRef.current, sel);
    drag.current = {
      sel,
      x0: e.clientX,
      y0: e.clientY,
      ox: p.x,
      oy: p.y,
      scale: rect.width / SCENE_W,
      id: ++dragCount.current,
    };
    setEditSel(sel);
  };

  const onDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = Math.round((e.clientX - d.x0) / d.scale);
    const dy = Math.round((e.clientY - d.y0) / d.scale);
    const p = positionOf(configRef.current, d.sel);
    if (p.x === d.ox + dx && p.y === d.oy + dy) return;
    move(d.sel, d.ox + dx, d.oy + dy, `drag:${d.id}`);
  };

  const endDrag = () => {
    drag.current = null;
  };

  const seated = useMemo(() => {
    if (!office) return [] as { a: Agent; x: number; y: number }[];
    return office.present
      .map((a) => ({ a, pose: robotPose(a, office.now, geo) }))
      .filter(({ pose }) => pose.mode === "seated")
      .map(({ a, pose }) => ({ a, x: pose.x, y: pose.y }));
  }, [office, geo]);

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

  const openEditor = () => {
    setSelected(null);
    setEditing(true);
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
  const editKey = selKey(editSel);
  const { anchor: chefAnchor, rug: chefRug } = geo.chef;

  return (
    <div className={`${s.page} ${editing ? s.isEditing : ""}`}>
      <div className={s.shell}>
        <header className={s.hud}>
          <h1 className={s.title}>
            {config.title}
            <small>
              {editing
                ? "Mode Aménager : fais glisser les éléments de la scène"
                : "Clique sur un robot ou une bulle pour voir son travail"}
            </small>
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
          {!standalone &&
            (
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
          <button
            className={`${s.btn} ${editing ? s.btnOn : ""}`}
            onClick={() => (editing ? setEditing(false) : openEditor())}
            aria-pressed={editing}
          >
            ✏️ Aménager
          </button>
          <button className={s.btn} onClick={() => setSelected("journal")} disabled={editing}>
            📜 Journal
          </button>
          {usingLive && (
            <button className={s.btn} onClick={clearJournal}>
              🧹 Vider
            </button>
          )}
        </div>

        <button className={s.request} onClick={() => setSelected("chef")} disabled={editing}>
          <b>REQUÊTE ▸</b>
          <span>{chef?.currentPrompt ?? "En attente de ta prochaine demande…"}</span>
        </button>

        <div className={s.frame}>
          <div className={`${s.stage} ${editing ? s.stageEditing : ""}`} ref={stageRef}>
            <canvas
              ref={canvasRef}
              className={s.canvas}
              width={SCENE_W}
              height={SCENE_H}
              role="img"
              aria-label="Bureau en pixel art : le chef au centre, les robots répartis dans les zones recherche, code, design, action et analyse"
            />

            {geo.zones.map((z) => (
              <span key={z.id} className={s.label} style={toPct(z.x + 3, z.y + 3)}>
                {z.label}
              </span>
            ))}
            <span className={`${s.label} ${s.chefLabel}`} style={toPct(chefRug.x + 8, chefRug.y + chefRug.h - 13)}>
              CHEF
            </span>

            {!editing &&
              seated.map(({ a, x, y }) => (
                <button
                  key={`hit-${a.key}`}
                  type="button"
                  className={s.hit}
                  style={toPct(x, y)}
                  aria-label={`Voir le travail de ${a.name}`}
                  onClick={() => setSelected(a.key)}
                />
              ))}
            {!editing && (
              <button
                type="button"
                className={s.hit}
                style={toPct(chefAnchor.x, chefAnchor.y)}
                aria-label="Voir le travail du chef"
                onClick={() => setSelected("chef")}
              />
            )}

            {seated.map(({ a, x, y }) => {
              // Robot au repos : pas de bulle (sauf s'il est sélectionné), on clique sur lui.
              if (!a.busy && selected !== a.key) return null;
              const t = currentTask(a);
              const zone = geo.byId[a.zone];
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
                x={chefAnchor.x}
                y={chefAnchor.y - 6}
                name={office.chef.name}
                color="#e8873a"
                icon={chefText.icon}
                text={chefText.text}
                compact={false}
                selected={selected === "chef"}
                onClick={() => setSelected("chef")}
              />
            )}

            {editing && (
              <div className={s.editLayer}>
                {geo.zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    className={`${s.handle} ${editKey === `zone:${z.id}` ? s.handleOn : ""}`}
                    style={rectPct(z)}
                    aria-label={`Zone ${z.label}`}
                    onPointerDown={(e) => startDrag(e, { kind: "zone", id: z.id })}
                    onPointerMove={onDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    {editKey === `zone:${z.id}` && <span className={s.handleTag}>{z.label}</span>}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${s.handle} ${editKey === "chef" ? s.handleOn : ""}`}
                  style={rectPct(chefRug)}
                  aria-label="Bureau du chef"
                  onPointerDown={(e) => startDrag(e, { kind: "chef" })}
                  onPointerMove={onDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {editKey === "chef" && <span className={s.handleTag}>Bureau du chef</span>}
                </button>
                {config.decor
                  .filter((d) => d.visible)
                  .map((d) => {
                    const b = DECOR_META[d.id].box;
                    const on = editKey === `decor:${d.id}`;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`${s.handle} ${s.handleDecor} ${on ? s.handleOn : ""}`}
                        style={rectPct({ x: d.x + b.x, y: d.y + b.y, w: b.w, h: b.h })}
                        aria-label={DECOR_META[d.id].label}
                        onPointerDown={(e) => startDrag(e, { kind: "decor", id: d.id })}
                        onPointerMove={onDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      >
                        {on && <span className={s.handleTag}>{DECOR_META[d.id].label}</span>}
                      </button>
                    );
                  })}
              </div>
            )}

            {mode === "live" && live.events.length === 0 && (
              <div className={s.empty}>Aucune activité enregistrée pour l&apos;instant</div>
            )}
          </div>
        </div>

        {!usingLive && !editing && (
          <div className={s.help}>
            {standalone ? (
              <>
                <b>Version démo.</b> Les robots rejouent un scénario de travail. Touche <b>✏️ Aménager</b> pour
                déplacer les zones et les meubles, renommer les robots ou changer les couleurs, puis{" "}
                <b>Enregistrer pour Claude</b> : Claude pourra installer ta mise en page dans le vrai bureau du projet.
              </>
            ) : (
              <>
                <b>Mode démo.</b> Le bureau rejoue un scénario en attendant de vraies tâches. Pour le brancher sur
                Claude Code, lance <code>npm run dev</code> dans ce dépôt puis ouvre <code>/bureau</code> : les hooks
                de <code>.claude/settings.json</code> écrivent chaque requête, outil et sous-agent dans{" "}
                <code>.claude/office/events.jsonl</code>, et le bureau passe tout seul en <b>direct</b>.
              </>
            )}
          </div>
        )}
      </div>

      {editing && (
        <Atelier
          config={config}
          sel={editSel}
          setSel={setEditSel}
          change={change}
          move={move}
          canUndo={undoCount > 0}
          undo={undo}
          reset={() => change(() => DEFAULT_CONFIG, "reset")}
          onClose={() => {
            setEditing(false);
            setEditSel(null);
          }}
          save={store ? saveShared : undefined}
          saveState={saveState}
          saveLabel={store?.saveLabel}
        />
      )}
      {!editing && selectedAgent && (
        <AgentPanel
          agent={selectedAgent}
          now={now}
          zones={geo.byId}
          chefName={config.chefName}
          onClose={() => setSelected(null)}
        />
      )}
      {!editing && selected === "chef" && office && (
        <ChefPanel office={office} zones={geo.byId} onClose={() => setSelected(null)} onPick={setSelected} />
      )}
      {!editing && selected === "journal" && office && (
        <JournalPanel office={office} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
