import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const SURFACES = ['terminal', 'desktop', 'mobile'] as const
const PANE = { component: 'Pane', requestId: 'bureau', props: { title: 'Bureau de Claude', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { top: 0, bodyRows: 30, rows: 30 }, view: {} } } as const

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
    engine(on)

    await $.prompt.submit({ text: 'Construis la page contact' })
    await $.turn.start({ text: 'Construis la page contact', turnId: 't1' })

    // Une recherche terminée, puis une commande encore en cours (on vérifie pendant l'appel).
    await $.tool.call({ tool: 'WebSearch', query: 'formulaire contact accessible' })

    for (const surface of SURFACES) {
      const ui = await $.ui.mount({ plugin: 'bureau-agents', surface, ...PANE })
      expect(await ui.find({ type: 'Text', text: /Au travail/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Construis la page contact/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Je cherche : formulaire contact accessible/ })).toBeDefined()
      expect(await ui.find({ type: 'Link', text: /Ouvrir le bureau virtuel/ })).toBeDefined()
      await ui.unmount()
    }

    await $.turn.complete({ answer: 'fini', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' })
    const ui = await $.ui.mount({ plugin: 'bureau-agents', surface: 'terminal', ...PANE })
    expect(await ui.find({ type: 'Text', text: /Terminé/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /1 faite/ })).toBeDefined()
    await ui.unmount()
  })

  test('une notification système ne remplace pas la demande', async ($, on) => {
    engine(on)
    await $.prompt.submit({ text: 'Ma vraie demande' })
    await $.prompt.submit({ text: '<task-notification>\n<status>done</status>' })
    const ui = await $.ui.mount({ plugin: 'bureau-agents', surface: 'desktop', ...PANE })
    expect(await ui.find({ type: 'Text', text: /Ma vraie demande/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /task-notification/ })).toBeUndefined()
    await ui.unmount()
  })
})
