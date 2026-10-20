export type Zone = 'recherche' | 'code' | 'design' | 'action' | 'analyse' | 'chef'

export type StepStatus = 'running' | 'done' | 'failed'

/** Une action de Claude (un appel d'outil), sur la boucle principale ou dans un sous-agent. */
export type Step = {
  id: string
  tool: string
  zone: Zone
  icon: string
  text: string
  status: StepStatus
  startedAt: number
  endedAt?: number
  /** Nom du sous-agent qui l'a faite, absent pour Claude lui-même. */
  by?: string
}

/** Un sous-agent (appel Agent, agent de workflow) et sa mission. */
export type Mission = {
  /** L'appel Agent qui l'a lancé, ou l'id de l'agent quand plusieurs partagent un appel. */
  id: string
  agentId?: string
  name: string
  type: string
  description: string
  status: StepStatus
  background: boolean
  startedAt: number
  endedAt?: number
  steps: number
  current?: string
  currentIcon?: string
}

export type WorkStatus = 'idle' | 'working' | 'done' | 'stopped'

export type Work = {
  request?: string
  status: WorkStatus
  startedAt?: number
  endedAt?: number
  steps: Step[]
  missions: Mission[]
  done: number
  failed: number
  /** Horloge de la fenêtre, avancée toutes les 5 s pendant le travail. */
  now: number
}

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** Un événement du bureau, au format du bureau web (`src/lib/office/types.ts`). */
export type OfficeEvent = {
  id: string
  ts: number
  type: 'prompt' | 'tool_start' | 'tool_end' | 'subagent_start' | 'subagent_end' | 'stop'
  /** Présent quand l'action vient d'un sous-agent : l'id de l'appel Agent qui l'a lancé, sinon le sien. */
  agentId?: string
  agentType?: string
  toolUseId?: string
  tool?: string
  input?: { [key: string]: Json }
  output?: string
  ok?: boolean
  text?: string
}

/** Ce que la fenêtre dessine : une copie prise au plus une fois par seconde. */
export type View = {
  work: Work
  events: OfficeEvent[]
  /** Heure de la copie : le bureau est dessiné à cet instant. */
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'bureau-agents': {
      work: Work
      link: string
      paneShown: boolean
      events: OfficeEvent[]
      /** Sous-agent → appel Agent qui l'a lancé. */
      spawned: { [agentId: string]: string }
      view: View | null
    }
  }
}
