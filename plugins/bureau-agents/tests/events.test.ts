import { expect, test } from 'claude-code/testing'

import type { OfficeEvent } from '../types'
import { addEvent, isAgentCall, linkId, toolInput, trim } from '../hooks/events'
import { renderOfficeCells, renderOfficeSvg } from '../hooks/office.gen'

const T = 1_800_000_000_000
const ev = (o: Omit<OfficeEvent, 'id' | 'ts'>, dt: number, id: string): OfficeEvent => ({ id, ts: T + dt, ...o })

test("les paramètres d'un appel sont gardés sans leur enveloppe, et raccourcis", async () => {
  const input = toolInput({ tool: 'Bash', tool_use_id: 'toolu_1', agentId: 'ag', consent: 'x', command: 'x'.repeat(1000), list: Array(40).fill(1) })
  expect(Object.keys(input).sort()).toEqual(['command', 'list'])
  expect(String(input.command).length).toBe(300)
  expect((input.list as unknown[]).length).toBe(12)
  expect(trim({ a: { b: { c: { d: 1 } } } })).toEqual({ a: { b: { c: '…' } } })
})

test('le journal garde ses 600 derniers événements et la demande en cours', async () => {
  let list: OfficeEvent[] = [ev({ type: 'prompt', text: 'La demande' }, 0, 'p')]
  for (let i = 1; i <= 700; i++) list = addEvent(list, ev({ type: 'tool_start', tool: 'Read', toolUseId: `t${i}` }, i, `e${i}`))
  expect(list.length).toBe(600)
  expect(list[0]?.text).toBe('La demande')
  expect(list.at(-1)?.toolUseId).toBe('t700')
})

test("un sous-agent lancé par Agent prend l'id de l'appel ; celui d'un workflow garde le sien", async () => {
  const list = [ev({ type: 'tool_start', tool: 'Agent', toolUseId: 'toolu_A' }, 0, 'a'), ev({ type: 'tool_start', tool: 'Workflow', toolUseId: 'toolu_W' }, 1, 'w')]
  expect(isAgentCall(list, 'toolu_A')).toBe(true)
  expect(isAgentCall(list, 'toolu_W')).toBe(false)
  expect(linkId({ ag1: 'toolu_A' }, 'ag1')).toBe('toolu_A')
  expect(linkId({ ag1: 'toolu_A' }, 'ag2')).toBe('ag2')
  expect(linkId({}, undefined)).toBeUndefined()
})

test('bureau plein : tous les robots au travail, le SVG reste sous la limite', async () => {
  const tools: [string, Record<string, string>][] = [
    ['WebSearch', { query: 'une recherche assez longue pour remplir la bulle' }],
    ['Edit', { file_path: '/src/app/un-fichier-au-nom-long.tsx' }],
    ['Edit', { file_path: '/src/app/styles.module.css' }],
    ['Bash', { description: 'Lance toute la suite de tests' }],
    ['Read', { file_path: '/src/lib/office/reduce.ts' }],
  ]
  const list: OfficeEvent[] = [ev({ type: 'prompt', text: 'Une grosse demande' }, 0, 'p')]
  let n = 0
  for (let round = 0; round < 3; round++)
    for (const [tool, input] of tools) list.push(ev({ type: 'tool_start', tool, toolUseId: `t${n}`, input }, 10 + n, `e${n++}`))
  for (let i = 0; i < 6; i++) {
    list.push(ev({ type: 'tool_start', tool: 'Agent', toolUseId: `toolu_S${i}`, input: { description: `Mission ${i}`, subagent_type: 'general-purpose' } }, 40 + i, `s${i}`))
    list.push(ev({ type: 'tool_start', tool: 'Grep', toolUseId: `g${i}`, agentId: `toolu_S${i}`, input: { pattern: 'TODO' } }, 50 + i, `g${i}`))
  }
  const view = renderOfficeSvg(list, T + 8000)
  expect(view.present).toBeGreaterThanOrEqual(15)
  expect(view.svg.length).toBeLessThan(131_072)
  const cells = renderOfficeCells(list, T + 8000, 80)
  expect(cells.columns).toBe(80)
  expect(cells.rows).toBe(Math.round((80 * 320) / 384 / 2))
})
