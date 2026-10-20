import type { Json, OfficeEvent } from '../types'

/** Le bureau garde les derniers événements (la demande en cours reste toujours). */
const MAX_EVENTS = 600
const MAX_STR = 300

/** Champs d'enveloppe d'un appel d'outil, qui ne font pas partie de ses paramètres. */
const META = new Set(['tool', 'tool_use_id', 'consent', 'agentId', 'requestMeta'])

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Une copie courte et sérialisable d'une valeur quelconque. */
export function trim(v: unknown, depth = 0): Json {
  if (v === null || typeof v === 'boolean') return v
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') return clip(v, MAX_STR)
  if (depth >= 3) return '…'
  if (Array.isArray(v)) return v.slice(0, 12).map(x => trim(x, depth + 1))
  if (typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== undefined && typeof x !== 'function')
        .slice(0, 20)
        .map(([k, x]) => [k, trim(x, depth + 1)]),
    )
  return null
}

/** Les paramètres d'un appel d'outil, sans son enveloppe. */
export function toolInput(e: object): { [key: string]: Json } {
  const params = Object.fromEntries(Object.entries(e).filter(([k]) => !META.has(k)))
  return trim(params) as { [key: string]: Json }
}

export const outputText = (text: string | undefined) => (text ? clip(text, MAX_STR) : undefined)

let seq = 0
/** Identifiant unique d'événement (l'horloge seule ne suffit pas : plusieurs par milliseconde). */
export const eventId = (kind: string, t: number) => `${kind}:${t}:${(seq++).toString(36)}`

/** Ajoute un événement ; au-delà de la limite, garde les plus récents et la dernière demande. */
export function addEvent(list: readonly OfficeEvent[], ev: OfficeEvent): OfficeEvent[] {
  const all = [...list, ev]
  if (all.length <= MAX_EVENTS) return all
  const kept = all.slice(-MAX_EVENTS)
  const prompt = all.findLast(e => e.type === 'prompt')
  return prompt && !kept.includes(prompt) ? [prompt, ...kept.slice(1)] : kept
}

/**
 * L'id qui relie un sous-agent à son robot : celui de l'appel Agent qui l'a
 * lancé (comme dans le journal d'une session), sinon le sien (agents de workflow).
 */
export function linkId(spawned: { readonly [agentId: string]: string }, agentId: string | undefined) {
  return agentId ? (spawned[agentId] ?? agentId) : undefined
}

/** L'appel `toolUseId` est-il un appel Agent (et non un workflow partagé par plusieurs agents) ? */
export function isAgentCall(list: readonly OfficeEvent[], toolUseId: string) {
  return list.some(e => e.type === 'tool_start' && e.toolUseId === toolUseId && /^(agent|task)$/i.test(e.tool ?? ''))
}
