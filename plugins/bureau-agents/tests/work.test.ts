import { expect, test } from 'claude-code/testing'

import { EMPTY, endStep, endTurn, linkAgent, startRequest, startStep } from '../hooks/work'

const T = 1_800_000_000_000

test('un sous-agent est relié à son appel Agent et suit ses actions', async () => {
  let w = startRequest(EMPTY, 'Audite le projet', T)
  w = startStep(w, { id: 'toolu_A', tool: 'Agent', input: { subagent_type: 'Explore', description: 'Explorer le dépôt' } }, T + 1)
  w = linkAgent(w, { toolUseId: 'toolu_A', agentId: 'ag1', description: 'Explorer le dépôt', type: 'Explore' }, T + 2)
  w = startStep(w, { id: 'toolu_G', tool: 'Grep', input: { pattern: 'TODO' }, agentId: 'ag1' }, T + 3)
  const m = w.missions[0]
  expect(m?.agentId).toBe('ag1')
  expect(m?.current).toBe('Je fouille : TODO')
  expect(m?.steps).toBe(1)
  expect(w.steps.at(-1)?.by).toBe(m?.name)
  w = endStep(w, 'toolu_G', true, T + 4)
  w = endStep(w, 'toolu_A', true, T + 5)
  expect(w.missions[0]?.status).toBe('done')
  w = endTurn(w, { isAborted: false }, T + 6)
  expect(w.status).toBe('done')
})

test("un agent en arrière-plan garde la demande « au travail » jusqu'à sa fin", async () => {
  let w = startRequest(EMPTY, 'Lance les tests en fond', T)
  w = startStep(w, { id: 'toolu_B', tool: 'Agent', input: { description: 'tests', run_in_background: true } }, T + 1)
  w = linkAgent(w, { toolUseId: 'toolu_B', agentId: 'ag2', description: 'tests', type: 'general-purpose' }, T + 2)
  w = endStep(w, 'toolu_B', true, T + 3) // accusé de lancement
  expect(w.missions[0]?.status).toBe('running')
  w = endTurn(w, { isAborted: false }, T + 4)
  expect(w.status).toBe('working')
  w = endTurn(w, { agentId: 'ag2', isAborted: false }, T + 9)
  expect(w.missions[0]?.status).toBe('done')
})

test('les agents d’un workflow partagent un appel et ont chacun leur mission', async () => {
  let w = startRequest(EMPTY, 'Relis le code', T)
  w = startStep(w, { id: 'toolu_W', tool: 'Workflow', input: {} }, T + 1)
  w = linkAgent(w, { toolUseId: 'toolu_W', agentId: 'w1', description: 'review:bugs', type: 'workflow' }, T + 2)
  w = linkAgent(w, { toolUseId: 'toolu_W', agentId: 'w2', description: 'review:perf', type: 'workflow' }, T + 3)
  expect(w.missions.map((x) => x.description)).toEqual(['review:bugs', 'review:perf'])
})
