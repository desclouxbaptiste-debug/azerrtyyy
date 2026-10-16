"use client";

import { useEffect, useId, useRef } from "react";
import s from "./office.module.css";

/** Taille maximale d'une demande, sous la limite de 64 Kio d'un message vers une session. */
export const MAX_REQUEST_BYTES = 60_000;

/** Taille d'un texte une fois envoyé (UTF-8). */
export const requestBytes = (text: string) => new TextEncoder().encode(text).length;

export type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; at: number; to: string }
  | { kind: "error"; message: string; link?: { href: string; label: string }; manage?: boolean };

const hhmm = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const ko = (bytes: number) => `${Math.ceil(bytes / 1000)} Ko`;

/** Sur un écran tactile, Entrée passe à la ligne ; ailleurs elle envoie (Maj+Entrée pour une ligne). */
const enterSends = () => {
  try {
    return !window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return true;
  }
};

/**
 * La case « Ta demande à Claude » : le texte part vers la session regardée,
 * et le bureau montre ensuite les robots qui y travaillent.
 */
export function Composer({
  value,
  onChange,
  onSend,
  state,
  target,
  waiting,
  disabledReason,
  onManage,
}: {
  value: string;
  onChange(v: string): void;
  onSend(): void;
  state: SendState;
  /** Titre de la session qui recevra la demande. */
  target?: string;
  /** La session attend une réponse de la personne. */
  waiting?: boolean;
  /** Pourquoi l'envoi est impossible pour l'instant (pas de session, accès manquant…). */
  disabledReason?: string;
  onManage?(): void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const sending = state.kind === "sending";
  const empty = !value.trim();
  const blocked = !!disabledReason;
  const bytes = requestBytes(value);
  const tooLong = bytes > MAX_REQUEST_BYTES;

  // Le bouton se désactive pendant l'envoi : on rend ensuite la main à la case, pour enchaîner.
  const wasSending = useRef(false);
  useEffect(() => {
    const active = document.activeElement;
    if (wasSending.current && !sending && (!active || active === document.body || formRef.current?.contains(active)))
      textRef.current?.focus();
    wasSending.current = sending;
  }, [sending]);

  const submit = () => {
    if (!sending && !empty && !blocked && !tooLong) onSend();
  };

  return (
    <form
      ref={formRef}
      className={s.composer}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      aria-busy={sending}
    >
      <label className={s.composerLabel} htmlFor={`${id}-text`}>
        <b>TA DEMANDE ▸</b>
        <span>
          {target ? (
            <>
              envoyée à la session <b>{target}</b>
              {waiting ? " · elle attend ta réponse" : ""}
            </>
          ) : (
            "à Claude"
          )}
        </span>
      </label>
      <div className={s.composerRow}>
        <textarea
          ref={textRef}
          id={`${id}-text`}
          className={`${s.textarea} ${s.composerText}`}
          rows={2}
          value={value}
          placeholder={
            blocked ? disabledReason : "Écris ce que Claude doit faire… puis « Envoyer » : les robots se mettent au travail."
          }
          // Lecture seule pendant l'envoi (et non désactivée) : la case garde le focus.
          readOnly={sending}
          aria-disabled={sending || undefined}
          aria-invalid={tooLong || undefined}
          aria-describedby={`${id}-status ${id}-size`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Safari valide une saisie composée (accents, japonais…) avec un Entrée marqué 229.
            if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.ctrlKey || e.metaKey || (!e.shiftKey && enterSends())) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className={`${s.btn} ${s.btnOn} ${s.composerSend}`}
          disabled={sending || empty || blocked || tooLong}
        >
          {sending ? "Envoi…" : "Envoyer ▸"}
        </button>
      </div>
      <p id={`${id}-status`} className={s.composerStatus} role="status" aria-live="polite">
        {state.kind === "sending" && "Envoi à Claude…"}
        {state.kind === "sent" && (
          <span className={s.composerOk}>
            ✓ Envoyée à {hhmm(state.at)} à « {state.to} ». Claude la reçoit dans cette session : regarde les robots
            s&apos;y mettre.
          </span>
        )}
        {state.kind === "error" && (
          <span className={s.composerErr}>
            {state.message}{" "}
            {state.link && (
              <a className={s.composerLink} href={state.link.href} target="_blank" rel="noreferrer">
                {state.link.label}
              </a>
            )}
            {state.manage && onManage && (
              <button type="button" className={s.btn} onClick={onManage}>
                Gérer les autorisations
              </button>
            )}
          </span>
        )}
        {state.kind === "idle" && blocked && value.trim() && disabledReason}
        {state.kind === "idle" && tooLong && (
          <span className={s.composerErr}>
            Demande trop longue ({ko(bytes)} pour {ko(MAX_REQUEST_BYTES)} au plus) : raccourcis-la pour l&apos;envoyer.
          </span>
        )}
      </p>
      {/* Hors de la zone annoncée : la taille change à chaque frappe. */}
      {!tooLong && bytes > MAX_REQUEST_BYTES * 0.9 && (
        <p id={`${id}-size`} className={s.composerStatus}>
          {ko(bytes)} / {ko(MAX_REQUEST_BYTES)}
        </p>
      )}
    </form>
  );
}
