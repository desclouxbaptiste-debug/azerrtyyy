"use client";

import { useId } from "react";
import s from "./office.module.css";

/** Limite d'un message vers une session (64 Kio côté Claude Code Remote, en octets). */
export const MAX_REQUEST_CHARS = 10_000;

export type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; at: number; to: string }
  | { kind: "error"; message: string; link?: { href: string; label: string }; manage?: boolean };

const hhmm = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

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
  const sending = state.kind === "sending";
  const empty = !value.trim();
  const blocked = !!disabledReason;

  const submit = () => {
    if (!sending && !empty && !blocked) onSend();
  };

  return (
    <form
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
          id={`${id}-text`}
          className={`${s.textarea} ${s.composerText}`}
          rows={2}
          maxLength={MAX_REQUEST_CHARS}
          value={value}
          placeholder={
            blocked ? disabledReason : "Écris ce que Claude doit faire… puis « Envoyer » : les robots se mettent au travail."
          }
          disabled={sending}
          aria-describedby={`${id}-status`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            if (e.ctrlKey || e.metaKey || (!e.shiftKey && enterSends())) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className={`${s.btn} ${s.btnOn} ${s.composerSend}`} disabled={sending || empty || blocked}>
          {sending ? "Envoi…" : "Envoyer ▸"}
        </button>
      </div>
      <p id={`${id}-status`} className={s.composerStatus} role="status" aria-live="polite">
        {state.kind === "sending" && "Envoi à Claude…"}
        {state.kind === "sent" && (
          <span className={s.composerOk}>
            ✓ Envoyée à {hhmm(state.at)} à « {state.to} ». Elle s&apos;affichera dans REQUÊTE dès que Claude la prend.
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
        {state.kind === "idle" && value.length > MAX_REQUEST_CHARS * 0.9 && (
          <span>
            {" "}
            {value.length} / {MAX_REQUEST_CHARS} caractères
          </span>
        )}
      </p>
    </form>
  );
}
