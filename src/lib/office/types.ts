/**
 * Événement normalisé écrit par le hook `.claude/hooks/office-log.mjs`
 * (une ligne JSON par événement dans `.claude/office/events.jsonl`).
 */
export type OfficeEventType =
  | "prompt"
  | "tool_start"
  | "tool_end"
  | "subagent_start"
  | "subagent_end"
  | "stop";

export type OfficeEvent = {
  id: string;
  ts: number;
  type: OfficeEventType;
  session?: string;
  /** Présent quand l'action vient d'un sous-agent. */
  agentId?: string;
  agentType?: string;
  toolUseId?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: string;
  ok?: boolean;
  /** Texte libre : requête utilisateur, dernier message d'un sous-agent… */
  text?: string;
};

export type ZoneId = "recherche" | "code" | "design" | "action" | "analyse";

export type Task = {
  id: string;
  agentKey: string;
  tool: string;
  zone: ZoneId | "chef";
  icon: string;
  summary: string;
  detail?: string;
  input?: Record<string, unknown>;
  output?: string;
  start: number;
  end?: number;
  ok?: boolean;
};

export type Agent = {
  key: string;
  name: string;
  role: string;
  kind: "seat" | "subagent";
  zone: ZoneId;
  seat: number;
  agentType?: string;
  mission?: string;
  missionDetail?: string;
  finalMessage?: string;
  tasks: Task[];
  enterAt: number;
  lastActive: number;
  /** Instant où il quitte son poste (puis rejoint la porte). */
  leaveAt?: number;
  busy: boolean;
  missionRunning: boolean;
};

export type ChefStatus = "idle" | "thinking" | "waiting" | "done";

export type Chef = {
  name: string;
  status: ChefStatus;
  prompts: { ts: number; text: string }[];
  currentPrompt?: string;
  tasks: Task[];
  reportsDone: number;
  reportsTotal: number;
};

export type OfficeState = {
  chef: Chef;
  /** Agents présents (ou en train d'entrer / sortir) au moment `now`. */
  present: Agent[];
  /** Tous les agents connus, y compris partis — pour l'historique. */
  all: Record<string, Agent>;
  tasks: Task[];
  now: number;
};
