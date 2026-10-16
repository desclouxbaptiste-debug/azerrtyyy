import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Step, Work } from '../types'
import {
  EMPTY,
  OFFICE_URL,
  ZONE_LABEL,
  ZONE_ROBOT,
  elapsed,
  endStep,
  endTurn,
  isAgentTool,
  isSystemText,
  linkAgent,
  markWorking,
  startRequest,
  startStep,
} from './work'

const PANE = 'bureau'
const TITLE = 'Bureau de Claude'

const work = atom({ plugin: 'bureau-agents', key: 'work' } as const, EMPTY)
const link = atom({ plugin: 'bureau-agents', key: 'link' } as const, OFFICE_URL)
const paneShown = atom({ plugin: 'bureau-agents', key: 'paneShown' } as const, false)

const STATUS: Record<Work['status'], { mark: string; label: string; color: string }> = {
  idle: { mark: '☕', label: 'En attente de ta demande', color: 'inactive' },
  working: { mark: '●', label: 'Au travail', color: 'warning' },
  done: { mark: '✓', label: 'Terminé', color: 'success' },
  stopped: { mark: '■', label: 'Interrompu', color: 'error' },
}

const mark = (s: Step['status']) => (s === 'running' ? '⏳' : s === 'done' ? '✓' : '✗')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'bureau',
      description: 'Ouvre la fenêtre des agents de Claude et le lien vers le bureau virtuel',
    })
    // Dans une session claude.ai, le lien ouvre le bureau directement sur cette session.
    const remote = await $.env.get('CLAUDE_CODE_REMOTE_SESSION_ID')
    if (remote) {
      const id = remote.replace(/^cse_/, '')
      await update($, link, () => `${OFFICE_URL}#session_${id}`)
    }
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    await update($, paneShown, () => opened.isPlaced)
    // L'horloge de la fenêtre n'avance que pendant le travail.
    $.clock.every(5000, () => {
      void (async () => {
        const w = await read($, work)
        if (w.status !== 'working') return
        const t = await $.clock.now()
        await update($, work, cur => ({ ...cur, now: t }))
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'bureau' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: TITLE, focus: true })
    await update($, paneShown, () => opened.isPlaced)
    const href = await read($, link)
    return {
      text: opened.isPlaced
        ? `Fenêtre du bureau ouverte. Bureau virtuel : ${href}`
        : `Cette interface n'affiche pas de fenêtre ici. Bureau virtuel : ${href}`,
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.isMeta && e.origin?.kind !== 'task-notification' && !isSystemText(e.text)) {
      const t = await $.clock.now()
      await update($, work, w => startRequest(w, e.text, t))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) {
      const t = await $.clock.now()
      await update($, work, w => markWorking(w, t))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    const t0 = await $.clock.now()
    await update($, work, w => startStep(w, { id: e.tool_use_id, tool: e.tool, input, agentId: e.agentId }, t0))
    const ran = await next(e)
    const ok = ran.deny === undefined && ran.isError !== true
    const t1 = await $.clock.now()
    await update($, work, w => endStep(w, e.tool_use_id, ok, t1))
    return ran
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const ran = await next(e)
    if (ran.agentId) {
      const t = await $.clock.now()
      const agentId = ran.agentId
      await update($, work, w =>
        linkAgent(w, { toolUseId: e.tool_use_id, agentId, description: e.description, type: e.subagentType }, t),
      )
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    const t = await $.clock.now()
    await update($, work, w => endTurn(w, { agentId: e.agentId, isAborted: e.isAborted }, t))
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Link } = $.ui.resolve(e)
    const w = await read($, work)
    const href = await read($, link)
    const st = STATUS[w.status]
    const running = w.steps.filter(s => s.status === 'running' && !isAgentTool(s.tool) && !s.by)
    const missions = [...w.missions].sort((a, b) => Number(b.status === 'running') - Number(a.status === 'running'))
    const recent = w.steps.filter(s => s.status !== 'running' && !s.by).slice(-4).reverse()
    const time = elapsed(w.startedAt, w.status === 'working' ? w.now : w.endedAt)
    const activeAgents = missions.filter(m => m.status === 'running').length + running.length

    return (
      <Box flexDirection="column">
        <Text>
          <Text color={st.color} bold>
            {st.mark} {st.label}
          </Text>
          {time ? <Text dimColor> · {time}</Text> : ''}
          {w.status === 'working' ? <Text dimColor> · {activeAgents} au travail</Text> : ''}
        </Text>
        <Text wrap="truncate-end">
          <Text dimColor>Demande : </Text>
          {w.request ? `« ${w.request} »` : 'aucune pour l’instant'}
        </Text>
        <Text wrap="truncate-end">
          🧑‍💼 {ZONE_ROBOT.chef} (chef) — {w.done} faite{w.done > 1 ? 's' : ''}
          {w.failed ? ` · ${w.failed} en échec` : ''}
        </Text>
        {missions.slice(0, 6).map(m => (
          <Box key={m.id} flexDirection="column">
            <Text wrap="truncate-end" dimColor={m.status !== 'running'}>
              {mark(m.status)} 🛰️ {m.name} · {m.type} — {m.description}
            </Text>
            {m.status === 'running' && m.current && (
              <Text dimColor wrap="truncate-end">
                {'   '}
                {m.currentIcon} {m.current} · {m.steps} action{m.steps > 1 ? 's' : ''}
              </Text>
            )}
          </Box>
        ))}
        {running.slice(-6).map(s => (
          <Text key={s.id} wrap="truncate-end">
            ⏳ {s.icon} {ZONE_ROBOT[s.zone]} · {ZONE_LABEL[s.zone]} — {s.text}
          </Text>
        ))}
        {recent.length > 0 && <Text dimColor>Dernières actions</Text>}
        {recent.map(s => (
          <Text key={`r-${s.id}`} dimColor wrap="truncate-end">
            {mark(s.status)} {s.icon} {s.text}
          </Text>
        ))}
        <Box marginTop={1}>
          <Link href={href} label="🏢 Ouvrir le bureau virtuel" />
        </Box>
      </Box>
    )
  })

  // Là où aucune fenêtre ne s'affiche, une ligne au-dessus de la saisie pendant le travail.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const w = await read($, work)
    if (e.props.hasSurvey || w.status !== 'working' || (await read($, paneShown))) return next(e)
    const { Box, Text, Link } = $.ui.resolve(e)
    const href = await read($, link)
    const busy = w.missions.filter(m => m.status === 'running').length + w.steps.filter(s => s.status === 'running' && !s.by).length
    return (
      <Box gap={1}>
        <Text wrap="truncate-end">
          <Text color="warning">●</Text> {busy} agent{busy > 1 ? 's' : ''} au travail · {w.done} action{w.done > 1 ? 's' : ''}
        </Text>
        <Link href={href} label="🏢 Bureau" />
      </Box>
    )
  })
}
