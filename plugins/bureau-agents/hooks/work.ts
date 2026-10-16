import type { Mission, Step, StepStatus, Work, Zone } from '../types'

/** Le bureau virtuel publié : il lit les vraies sessions Claude Code. */
export const OFFICE_URL = 'https://claude.ai/artifact/1nEPBS1LJZh3GbBZp7jTTr'

export const EMPTY: Work = { status: 'idle', steps: [], missions: [], done: 0, failed: 0, now: 0 }

const MAX_STEPS = 80
const MAX_MISSIONS = 30

export const ZONE_LABEL: Record<Zone, string> = {
  recherche: 'Recherche',
  code: 'Code',
  design: 'Design',
  action: 'Action',
  analyse: 'Analyse',
  chef: 'Chef',
}

/** Les robots du bureau, un par zone, et Max le chef. */
export const ZONE_ROBOT: Record<Zone, string> = {
  recherche: 'Hugo',
  code: 'Inès',
  design: 'Jade',
  action: 'Lucas',
  analyse: 'Lina',
  chef: 'Max',
}

const SUB_NAMES = ['Nova', 'Pixel', 'Bolt', 'Écho', 'Atlas', 'Iris', 'Orbit', 'Comète', 'Néon', 'Volt']

type Input = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const base = (p?: string) => (p ? (p.split(/[\\/]/).filter(Boolean).pop() ?? p) : '')
const host = (u?: string) => {
  if (!u) return ''
  const m = /^[a-z]+:\/\/([^/?#]+)/i.exec(u)
  return (m?.[1] ?? u).replace(/^www\./, '')
}

const DESIGN_EXT = /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|fig|sketch)$/i

export const isAgentTool = (tool: string) => tool === 'Agent' || tool === 'Task'

export function zoneOf(tool: string, input: Input): Zone {
  const t = tool.toLowerCase()
  if (['agent', 'task', 'todowrite', 'askuserquestion', 'enterplanmode', 'exitplanmode', 'workflow'].includes(t))
    return 'chef'
  if (t === 'websearch' || t === 'webfetch' || /search|fetch|browse/.test(t)) return 'recherche'
  if (['read', 'grep', 'glob', 'ls', 'notebookread', 'toolsearch'].includes(t)) return 'analyse'
  if (['edit', 'write', 'multiedit', 'notebookedit'].includes(t)) {
    const path = str(input.file_path) ?? str(input.notebook_path) ?? ''
    return DESIGN_EXT.test(path) ? 'design' : 'code'
  }
  if (/artifact|design|figma|canvas|image/.test(t)) return 'design'
  return 'action'
}

/** Phrase à la première personne, comme dans les bulles du bureau. */
export function describe(tool: string, input: Input): { icon: string; text: string } {
  const path = str(input.file_path) ?? str(input.notebook_path) ?? str(input.path)
  switch (tool.toLowerCase()) {
    case 'websearch':
      return { icon: '🔎', text: `Je cherche : ${clip(str(input.query) ?? '…', 80)}` }
    case 'webfetch':
      return { icon: '🌐', text: `Je lis ${host(str(input.url))}` }
    case 'read':
      return { icon: '📄', text: `Je lis ${base(path)}` }
    case 'grep':
      return { icon: '🔍', text: `Je fouille : ${clip(str(input.pattern) ?? '', 60)}` }
    case 'glob':
      return { icon: '🗂️', text: `Je liste ${clip(str(input.pattern) ?? '', 60)}` }
    case 'edit':
    case 'multiedit':
      return { icon: '✏️', text: `Je modifie ${base(path)}` }
    case 'write':
      return { icon: '📝', text: `J'écris ${base(path)}` }
    case 'notebookedit':
      return { icon: '📓', text: `J'édite ${base(path)}` }
    case 'bash':
      return { icon: '⚙️', text: `J'exécute : ${clip(str(input.description) ?? str(input.command) ?? '', 80)}` }
    case 'agent':
    case 'task':
      return { icon: '🤖', text: `Je délègue : ${clip(str(input.description) ?? 'une mission', 80)}` }
    case 'workflow':
      return { icon: '🧭', text: 'Je lance une équipe d’agents' }
    case 'todowrite':
      return { icon: '📋', text: 'Je planifie les étapes' }
    case 'askuserquestion':
      return { icon: '❓', text: 'Je te pose une question' }
    case 'skill':
      return { icon: '🧰', text: `J'ouvre le guide ${str(input.skill) ?? ''}`.trim() }
    case 'artifact':
      return { icon: '🎨', text: 'Je publie une page' }
    default: {
      const pretty = tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' › ') : tool
      return { icon: '🛠️', text: `J'utilise ${clip(pretty, 60)}` }
    }
  }
}

/** Les notifications système arrivent comme des messages : ce ne sont pas des demandes. */
export const isSystemText = (text: string) => /^\s*<(task-notification|system-reminder)[\s>]/.test(text)

export function startRequest(w: Work, text: string, t: number): Work {
  return {
    ...w,
    request: clip(text.replace(/\s+/g, ' ').trim() || '(demande vide)', 160),
    status: 'working',
    startedAt: t,
    endedAt: undefined,
    // Les sous-agents encore au travail (arrière-plan) restent ; le reste repart à zéro.
    steps: w.steps.filter((s) => s.status === 'running'),
    missions: w.missions.filter((m) => m.status === 'running'),
    done: 0,
    failed: 0,
    now: t,
  }
}

export function markWorking(w: Work, t: number): Work {
  return w.status === 'working' ? w : { ...w, status: 'working', startedAt: w.startedAt ?? t, endedAt: undefined, now: t }
}

export function startStep(
  w: Work,
  call: { id: string; tool: string; input: Input; agentId?: string },
  t: number,
): Work {
  const { icon, text } = describe(call.tool, call.input)
  const mission = call.agentId ? w.missions.find((m) => m.agentId === call.agentId) : undefined
  const step: Step = {
    id: call.id,
    tool: call.tool,
    zone: zoneOf(call.tool, call.input),
    icon,
    text,
    status: 'running',
    startedAt: t,
    by: mission?.name ?? (call.agentId ? 'Sous-agent' : undefined),
  }
  let missions = mission
    ? w.missions.map((m) => (m === mission ? { ...m, steps: m.steps + 1, current: text, currentIcon: icon } : m))
    : w.missions
  if (!call.agentId && isAgentTool(call.tool)) {
    const n = w.missions.length
    const created: Mission = {
      id: call.id,
      name: SUB_NAMES[n % SUB_NAMES.length] + (n >= SUB_NAMES.length ? ` ${Math.floor(n / SUB_NAMES.length) + 1}` : ''),
      type: str(call.input.subagent_type) ?? 'agent',
      description: clip(str(call.input.description) ?? 'mission', 80),
      status: 'running',
      background: call.input.run_in_background === true,
      startedAt: t,
      steps: 0,
    }
    missions = [...missions, created].slice(-MAX_MISSIONS)
  }
  return { ...markWorking(w, t), steps: [...w.steps, step].slice(-MAX_STEPS), missions, now: t }
}

export function endStep(w: Work, id: string, ok: boolean, t: number): Work {
  const step = w.steps.find((s) => s.id === id)
  if (!step || step.status !== 'running') return w
  const status: StepStatus = ok ? 'done' : 'failed'
  // Un appel Agent qui rend la main clôt sa mission, sauf lancé en arrière-plan.
  const missions = w.missions.map((m) =>
    m.id === id && !m.background && m.status === 'running' ? { ...m, status, endedAt: t } : m,
  )
  return {
    ...w,
    steps: w.steps.map((s) => (s.id === id ? { ...s, status, endedAt: t } : s)),
    missions,
    done: w.done + (ok ? 1 : 0),
    failed: w.failed + (ok ? 0 : 1),
    now: t,
  }
}

/** Relie un sous-agent démarré à son appel Agent (ou crée sa mission : agents de workflow). */
export function linkAgent(
  w: Work,
  spawn: { toolUseId: string; agentId: string; description: string; type: string },
  t: number,
): Work {
  const own = w.missions.find((m) => m.id === spawn.toolUseId && !m.agentId)
  if (own) return { ...w, missions: w.missions.map((m) => (m === own ? { ...m, agentId: spawn.agentId } : m)) }
  if (w.missions.some((m) => m.agentId === spawn.agentId)) return w
  const n = w.missions.length
  const created: Mission = {
    id: spawn.agentId,
    agentId: spawn.agentId,
    name: SUB_NAMES[n % SUB_NAMES.length] + (n >= SUB_NAMES.length ? ` ${Math.floor(n / SUB_NAMES.length) + 1}` : ''),
    type: spawn.type,
    description: clip(spawn.description || 'mission', 80),
    status: 'running',
    background: true,
    startedAt: t,
    steps: 0,
  }
  return { ...markWorking(w, t), missions: [...w.missions, created].slice(-MAX_MISSIONS) }
}

/** Fin d'un tour : celui d'un sous-agent clôt sa mission, celui de Claude clôt la demande. */
export function endTurn(w: Work, turn: { agentId?: string; isAborted: boolean }, t: number): Work {
  if (turn.agentId) {
    return {
      ...w,
      missions: w.missions.map((m) =>
        m.agentId === turn.agentId && m.status === 'running'
          ? { ...m, status: turn.isAborted ? 'failed' : 'done', endedAt: t }
          : m,
      ),
      now: t,
    }
  }
  const backgroundLeft = w.missions.some((m) => m.status === 'running' && m.background)
  return {
    ...w,
    status: turn.isAborted ? 'stopped' : backgroundLeft ? 'working' : 'done',
    endedAt: backgroundLeft ? undefined : t,
    // Ce qui tournait encore dans ce tour s'arrête avec lui.
    steps: w.steps.map((s) => (s.status === 'running' && !s.by ? { ...s, status: turn.isAborted ? 'failed' : 'done', endedAt: t } : s)),
    now: t,
  }
}

export function elapsed(from?: number, to?: number) {
  if (!from || !to || to < from) return ''
  const s = Math.round((to - from) / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m} min ${String(s % 60).padStart(2, '0')}` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}
