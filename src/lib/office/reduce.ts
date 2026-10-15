import { describeTool, isSystemPrompt, shortText, zoneForAgentType, zoneForTool } from "./describe";
import { DEFAULT_GEOMETRY, type Geometry } from "./layout";
import type { Agent, Chef, OfficeEvent, OfficeState, Task, ZoneId } from "./types";

/** Durée de la marche porte ↔ bureau. */
export const WALK_MS = 1800;

export type ReduceOptions = {
  /** Un robot de poste sans tâche rentre chez lui après ce délai. */
  idleLeaveMs: number;
  /** Un sous-agent qui a rendu son rapport part après ce délai. */
  subagentLeaveMs: number;
};

export const LIVE_OPTIONS: ReduceOptions = { idleLeaveMs: 90_000, subagentLeaveMs: 20_000 };

const SUB_NAMES =["Nova", "Pixel", "Bolt", "Écho", "Atlas", "Iris", "Orbit", "Comète", "Néon", "Volt"];

/**
 * Rejoue tous les événements pour reconstruire le bureau à l'instant `now`.
 * Déterministe : même liste + même `now` ⇒ même bureau.
 */
export function buildOffice(
  events: OfficeEvent[],
  now: number,
  opts: ReduceOptions = LIVE_OPTIONS,
  geo: Geometry = DEFAULT_GEOMETRY,
): OfficeState {
  const ZONES = geo.zones;
  const all: Record<string, Agent> = {};
  const seats = Object.fromEntries(ZONES.map((z) => [z.id, [null, null, null]])) as Record<
    ZoneId,
    (string | null)[]
  >;
  const tasks: Task[] = [];
  const byToolUse = new Map<string, Task>();
  const topLevel = new Set<string>();
  const aliases = new Map<string, string>();
  const pending: { key: string; type?: string; linked: boolean }[] = [];
  let subCount = 0;

  const chef: Chef = {
    name: geo.config.chefName,
    status: "idle",
    prompts: [],
    tasks: [],
    reportsDone: 0,
    reportsTotal: 0,
  };
  let lastPromptTs = -Infinity;
  let stoppedAt = -Infinity;

  const leaveDelay = (a: Agent) => (a.kind === "subagent" ? opts.subagentLeaveMs : opts.idleLeaveMs);
  const refresh = (a: Agent) => {
    a.busy = a.tasks.some((t) => t.end === undefined);
  };
  const isGone = (a: Agent, t: number) => !a.busy && t > a.lastActive + leaveDelay(a) + WALK_MS;
  const seatFree = (zone: ZoneId, i: number, t: number) => {
    const occ = seats[zone][i];
    return occ === null || isGone(all[occ], t);
  };

  function seatAgent(a: Agent, zone: ZoneId, i: number, t: number) {
    seats[zone][i] = a.key;
    a.zone = zone;
    a.seat = i;
    a.enterAt = t;
    a.leaveAt = undefined;
  }

  function pickSeatRobot(zone: ZoneId, t: number): Agent | null {
    const present = seats[zone]
      .map((k) => (k ? all[k] : null))
      .filter((a): a is Agent => !!a && a.kind === "seat" && !isGone(a, t));
    const idle = present.filter((a) => !a.busy).sort((a, b) => b.lastActive - a.lastActive)[0];
    if (idle) return idle;
    for (let i = 0; i < 3; i++) {
      if (!seatFree(zone, i, t)) continue;
      const key = `seat:${zone}:${i}`;
      const z = geo.byId[zone];
      const a: Agent = (all[key] ??= {
        key,
        name: z.names[i],
        role: z.role,
        kind: "seat",
        zone,
        seat: i,
        tasks: [],
        enterAt: t,
        lastActive: t,
        busy: false,
        missionRunning: false,
      });
      seatAgent(a, zone, i, t);
      return a;
    }
    const running = (a: Agent) => a.tasks.filter((x) => x.end === undefined).length;
    return present.sort((a, b) => running(a) - running(b))[0] ?? null;
  }

  function createSubagent(key: string, type: string | undefined, t: number, mission?: string, detail?: string) {
    const name = SUB_NAMES[subCount % SUB_NAMES.length] + (subCount >= SUB_NAMES.length ? ` ${Math.floor(subCount / SUB_NAMES.length) + 1}` : "");
    subCount++;
    const home = zoneForAgentType(type);
    const a: Agent = {
      key,
      name,
      role: `Sous-agent${type ? ` · ${type}` : ""}`,
      kind: "subagent",
      zone: home,
      seat: -1,
      agentType: type,
      mission,
      missionDetail: detail,
      tasks: [],
      enterAt: t,
      lastActive: t,
      busy: true,
      missionRunning: true,
    };
    all[key] = a;
    const order = [home, ...ZONES.map((z) => z.id).filter((z) => z !== home)];
    outer: for (const zone of order) {
      for (let i = 0; i < 3; i++) {
        if (seatFree(zone, i, t)) {
          seatAgent(a, zone, i, t);
          break outer;
        }
      }
    }
    const missionTask: Task = {
      id: `mission:${key}`,
      agentKey: key,
      tool: "Mission",
      zone: a.zone,
      icon: "🎯",
      summary: `Mission : ${shortText(mission ?? type ?? "travail délégué", 90)}`,
      detail: detail,
      start: t,
    };
    a.tasks.push(missionTask);
    tasks.push(missionTask);
    topLevel.add(missionTask.id);
    return a;
  }

  function finishMission(a: Agent, t: number, ok = true) {
    if (!a.missionRunning) return;
    a.missionRunning = false;
    const m = a.tasks.find((x) => x.id === `mission:${a.key}`);
    if (m && m.end === undefined) {
      m.end = t;
      m.ok = ok;
      m.output = a.finalMessage;
    }
    a.lastActive = t;
    refresh(a);
  }

  /** Retrouve (ou crée) le robot d'un sous-agent à partir de son agent_id. */
  function resolveSub(agentId: string, type: string | undefined, t: number): Agent {
    const known = aliases.get(agentId);
    if (known) return all[known];
    // Journal de session : l'agentId d'un sous-agent est l'id de l'appel « Agent » qui l'a lancé.
    const direct = pending.find((x) => !x.linked && x.key === `task:${agentId}`);
    if (direct) {
      direct.linked = true;
      aliases.set(agentId, direct.key);
      return all[direct.key];
    }
    const p =
      pending.find((x) => !x.linked && type && x.type === type) ?? pending.find((x) => !x.linked);
    if (p) {
      p.linked = true;
      aliases.set(agentId, p.key);
      return all[p.key];
    }
    const a = createSubagent(`sub:${agentId}`, type, t);
    aliases.set(agentId, a.key);
    return a;
  }

  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  for (const ev of sorted) {
    const t = ev.ts;
    switch (ev.type) {
      case "prompt": {
        // Les notifications système (GitHub, tâches de fond…) arrivent aussi
        // par UserPromptSubmit : ce ne sont pas des requêtes de l'utilisateur.
        if (isSystemPrompt(ev.text)) break;
        const text = ev.text?.trim() || "(requête vide)";
        chef.prompts.push({ ts: t, text });
        chef.currentPrompt = text;
        lastPromptTs = t;
        break;
      }
      case "tool_start": {
        const tool = ev.tool ?? "Outil";
        const d = describeTool(tool, ev.input);
        let owner: Agent | null = null;
        let zone: ZoneId | "chef";
        if (ev.agentId) {
          owner = resolveSub(ev.agentId, ev.agentType, t);
          zone = owner.zone;
        } else {
          zone = zoneForTool(tool, ev.input);
          if (zone !== "chef") owner = pickSeatRobot(zone, t);
        }
        const task: Task = {
          id: ev.toolUseId ?? ev.id,
          agentKey: owner?.key ?? "chef",
          tool,
          zone: owner ? owner.zone : "chef",
          icon: d.icon,
          summary: d.summary,
          detail: d.detail,
          input: ev.input,
          start: t,
        };
        tasks.push(task);
        byToolUse.set(task.id, task);
        if (owner) {
          owner.tasks.push(task);
          owner.lastActive = t;
          refresh(owner);
          if (!ev.agentId) topLevel.add(task.id);
        } else {
          chef.tasks.push(task);
        }
        if (!ev.agentId && /^(agent|task)$/i.test(tool)) {
          const type = typeof ev.input?.subagent_type === "string" ? ev.input.subagent_type : undefined;
          const desc = typeof ev.input?.description === "string" ? ev.input.description : undefined;
          const prompt = typeof ev.input?.prompt === "string" ? ev.input.prompt : undefined;
          const key = `task:${task.id}`;
          createSubagent(key, type, t, desc, prompt);
          pending.push({ key, type, linked: false });
        }
        break;
      }
      case "tool_end": {
        const task = ev.toolUseId ? byToolUse.get(ev.toolUseId) : undefined;
        if (!task || task.end !== undefined) break;
        task.end = t;
        task.ok = ev.ok !== false;
        task.output = ev.output;
        const owner = all[task.agentKey];
        if (owner) {
          owner.lastActive = t;
          refresh(owner);
        }
        if (/^(agent|task)$/i.test(task.tool) && task.agentKey === "chef") {
          const sub = all[`task:${task.id}`];
          const linked = pending.find((p) => p.key === sub?.key)?.linked;
          if (sub) {
            sub.finalMessage ??= ev.output;
            // Lancé en arrière-plan : on attend le SubagentStop pour clore la mission.
            const background = ev.input?.run_in_background === true || task.input?.run_in_background === true;
            if (!(linked && background)) finishMission(sub, t, task.ok);
          }
        }
        break;
      }
      case "subagent_start": {
        if (ev.agentId) {
          const a = resolveSub(ev.agentId, ev.agentType, t);
          a.lastActive = t;
        }
        break;
      }
      case "subagent_end": {
        const key = ev.agentId ? aliases.get(ev.agentId) : undefined;
        const a = key ? all[key] : undefined;
        if (a) {
          if (ev.text) a.finalMessage = ev.text;
          finishMission(a, t);
        }
        break;
      }
      case "stop":
        stoppedAt = t;
        break;
    }
  }

  // Présence à l'instant `now`.
  const present: Agent[] = [];
  for (const zone of ZONES) {
    seats[zone.id].forEach((key) => {
      if (!key) return;
      const a = all[key];
      if (isGone(a, now)) return;
      a.leaveAt = a.busy ? undefined : a.lastActive + leaveDelay(a);
      present.push(a);
    });
  }

  const sinceLast = tasks.filter((x) => topLevel.has(x.id) && x.start >= lastPromptTs);
  chef.reportsTotal = sinceLast.length;
  chef.reportsDone = sinceLast.filter((x) => x.end !== undefined).length;
  const running = chef.reportsTotal - chef.reportsDone;
  const chefBusy = chef.tasks.some((x) => x.end === undefined && x.start >= lastPromptTs);
  if (running > 0) chef.status = "waiting";
  else if (chef.prompts.length === 0) chef.status = "idle";
  else if (stoppedAt >= lastPromptTs && !chefBusy) chef.status = "done";
  else chef.status = "thinking";

  return { chef, present, all, tasks, now };
}

/** Tâche à afficher dans la bulle d'un robot. */
export function currentTask(a: Agent): Task | undefined {
  const running = a.tasks.filter((t) => t.end === undefined);
  return (
    running.filter((t) => t.tool !== "Mission").at(-1) ??
    running.at(-1) ??
    a.tasks.at(-1)
  );
}
