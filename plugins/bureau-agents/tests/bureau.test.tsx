import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const SURFACES = ['terminal', 'desktop', 'mobile'] as const
/** Une demande tapée par la personne. */
const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const
const PANE = { component: 'Pane', requestId: 'bureau', props: { title: 'Bureau de Claude', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } } as const

/** Le moteur sous l'extension : horloge en mémoire, et des réponses neutres à chaque événement. */
function engine(on: On) {
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  on('prompt.submit', async ($, e) => ({ text: e.text }))
  on('turn.start', async ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  on('tool.call', async () => ({ result: 'ok' }))
  return clock
}

describe('bureau-agents', () => {
  test('la fenêtre suit la demande, les outils et un sous-agent', async ($, on) => {
    const clock = engine(on)

    await $.prompt.submit(typed('Construis la page contact'))
    await $.turn.start({ text: 'Construis la page contact', turnId: 't1' })

    // Une recherche terminée, puis une commande encore en cours (on vérifie pendant l'appel).
    await $.tool.call({ tool: 'WebSearch', query: 'formulaire contact accessible', mode: 'standard' })
    await clock.advance(1000) // la fenêtre se redessine au plus une fois par seconde

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'bureau-agents', surface, ...PANE })
      expect(await ui.find({ type: 'Text', text: /Au travail/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Construis la page contact/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Je cherche : formulaire contact accessible/ })).toBeDefined()
      expect(await ui.find({ type: 'Link', text: /Ouvrir le bureau virtuel/ })).toBeDefined()
      await ui.unmount()
    }

    await $.turn.complete({ answer: 'fini', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' })
    await clock.advance(1000)
    const ui = await $.ui.mount({ plugin: 'bureau-agents', surface: 'terminal', ...PANE })
    expect(await ui.find({ type: 'Text', text: /Terminé/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 faite/ })).toBeDefined()
    await ui.unmount()
  })

  test('une notification système ne remplace pas la demande', async ($, on) => {
    const clock = engine(on)
    await $.prompt.submit(typed('Ma vraie demande'))
    await $.prompt.submit(typed('<task-notification>\n<status>done</status>'))
    await $.prompt.submit({ text: 'Agent terminé', wait: false, origin: { kind: 'task-notification' } })
    await clock.advance(1000)
    const ui = await $.ui.mount({ plugin: 'bureau-agents', surface: 'desktop', ...PANE })
    expect(await ui.find({ type: 'Text', text: /Ma vraie demande/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /task-notification/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /Agent terminé/ })).toBeUndefined()
    await ui.unmount()
  })
  test('le bureau est dessiné : SVG sur les écrans, cellules dans le terminal', async ($, on) => {
    const clock = engine(on)
    await $.prompt.submit(typed('Construis la page contact'))
    await $.tool.call({ tool: 'Read', file_path: '/repo/src/app/page.tsx' })
    await clock.advance(1000)

    for (const surface of ['desktop', 'mobile'] as const) {
      const ui = await $.ui.mount({ plugin: 'bureau-agents', surface, ...PANE })
      const svg = await ui.find({ type: 'Svg' })
      expect(svg).toBeDefined()
      const source = String(svg?.props.source)
      expect(source.startsWith('<svg')).toBe(true)
      expect(source.length).toBeLessThan(131_072)
      expect(String(svg?.props.alt)).toMatch(/Bureau de Claude.*Construis la page contact/)
      await ui.unmount()
    }

    const ui = await $.ui.mount({ plugin: 'bureau-agents', surface: 'terminal', ...PANE })
    const raster = await ui.find({ type: 'Raster' })
    expect(raster).toBeDefined()
    const columns = Number(raster?.props.columns)
    const rows = Number(raster?.props.rows)
    expect(columns).toBeGreaterThanOrEqual(24)
    expect(columns).toBeLessThanOrEqual(60)
    // 12 octets par cellule (trois u32), en base64.
    expect(String(raster?.props.cells).length).toBe(Math.ceil((columns * rows * 12) / 3) * 4)
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await ui.unmount()
  })

  test('un sous-agent porte l’id de son appel Agent, comme dans le journal de session', async ($, on) => {
    const clock = engine(on)
    on('agent.spawn', async () => ({ model: 'haiku', agentId: 'ag1' }))
    // On lit le journal du bureau au passage de ses écritures.
    let events: { type: string; tool?: string; agentId?: string }[] = []
    type Watch = (event: 'state.set', match: object, hook: (...a: [unknown, { value: unknown }, (e: unknown) => unknown]) => unknown) => void
    ;(on as unknown as Watch)('state.set', { plugin: 'bureau-agents', key: 'events' }, async ($, e, next) => {
      events = e.value as typeof events
      return next(e)
    })
    await $.prompt.submit(typed('Audite le projet'))
    await $.tool.call({ tool: 'Agent', tool_use_id: 'toolu_A', description: 'Audit', prompt: 'Audite', subagent_type: 'Explore', run_in_background: true })
    await $.agent.spawn({ tool_use_id: 'toolu_A', prompt: 'Audite', description: 'Audit', subagentType: 'Explore', provider: { plugin: 'engine' } } as never)
    await $.tool.call({ tool: 'Grep', tool_use_id: 'toolu_G', pattern: 'aria-', agentId: 'ag1' } as never)
    await clock.advance(3000) // le robot arrive par la porte (1,8 s de marche)
    await $.turn.start({ text: 'Audite le projet', turnId: 't2' }) // un événement : la fenêtre se redessine
    await clock.advance(1000)

    expect(events.find(e => e.type === 'subagent_start')?.agentId).toBe('toolu_A')
    expect(events.find(e => e.type === 'tool_start' && e.tool === 'Grep')?.agentId).toBe('toolu_A')

    const ui = await $.ui.mount({ plugin: 'bureau-agents', surface: 'desktop', ...PANE })
    // Un seul robot : celui du sous-agent, relié à son appel (pas de robot en double).
    expect(String((await ui.find({ type: 'Svg' }))?.props.alt)).toMatch(/1 robot au travail : Nova .*Mission : Audit/)
    await ui.unmount()
  })
})
