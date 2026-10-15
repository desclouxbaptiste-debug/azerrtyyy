"use client";

import { useState } from "react";
import {
  DECOR_IDS,
  DECOR_META,
  DEFAULT_CONFIG,
  sanitizeConfig,
  type DecorId,
  type OfficeConfig,
  type ZoneConfig,
} from "@/lib/office/layout";
import type { ZoneId } from "@/lib/office/types";
import s from "./office.module.css";

export type Selection = { kind: "zone"; id: ZoneId } | { kind: "decor"; id: DecorId } | { kind: "chef" } | null;

export type Change = (fn: (c: OfficeConfig) => OfficeConfig, key: string) => void;

export type SaveState = { status: "idle" | "saving" | "saved" | "error"; at?: number; message?: string };

const AMBIANCES: { name: string; wall: string; floor: string }[] = [
  { name: "Nuit", wall: DEFAULT_CONFIG.wall, floor: DEFAULT_CONFIG.floor },
  { name: "Loft", wall: "#3b3a46", floor: "#5a3f2c" },
  { name: "Néon", wall: "#1b1036", floor: "#1d1530" },
  { name: "Jardin", wall: "#26382c", floor: "#3a3122" },
];

const hhmm = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label className={s.field} htmlFor={id}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Position({
  idPrefix,
  x,
  y,
  onChange,
}: {
  idPrefix: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  return (
    <div className={s.row2}>
      <Field id={`${idPrefix}-x`} label="Position X">
        <input
          id={`${idPrefix}-x`}
          className={s.input}
          type="number"
          value={x}
          onChange={(e) => onChange(Number(e.target.value), y)}
        />
      </Field>
      <Field id={`${idPrefix}-y`} label="Position Y">
        <input
          id={`${idPrefix}-y`}
          className={s.input}
          type="number"
          value={y}
          onChange={(e) => onChange(x, Number(e.target.value))}
        />
      </Field>
    </div>
  );
}

export function Atelier({
  config,
  sel,
  setSel,
  change,
  move,
  canUndo,
  undo,
  reset,
  onClose,
  save,
  saveState,
  saveLabel,
}: {
  config: OfficeConfig;
  sel: Selection;
  setSel: (s: Selection) => void;
  change: Change;
  move: (sel: NonNullable<Selection>, x: number, y: number, key: string) => void;
  canUndo: boolean;
  undo: () => void;
  reset: () => void;
  onClose: () => void;
  save?: () => void;
  saveState: SaveState;
  saveLabel?: string;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState("");

  const zone = sel?.kind === "zone" ? config.zones.find((z) => z.id === sel.id) : undefined;
  const decor = sel?.kind === "decor" ? config.decor.find((d) => d.id === sel.id) : undefined;

  const setZone = (id: ZoneId, patch: Partial<ZoneConfig>, key: string) =>
    change((c) => ({ ...c, zones: c.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }), key);
  const setDecorVisible = (id: DecorId, visible: boolean) =>
    change((c) => ({ ...c, decor: c.decor.map((d) => (d.id === id ? { ...d, visible } : d)) }), `vis:${id}`);

  const copyCode = async () => {
    const json = JSON.stringify(config);
    setCode(json);
    try {
      await navigator.clipboard.writeText(json);
      setCodeMsg("Code copié. Colle-le dans la conversation avec Claude.");
    } catch {
      setCodeMsg("Copie automatique refusée : sélectionne le code ci-dessous et copie-le.");
    }
  };

  const applyCode = () => {
    try {
      const next = sanitizeConfig(JSON.parse(code));
      change(() => next, "import");
      setCodeMsg("Mise en page appliquée.");
    } catch {
      setCodeMsg("Ce code n'est pas une mise en page valide. Recopie-le en entier.");
    }
  };

  return (
    <aside className={`${s.panel} ${s.atelier}`} aria-label="Atelier d'aménagement">
      <div className={s.panelHead}>
        <div className={s.avatar} style={{ background: "#ffb070" }} aria-hidden>
          🛠️
        </div>
        <div className={s.panelTitle}>
          <h2>Atelier</h2>
          <p>Fais glisser une zone, un meuble ou le bureau du chef. Touche-le pour le modifier.</p>
        </div>
        <button className={`${s.btn} ${s.btnOn}`} onClick={onClose}>
          Terminer
        </button>
      </div>

      <div className={s.panelBody}>
        <div className={s.toolbar}>
          <button className={s.btn} onClick={undo} disabled={!canUndo}>
            ↶ Annuler
          </button>
          {confirmReset ? (
            <>
              <button
                className={`${s.btn} ${s.btnDanger}`}
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                }}
              >
                Oui, tout remettre
              </button>
              <button className={s.btn} onClick={() => setConfirmReset(false)}>
                Non
              </button>
            </>
          ) : (
            <button className={s.btn} onClick={() => setConfirmReset(true)}>
              Remettre le bureau d&apos;origine
            </button>
          )}
        </div>

        {/* ---- Élément sélectionné ---- */}
        <section className={s.card}>
          {!sel && (
            <>
              <h3>RIEN DE SÉLECTIONNÉ</h3>
              <p>Touche une zone colorée, un meuble ou le bureau du chef dans la scène pour le régler ici.</p>
            </>
          )}

          {zone && (
            <div className={s.form}>
              <h3>ZONE {zone.label}</h3>
              <Field id="zone-label" label="Nom de la zone">
                <input
                  id="zone-label"
                  className={s.input}
                  maxLength={14}
                  value={zone.label}
                  onChange={(e) => setZone(zone.id, { label: e.target.value.toUpperCase() }, `label:${zone.id}`)}
                />
              </Field>
              <Field id="zone-role" label="Métier des robots">
                <input
                  id="zone-role"
                  className={s.input}
                  maxLength={20}
                  value={zone.role}
                  onChange={(e) => setZone(zone.id, { role: e.target.value }, `role:${zone.id}`)}
                />
              </Field>
              <div className={s.row2}>
                <Field id="zone-rug" label="Tapis">
                  <input
                    id="zone-rug"
                    className={s.color}
                    type="color"
                    value={zone.rug}
                    onChange={(e) => setZone(zone.id, { rug: e.target.value }, `rug:${zone.id}`)}
                  />
                </Field>
                <Field id="zone-accent" label="Lumières">
                  <input
                    id="zone-accent"
                    className={s.color}
                    type="color"
                    value={zone.accent}
                    onChange={(e) => setZone(zone.id, { accent: e.target.value }, `accent:${zone.id}`)}
                  />
                </Field>
              </div>
              <div className={s.row3}>
                {zone.names.map((n, i) => (
                  <Field key={i} id={`zone-name-${i}`} label={`Robot ${i + 1}`}>
                    <input
                      id={`zone-name-${i}`}
                      className={s.input}
                      maxLength={12}
                      value={n}
                      onChange={(e) => {
                        const names = [...zone.names] as ZoneConfig["names"];
                        names[i] = e.target.value;
                        setZone(zone.id, { names }, `name:${zone.id}:${i}`);
                      }}
                    />
                  </Field>
                ))}
              </div>
              <Position
                idPrefix="zone"
                x={zone.x}
                y={zone.y}
                onChange={(x, y) => move({ kind: "zone", id: zone.id }, x, y, `pos:${zone.id}`)}
              />
            </div>
          )}

          {decor && (
            <div className={s.form}>
              <h3>{DECOR_META[decor.id].label.toUpperCase()}</h3>
              <Position
                idPrefix="decor"
                x={decor.x}
                y={decor.y}
                onChange={(x, y) => move({ kind: "decor", id: decor.id }, x, y, `pos:${decor.id}`)}
              />
              {decor.id === "paillasson" && <p className={s.note}>Les robots entrent et sortent par cette porte.</p>}
              <button
                className={s.btn}
                onClick={() => {
                  setDecorVisible(decor.id, false);
                  setSel(null);
                }}
              >
                Retirer du bureau
              </button>
            </div>
          )}

          {sel?.kind === "chef" && (
            <div className={s.form}>
              <h3>BUREAU DU CHEF</h3>
              <Field id="chef-name" label="Nom du chef">
                <input
                  id="chef-name"
                  className={s.input}
                  maxLength={14}
                  value={config.chefName}
                  onChange={(e) => change((c) => ({ ...c, chefName: e.target.value }), "chefName")}
                />
              </Field>
              <Position
                idPrefix="chef"
                x={config.chef.x}
                y={config.chef.y}
                onChange={(x, y) => move({ kind: "chef" }, x, y, "pos:chef")}
              />
            </div>
          )}
        </section>

        {/* ---- Ambiance générale ---- */}
        <section className={s.section}>
          <h3>AMBIANCE</h3>
          <div className={s.form}>
            <Field id="office-title" label="Nom du bureau">
              <input
                id="office-title"
                className={s.input}
                maxLength={40}
                value={config.title}
                onChange={(e) => change((c) => ({ ...c, title: e.target.value }), "title")}
              />
            </Field>
            <div className={s.row2}>
              <Field id="office-wall" label="Murs">
                <input
                  id="office-wall"
                  className={s.color}
                  type="color"
                  value={config.wall}
                  onChange={(e) => change((c) => ({ ...c, wall: e.target.value }), "wall")}
                />
              </Field>
              <Field id="office-floor" label="Sol">
                <input
                  id="office-floor"
                  className={s.color}
                  type="color"
                  value={config.floor}
                  onChange={(e) => change((c) => ({ ...c, floor: e.target.value }), "floor")}
                />
              </Field>
            </div>
            <div className={s.chips}>
              {AMBIANCES.map((a) => (
                <button
                  key={a.name}
                  className={s.btn}
                  onClick={() => change((c) => ({ ...c, wall: a.wall, floor: a.floor }), `ambiance:${a.name}`)}
                >
                  <span className={s.swatch2} style={{ background: a.wall }} />
                  <span className={s.swatch2} style={{ background: a.floor }} />
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Mobilier ---- */}
        <section className={s.section}>
          <h3>MOBILIER</h3>
          <div className={s.checklist}>
            {DECOR_IDS.map((id) => {
              const d = config.decor.find((x) => x.id === id)!;
              return (
                <div key={id} className={`${s.checkRow} ${sel?.kind === "decor" && sel.id === id ? s.checkOn : ""}`}>
                  <input
                    id={`decor-${id}`}
                    type="checkbox"
                    checked={d.visible}
                    onChange={(e) => setDecorVisible(id, e.target.checked)}
                  />
                  <label htmlFor={`decor-${id}`}>{DECOR_META[id].label}</label>
                  {d.visible && (
                    <button className={s.linkBtn} onClick={() => setSel({ kind: "decor", id })}>
                      régler
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- Sauvegarde ---- */}
        <section className={s.section}>
          <h3>GARDER CETTE MISE EN PAGE</h3>
          <div className={s.form}>
            <p className={s.note}>Tes changements sont gardés sur cet appareil.</p>
            {save && (
              <>
                <button className={`${s.btn} ${s.btnOn}`} onClick={save} disabled={saveState.status === "saving"}>
                  {saveState.status === "saving" ? "Enregistrement…" : saveLabel}
                </button>
                {saveState.status === "saved" && saveState.at && (
                  <p className={s.note}>
                    Enregistré à {hhmm(saveState.at)}. Dis à Claude « applique ma mise en page » pour l&apos;installer
                    dans le projet.
                  </p>
                )}
                {saveState.status === "error" && <p className={`${s.note} ${s.ko}`}>{saveState.message}</p>}
              </>
            )}
            <div className={s.toolbar}>
              <button className={s.btn} onClick={copyCode}>
                Copier le code
              </button>
              <button className={s.btn} onClick={applyCode} disabled={!code.trim()}>
                Appliquer un code
              </button>
            </div>
            <textarea
              id="layout-code"
              className={s.textarea}
              rows={3}
              placeholder="Colle ici le code d'une mise en page, puis « Appliquer un code »."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
            />
            {codeMsg && <p className={s.note}>{codeMsg}</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}
