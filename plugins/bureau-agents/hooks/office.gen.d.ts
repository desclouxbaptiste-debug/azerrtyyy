// Types de `office.gen.js` (généré par `npm run build:plugin-office` depuis scripts/plugin-office/entry.ts).
import type { OfficeEvent } from '../types'

export type OfficeView = {
  /** Le dessin, `<svg …>…</svg>` (moins de 131 072 caractères). */
  svg: string
  /** Description du bureau pour qui ne voit pas le dessin. */
  alt: string
  present: number
  running: number
  done: number
}

/** Le bureau à l'instant `now`, en SVG (bureau, appli mobile, VS Code). */
export function renderOfficeSvg(events: readonly OfficeEvent[], now: number): OfficeView

/** Le bureau à l'instant `now`, en cellules « ▀ » de terminal sur `columns` colonnes. */
export function renderOfficeCells(
  events: readonly OfficeEvent[],
  now: number,
  columns: number,
): { cells: string; columns: number; rows: number; alt: string }
