// Généré par `npm run build:plugin-office` depuis scripts/plugin-office et src/ : ne pas modifier à la main.

// src/lib/office/layout.ts
var SCENE_W = 384;
var SCENE_H = 320;
var WALL_H = 44;
var HEX = /^#[0-9a-f]{6}$/i;
var DECOR_IDS = [
  "fenetreG",
  "fenetreD",
  "cadre",
  "tableau",
  "horloge",
  "petitCadre",
  "serveur",
  "fontaine",
  "planteG",
  "canape",
  "bibliotheque",
  "poubelle",
  "cactus",
  "paillasson",
  "planteBas",
  "jukebox",
  "plantePetite",
  "cuisine",
  "chat"
];
var DECOR_DEFAULT = {
  fenetreG: [6, 6],
  fenetreD: [306, 6],
  cadre: [86, 9],
  tableau: [126, 2],
  horloge: [255, 7],
  petitCadre: [276, 6],
  serveur: [252, 26],
  fontaine: [18, 146],
  planteG: [112, 166],
  canape: [8, 280],
  bibliotheque: [70, 264],
  poubelle: [118, 293],
  cactus: [146, 272],
  paillasson: [172, 306],
  planteBas: [222, 296],
  jukebox: [248, 262],
  plantePetite: [290, 298],
  cuisine: [306, 288],
  chat: [230, 176]
};
var ZONE_SIZE = {
  recherche: { w: 132, h: 78 },
  code: { w: 132, h: 66 },
  design: { w: 132, h: 66 },
  action: { w: 132, h: 70 },
  analyse: { w: 132, h: 66 }
};
var DEFAULT_CONFIG = {
  version: 1,
  title: "Le Bureau de Claude",
  chefName: "Max",
  chef: { x: 150, y: 84 },
  wall: "#2b2236",
  floor: "#2e2420",
  zones: [
    {
      id: "recherche",
      label: "RECHERCHE",
      role: "Chercheur",
      x: 6,
      y: 54,
      rug: "#294766",
      accent: "#7cc4ff",
      names: ["Hugo", "Zo\xE9", "L\xE9o"]
    },
    {
      id: "code",
      label: "CODE",
      role: "D\xE9veloppeur",
      x: 246,
      y: 54,
      rug: "#2a5648",
      accent: "#7ef0b0",
      names: ["In\xE8s", "Tom", "Nina"]
    },
    {
      id: "design",
      label: "DESIGN",
      role: "Designer",
      x: 246,
      y: 128,
      rug: "#55304f",
      accent: "#ff8fcf",
      names: ["Jade", "Paul", "Chlo\xE9"]
    },
    {
      id: "action",
      label: "ACTION",
      role: "Op\xE9rateur",
      x: 6,
      y: 186,
      rug: "#352d63",
      accent: "#b49cff",
      names: ["Lucas", "Emma", "Noah"]
    },
    {
      id: "analyse",
      label: "ANALYSE",
      role: "Analyste",
      x: 246,
      y: 202,
      rug: "#56552a",
      accent: "#e8e070",
      names: ["Lina", "Arthur", "Rose"]
    }
  ],
  decor: DECOR_IDS.map((id) => ({ id, x: DECOR_DEFAULT[id][0], y: DECOR_DEFAULT[id][1], visible: true }))
};
function geometry(cfg) {
  const zones = cfg.zones.map((z) => ({
    ...z,
    ...ZONE_SIZE[z.id],
    rugDark: shade(z.rug, -0.3)
  }));
  const { x, y } = cfg.chef;
  const mat = cfg.decor.find((d) => d.id === "paillasson") ?? { x: 172, y: 306 };
  return {
    zones,
    byId: Object.fromEntries(zones.map((z) => [z.id, z])),
    chef: {
      rug: { x, y, w: 84, h: 74 },
      desk: { x: x + 8, y: y + 36, w: 68, h: 20 },
      anchor: { x: x + 42, y: y + 18 }
    },
    door: { x: mat.x + 20, y: mat.y + 10 },
    decor: cfg.decor,
    config: cfg
  };
}
var DEFAULT_GEOMETRY = geometry(DEFAULT_CONFIG);
var DESK_W = 36;
var DESK_H = 16;
function deskRect(zone, seat) {
  return {
    x: zone.x + 7 + seat * 41,
    y: zone.y + zone.h - 22,
    w: DESK_W,
    h: DESK_H
  };
}
function seatAnchor(zone, seat) {
  const d = deskRect(zone, seat);
  return { x: d.x + 18, y: d.y - 16 };
}
function shade(hex2, amt) {
  if (!HEX.test(hex2)) return hex2;
  const n = parseInt(hex2.slice(1), 16);
  const target = amt < 0 ? 0 : 255;
  const k = Math.min(1, Math.abs(amt));
  const ch = (v) => Math.round(v + (target - v) * k);
  const [r2, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map(ch);
  return `#${(1 << 24 | r2 << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// src/lib/office/describe.ts
var str = (v) => typeof v === "string" ? v : void 0;
var basename = (p) => p ? p.split(/[\\/]/).filter(Boolean).pop() ?? p : "";
var host = (u) => {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
var DESIGN_EXT = /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|fig|sketch)$/i;
function zoneForTool(tool, input) {
  const t = tool.toLowerCase();
  if (["agent", "task", "todowrite", "askuserquestion", "enterplanmode", "exitplanmode"].includes(t))
    return "chef";
  if (t.startsWith("task") && t !== "task") return "chef";
  if (t === "websearch" || t === "webfetch" || /search|fetch|browse/.test(t)) return "recherche";
  if (["read", "grep", "glob", "ls", "notebookread", "toolsearch"].includes(t)) return "analyse";
  if (["edit", "write", "multiedit", "notebookedit"].includes(t)) {
    const path = str(input?.file_path) ?? str(input?.notebook_path) ?? "";
    return DESIGN_EXT.test(path) ? "design" : "code";
  }
  if (/artifact|design|figma|canvas|image/.test(t)) return "design";
  return "action";
}
function zoneForAgentType(type) {
  const t = (type ?? "").toLowerCase();
  if (/explore|research|fetch|search|web/.test(t)) return "recherche";
  if (/plan|review|audit|analy|security/.test(t)) return "analyse";
  if (/design|ui|ux|artifact/.test(t)) return "design";
  if (/test|run|deploy|ops|shell|statusline/.test(t)) return "action";
  return "code";
}
var clip = (s, n = 140) => s.length > n ? `${s.slice(0, n - 1)}\u2026` : s;
function describeTool(tool, input) {
  const t = tool.toLowerCase();
  const path = str(input?.file_path) ?? str(input?.notebook_path) ?? str(input?.path);
  switch (t) {
    case "websearch":
      return { icon: "\u{1F50E}", summary: `Je cherche : ${clip(str(input?.query) ?? "\u2026")}`, detail: str(input?.query) };
    case "webfetch":
      return { icon: "\u{1F310}", summary: `Je lis ${host(str(input?.url))}`, detail: str(input?.url) };
    case "read":
      return { icon: "\u{1F4C4}", summary: `Je lis ${basename(path)}`, detail: path };
    case "grep":
      return { icon: "\u{1F50D}", summary: `Je fouille : ${clip(str(input?.pattern) ?? "")}`, detail: str(input?.path) ?? path };
    case "glob":
      return { icon: "\u{1F5C2}\uFE0F", summary: `Je liste ${clip(str(input?.pattern) ?? "")}`, detail: str(input?.pattern) };
    case "edit":
    case "multiedit":
      return { icon: "\u270F\uFE0F", summary: `Je modifie ${basename(path)}`, detail: path };
    case "write":
      return { icon: "\u{1F4DD}", summary: `J'\xE9cris ${basename(path)}`, detail: path };
    case "notebookedit":
      return { icon: "\u{1F4D3}", summary: `J'\xE9dite ${basename(path)}`, detail: path };
    case "bash": {
      const cmd = str(input?.command) ?? "";
      const desc = str(input?.description);
      return { icon: "\u2699\uFE0F", summary: `J'ex\xE9cute : ${clip(desc ?? cmd, 90)}`, detail: cmd };
    }
    case "agent":
    case "task": {
      const desc = str(input?.description) ?? "une mission";
      const type = str(input?.subagent_type);
      return {
        icon: "\u{1F916}",
        summary: `Je d\xE9l\xE8gue : ${clip(desc, 90)}`,
        detail: type ? `${type} \u2014 ${str(input?.prompt) ?? ""}` : str(input?.prompt)
      };
    }
    case "todowrite":
      return { icon: "\u{1F4CB}", summary: "Je planifie les \xE9tapes" };
    case "askuserquestion":
      return { icon: "\u2753", summary: "Je te pose une question" };
    case "skill":
      return { icon: "\u{1F9F0}", summary: `J'ouvre le guide ${str(input?.skill) ?? ""}`, detail: str(input?.args) };
    case "artifact":
      return { icon: "\u{1F3A8}", summary: "Je publie une page", detail: path ?? str(input?.url) };
    default: {
      const pretty = tool.startsWith("mcp__") ? tool.split("__").slice(1).join(" \u203A ") : tool;
      return { icon: "\u{1F6E0}\uFE0F", summary: `J'utilise ${clip(pretty, 60)}` };
    }
  }
}
var shortText = clip;
var isSystemPrompt = (text = "") => /^\s*<(task-notification|system-reminder)[\s>]/.test(text);

// src/lib/office/reduce.ts
var WALK_MS = 1800;
var STALE_MISSION_MS = 6e4;
var LIVE_OPTIONS = { idleLeaveMs: 9e4, subagentLeaveMs: 2e4 };
var SUB_NAMES = ["Nova", "Pixel", "Bolt", "\xC9cho", "Atlas", "Iris", "Orbit", "Com\xE8te", "N\xE9on", "Volt"];
function buildOffice(events, now, opts = LIVE_OPTIONS, geo2 = DEFAULT_GEOMETRY) {
  const ZONES = geo2.zones;
  const all = {};
  const seats = Object.fromEntries(ZONES.map((z) => [z.id, [null, null, null]]));
  const tasks = [];
  const byToolUse = /* @__PURE__ */ new Map();
  const topLevel = /* @__PURE__ */ new Set();
  const aliases = /* @__PURE__ */ new Map();
  const pending = [];
  let subCount = 0;
  const chef = {
    name: geo2.config.chefName,
    status: "idle",
    prompts: [],
    tasks: [],
    reportsDone: 0,
    reportsTotal: 0
  };
  let lastPromptTs = -Infinity;
  let stoppedAt = -Infinity;
  const leaveDelay = (a) => a.kind === "subagent" ? opts.subagentLeaveMs : opts.idleLeaveMs;
  const refresh = (a) => {
    a.busy = a.tasks.some((t) => t.end === void 0);
  };
  const isGone = (a, t) => !a.busy && t > a.lastActive + leaveDelay(a) + WALK_MS;
  const seatFree = (zone, i, t) => {
    const occ = seats[zone][i];
    return occ === null || isGone(all[occ], t);
  };
  function seatAgent(a, zone, i, t) {
    seats[zone][i] = a.key;
    a.zone = zone;
    a.seat = i;
    a.enterAt = t;
    a.leaveAt = void 0;
  }
  function pickSeatRobot(zone, t) {
    const present2 = seats[zone].map((k) => k ? all[k] : null).filter((a) => !!a && a.kind === "seat" && !isGone(a, t));
    const idle = present2.filter((a) => !a.busy).sort((a, b) => b.lastActive - a.lastActive)[0];
    if (idle) return idle;
    for (let i = 0; i < 3; i++) {
      if (!seatFree(zone, i, t)) continue;
      const key = `seat:${zone}:${i}`;
      const z = geo2.byId[zone];
      const a = all[key] ??= {
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
        missionRunning: false
      };
      seatAgent(a, zone, i, t);
      return a;
    }
    const running2 = (a) => a.tasks.filter((x) => x.end === void 0).length;
    return present2.sort((a, b) => running2(a) - running2(b))[0] ?? null;
  }
  function createSubagent(key, type, t, mission, detail) {
    const name = SUB_NAMES[subCount % SUB_NAMES.length] + (subCount >= SUB_NAMES.length ? ` ${Math.floor(subCount / SUB_NAMES.length) + 1}` : "");
    subCount++;
    const home = zoneForAgentType(type);
    const a = {
      key,
      name,
      role: `Sous-agent${type ? ` \xB7 ${type}` : ""}`,
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
      missionRunning: true
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
    const missionTask = {
      id: `mission:${key}`,
      agentKey: key,
      tool: "Mission",
      zone: a.zone,
      icon: "\u{1F3AF}",
      summary: `Mission : ${shortText(mission ?? type ?? "travail d\xE9l\xE9gu\xE9", 90)}`,
      detail,
      start: t
    };
    a.tasks.push(missionTask);
    tasks.push(missionTask);
    topLevel.add(missionTask.id);
    return a;
  }
  function finishMission(a, t, ok = true) {
    if (!a.missionRunning) return;
    a.missionRunning = false;
    const m = a.tasks.find((x) => x.id === `mission:${a.key}`);
    if (m && m.end === void 0) {
      m.end = t;
      m.ok = ok;
      m.output = a.finalMessage;
    }
    a.lastActive = t;
    refresh(a);
  }
  function resolveSub(agentId, type, t) {
    const known = aliases.get(agentId);
    if (known) return all[known];
    const direct = pending.find((x) => x.key === `task:${agentId}`);
    if (direct) {
      direct.linked = true;
      aliases.set(agentId, direct.key);
      return all[direct.key];
    }
    const fromTranscript = agentId.startsWith("toolu_");
    const p = fromTranscript ? void 0 : pending.find((x) => !x.linked && type && x.type === type) ?? pending.find((x) => !x.linked);
    if (p) {
      p.linked = true;
      aliases.set(agentId, p.key);
      return all[p.key];
    }
    const a = createSubagent(`sub:${agentId}`, type, t);
    a.autoClose = true;
    aliases.set(agentId, a.key);
    return a;
  }
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  for (const ev of sorted) {
    const t = ev.ts;
    switch (ev.type) {
      case "prompt": {
        if (isSystemPrompt(ev.text)) break;
        const text = ev.text?.trim() || "(requ\xEAte vide)";
        chef.prompts.push({ ts: t, text });
        chef.currentPrompt = text;
        lastPromptTs = t;
        break;
      }
      case "tool_start": {
        const tool = ev.tool ?? "Outil";
        const d = describeTool(tool, ev.input);
        let owner = null;
        let zone;
        if (ev.agentId) {
          owner = resolveSub(ev.agentId, ev.agentType, t);
          zone = owner.zone;
        } else {
          zone = zoneForTool(tool, ev.input);
          if (zone !== "chef") owner = pickSeatRobot(zone, t);
        }
        const task = {
          id: ev.toolUseId ?? ev.id,
          agentKey: owner?.key ?? "chef",
          tool,
          zone: owner ? owner.zone : "chef",
          icon: d.icon,
          summary: d.summary,
          detail: d.detail,
          input: ev.input,
          start: t
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
          const type = typeof ev.input?.subagent_type === "string" ? ev.input.subagent_type : void 0;
          const desc = typeof ev.input?.description === "string" ? ev.input.description : void 0;
          const prompt = typeof ev.input?.prompt === "string" ? ev.input.prompt : void 0;
          const key = `task:${task.id}`;
          createSubagent(key, type, t, desc, prompt);
          pending.push({ key, type, linked: false });
        }
        break;
      }
      case "tool_end": {
        const task = ev.toolUseId ? byToolUse.get(ev.toolUseId) : void 0;
        if (!task && ev.toolUseId && !ev.agentId) {
          const key = aliases.get(ev.toolUseId);
          const sub = key ? all[key] : void 0;
          if (sub) {
            sub.finalMessage ??= ev.output;
            finishMission(sub, t, ev.ok !== false);
          }
          break;
        }
        if (!task || task.end !== void 0) break;
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
            const background2 = ev.input?.run_in_background === true || task.input?.run_in_background === true;
            if (background2) {
              sub.autoClose = true;
              if (!linked) sub.lastActive = t;
            } else {
              sub.finalMessage ??= ev.output;
              finishMission(sub, t, task.ok);
            }
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
        const key = ev.agentId ? aliases.get(ev.agentId) : void 0;
        const a = key ? all[key] : void 0;
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
  for (const a of Object.values(all)) {
    if (!a.autoClose || !a.missionRunning) continue;
    const working = a.tasks.some((x) => x.end === void 0 && x.tool !== "Mission");
    if (!working && now - a.lastActive > STALE_MISSION_MS) finishMission(a, a.lastActive);
  }
  const present = [];
  for (const zone of ZONES) {
    seats[zone.id].forEach((key) => {
      if (!key) return;
      const a = all[key];
      if (isGone(a, now)) return;
      a.leaveAt = a.busy ? void 0 : a.lastActive + leaveDelay(a);
      present.push(a);
    });
  }
  const sinceLast = tasks.filter((x) => topLevel.has(x.id) && x.start >= lastPromptTs);
  chef.reportsTotal = sinceLast.length;
  chef.reportsDone = sinceLast.filter((x) => x.end !== void 0).length;
  const running = chef.reportsTotal - chef.reportsDone;
  const chefBusy = chef.tasks.some((x) => x.end === void 0 && x.start >= lastPromptTs);
  const workedAfterStop = tasks.some((x) => x.start > stoppedAt);
  const lastActivity = tasks.reduce((m, x) => Math.max(m, x.end ?? x.start), -Infinity);
  if (running > 0) chef.status = "waiting";
  else if (chef.prompts.length === 0)
    chef.status = workedAfterStop && now - lastActivity < STALE_MISSION_MS * 2 ? "thinking" : "idle";
  else if (stoppedAt >= lastPromptTs && !workedAfterStop && !chefBusy) chef.status = "done";
  else chef.status = "thinking";
  return { chef, present, all, tasks, now };
}
function currentTask(a) {
  const running = a.tasks.filter((t) => t.end === void 0);
  return running.filter((t) => t.tool !== "Mission").at(-1) ?? running.at(-1) ?? a.tasks.at(-1);
}

// src/components/office/scene.ts
var OUTLINE = "#15121b";
function r(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = s * 1664525 + 1013904223 >>> 0;
    return s / 2 ** 32;
  };
}
function drawWindow(ctx, x, y, w, h, seed) {
  r(ctx, x - 2, y - 2, w + 4, h + 4, "#4a3b55");
  const bands = ["#251c49", "#2f2157", "#3e2864", "#5a3170", "#80406f", "#b2566c", "#d9786a"];
  const bh = h / bands.length;
  bands.forEach((c, i) => r(ctx, x, y + Math.floor(i * bh), w, Math.ceil(bh) + 1, c));
  const rand = rng(seed);
  for (let i = 0; i < 10; i++) r(ctx, x + rand() * w, y + rand() * (h / 2), 1, 1, "#d8d0ff");
  let bx = x;
  while (bx < x + w) {
    const bw = 5 + Math.floor(rand() * 8);
    const bhh = 7 + Math.floor(rand() * (h - 9));
    const top = y + h - bhh;
    const ww = Math.min(bw, x + w - bx);
    r(ctx, bx, top, ww, bhh, rand() > 0.5 ? "#1a1430" : "#211a3a");
    for (let wy = top + 2; wy < y + h - 1; wy += 3)
      for (let wx = bx + 1; wx < bx + ww - 1; wx += 2)
        if (rand() > 0.72) r(ctx, wx, wy, 1, 1, rand() > 0.3 ? "#ffd27a" : "#ff9f5a");
    bx += bw;
  }
  r(ctx, x + Math.floor(w / 2), y, 2, h, "#4a3b55");
  r(ctx, x - 3, y + h + 2, w + 6, 2, "#5c4a66");
}
function drawPlant(ctx, x, y, size = "m") {
  const s = size === "s" ? 0.8 : size === "l" ? 1.4 : 1;
  const pw = Math.round(10 * s);
  const ph = Math.round(8 * s);
  const leaves = [
    [0, -4, 6, 5],
    [-4, -8, 6, 5],
    [3, -10, 6, 6],
    [-2, -14, 6, 5],
    [5, -5, 5, 4],
    [-5, -3, 5, 4]
  ];
  leaves.forEach(
    ([lx, ly, lw, lh], i) => r(ctx, x + pw / 2 + lx * s - 3, y + ly * s, Math.round(lw * s), Math.round(lh * s), i % 2 ? "#2f6a3a" : "#4a9a52")
  );
  r(ctx, x, y, pw, ph, "#b0603a");
  r(ctx, x - 1, y, pw + 2, 2, "#c8744a");
  r(ctx, x, y + ph - 1, pw, 1, "#8a4a2a");
}
var BOOKS = ["#c0504a", "#4a7ac0", "#e0b040", "#5aa05a", "#a060c0", "#e07a3a", "#d8d8e0"];
var DECOR_DRAW = {
  fenetreG: (ctx, x, y) => drawWindow(ctx, x, y, 68, 28, 11),
  fenetreD: (ctx, x, y) => drawWindow(ctx, x, y, 72, 28, 23),
  cadre: (ctx, x, y) => {
    r(ctx, x, y, 24, 16, "#c9852f");
    r(ctx, x + 2, y + 2, 20, 12, "#3a2a1a");
    r(ctx, x + 5, y + 6, 5, 4, "#f2c230");
    r(ctx, x + 14, y + 6, 5, 4, "#f2c230");
  },
  tableau: (ctx, x, y) => {
    r(ctx, x, y, 124, 37, "#8c8aa0");
    r(ctx, x + 2, y + 2, 120, 32, "#e4dff0");
    r(ctx, x + 2, y + 26, 120, 8, "#d6d0e6");
    [
      [10, 8, 30],
      [10, 12, 22],
      [10, 16, 34],
      [50, 8, 18]
    ].forEach(([lx, ly, w]) => r(ctx, x + lx, y + ly, w, 1, "#b9b2cf"));
    for (let i = 0; i < 5; i++) r(ctx, x + 82 + i * 7, y + 25, 5, 4, "#3b6fd8");
    r(ctx, x + 24, y + 35, 70, 2, "#6c6a80");
  },
  horloge: () => {
  },
  petitCadre: (ctx, x, y) => {
    r(ctx, x, y, 16, 20, "#c9852f");
    r(ctx, x + 2, y + 2, 12, 16, "#3a3040");
    for (let i = 0; i < 10; i++) r(ctx, x + 3 + i, y + 16 - i, 1, 1, "#e07a3a");
  },
  serveur: (ctx, x, y) => {
    r(ctx, x, y, 16, 50, OUTLINE);
    r(ctx, x + 1, y + 1, 14, 48, "#1d1b24");
    for (let dy = 4; dy < 48; dy += 5) r(ctx, x + 2, y + dy, 12, 1, "#2c2934");
  },
  fontaine: (ctx, x, y) => {
    r(ctx, x, y + 12, 12, 18, "#c8ccd8");
    r(ctx, x, y + 12, 12, 2, "#e8ecf4");
    r(ctx, x + 2, y, 8, 12, "#7cc4ff");
    r(ctx, x + 3, y + 1, 2, 9, "#b6e2ff");
    r(ctx, x + 4, y + 18, 4, 2, "#5a6070");
  },
  planteG: (ctx, x, y) => drawPlant(ctx, x, y, "l"),
  canape: (ctx, x, y) => {
    r(ctx, x, y, 56, 30, OUTLINE);
    r(ctx, x + 1, y + 1, 54, 11, "#c8642c");
    r(ctx, x + 1, y + 12, 54, 12, "#e07a3a");
    r(ctx, x + 4, y + 13, 23, 2, "#f09a5a");
    r(ctx, x + 29, y + 13, 23, 2, "#f09a5a");
    r(ctx, x + 1, y + 1, 5, 23, "#b0552a");
    r(ctx, x + 50, y + 1, 5, 23, "#b0552a");
    r(ctx, x + 3, y + 24, 3, 5, "#3a2414");
    r(ctx, x + 50, y + 24, 3, 5, "#3a2414");
    r(ctx, x + 14, y - 3, 5, 4, "#f4f0e8");
    r(ctx, x + 22, y - 3, 5, 4, "#f4f0e8");
  },
  bibliotheque: (ctx, x, y) => {
    r(ctx, x, y, 34, 48, OUTLINE);
    r(ctx, x + 1, y + 1, 32, 46, "#5a3a24");
    const rb = rng(3);
    for (let s = 0; s < 3; s++) {
      const sy = y + 3 + s * 15;
      r(ctx, x + 2, sy + 12, 30, 2, "#3a2414");
      let bx = x + 3;
      while (bx < x + 30) {
        const bw = 2 + Math.floor(rb() * 3);
        const bh = 8 + Math.floor(rb() * 4);
        r(ctx, bx, sy + 12 - bh, Math.min(bw, x + 32 - bx), bh, BOOKS[Math.floor(rb() * BOOKS.length)]);
        bx += bw + (rb() > 0.8 ? 2 : 0);
      }
    }
  },
  poubelle: (ctx, x, y) => {
    r(ctx, x, y + 1, 12, 16, OUTLINE);
    r(ctx, x + 1, y + 2, 10, 14, "#6a6a78");
    r(ctx, x, y, 12, 2, "#8a8a98");
    r(ctx, x + 4, y + 4, 1, 10, "#555562");
    r(ctx, x + 8, y + 4, 1, 10, "#555562");
  },
  cactus: (ctx, x, y) => {
    r(ctx, x + 1, y + 26, 12, 12, "#d8d8d8");
    r(ctx, x + 4, y, 6, 26, "#4f9a58");
    r(ctx, x, y + 8, 4, 8, "#4f9a58");
    r(ctx, x + 10, y + 4, 4, 8, "#4f9a58");
    r(ctx, x + 6, y + 2, 1, 22, "#6fba78");
  },
  paillasson: (ctx, x, y) => {
    r(ctx, x, y, 40, 14, "#a8502a");
    r(ctx, x + 2, y + 2, 36, 10, "#c8642c");
    for (let dx = 4; dx < 36; dx += 4) r(ctx, x + dx, y + 3, 2, 8, "#a8502a");
  },
  planteBas: (ctx, x, y) => drawPlant(ctx, x, y, "m"),
  jukebox: (ctx, x, y) => {
    r(ctx, x, y, 38, 52, OUTLINE);
    r(ctx, x + 1, y + 8, 36, 43, "#5a2a1a");
    r(ctx, x + 5, y + 2, 28, 8, "#5a2a1a");
    r(ctx, x + 6, y + 22, 26, 10, "#1a0e0a");
    r(ctx, x + 8, y + 34, 22, 14, "#3a1a10");
    for (let dy = 36; dy < 47; dy += 2) r(ctx, x + 9, y + dy, 20, 1, "#6a3a24");
  },
  plantePetite: (ctx, x, y) => drawPlant(ctx, x, y, "s"),
  cuisine: (ctx, x, y) => {
    r(ctx, x, y, 76, 30, OUTLINE);
    r(ctx, x + 1, y + 1, 74, 4, "#f0f0f4");
    r(ctx, x + 1, y + 5, 74, 24, "#d8d8e0");
    for (let dx = 1; dx < 74; dx += 18) {
      r(ctx, x + dx, y + 5, 1, 24, "#a0a0b0");
      r(ctx, x + dx + 8, y + 12, 3, 1, "#808090");
    }
    r(ctx, x + 8, y - 14, 14, 15, "#2a2830");
    r(ctx, x + 10, y - 12, 10, 4, "#4a4855");
    r(ctx, x + 13, y - 5, 4, 5, "#f4f0e8");
    r(ctx, x + 30, y - 4, 4, 5, "#f4f0e8");
    r(ctx, x + 37, y - 4, 4, 5, "#7cc4ff");
    drawPlant(ctx, x + 58, y - 10, "m");
  },
  chat: () => {
  }
};
var DECOR_ANIM = {
  horloge: (ctx, x, y, t) => {
    const d = new Date(t);
    r(ctx, x, y, 15, 15, OUTLINE);
    r(ctx, x + 1, y + 1, 13, 13, "#d8d8e0");
    const hand = (angle, len, c) => {
      for (let i = 0; i <= len; i++)
        r(ctx, x + 7 + Math.round(Math.sin(angle) * i), y + 7 - Math.round(Math.cos(angle) * i), 1, 1, c);
    };
    hand((d.getHours() % 12 + d.getMinutes() / 60) * (Math.PI / 6), 3, OUTLINE);
    hand(d.getMinutes() * (Math.PI / 30), 5, "#55505f");
  },
  serveur: (ctx, x, y, t) => {
    for (let i = 0; i < 9; i++) {
      const on = Math.floor(t / (180 + i * 37) + i) % 3 !== 0;
      r(ctx, x + 3 + i % 3 * 4, y + 6 + Math.floor(i / 3) * 14, 2, 1, on ? i % 2 ? "#7ef0b0" : "#ffb070" : "#2c2934");
    }
  },
  jukebox: (ctx, x, y, t) => {
    const rainbow = ["#ff5a5a", "#ffa040", "#ffe060", "#7ef07a", "#5ac8ff", "#b48cff"];
    rainbow.forEach((_, i) => {
      const k = (i + Math.floor(t / 200)) % rainbow.length;
      r(ctx, x + 4 + i * 5, y + 4 + Math.abs(i - 2.5) * 2, 4, 3, rainbow[k]);
    });
    r(ctx, x + 8, y + 24, 22, 6, Math.floor(t / 300) % 2 ? "#3a1a10" : "#5a2a10");
    const nt = t % 3e3 / 3e3;
    ctx.globalAlpha = 1 - nt;
    r(ctx, x + 34 + nt * 6, y - nt * 14, 2, 2, "#ff8fcf");
    r(ctx, x + 36 + nt * 6, y - 4 - nt * 14, 1, 4, "#ff8fcf");
    ctx.globalAlpha = 1;
  },
  cuisine: (ctx, x, y, t) => {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const k = (t / 900 + i / 3) % 1;
      r(ctx, x + 14 + Math.sin(k * 6 + i) * 2, y - 16 - k * 10, 1, 2, "#e8e8f0");
    }
    ctx.globalAlpha = 1;
  },
  chat: (ctx, x, y, t) => {
    r(ctx, x, y + 3, 8, 7, "#141218");
    r(ctx, x + 1, y, 6, 4, "#141218");
    r(ctx, x + 1, y - 1, 1, 1, "#141218");
    r(ctx, x + 6, y - 1, 1, 1, "#141218");
    if ((t + 900) % 4200 > 160) {
      r(ctx, x + 2, y + 1, 1, 1, "#f2c230");
      r(ctx, x + 5, y + 1, 1, 1, "#f2c230");
    }
    const tail = Math.floor(t / 400) % 4;
    r(ctx, x + 8, y + 8 - (tail === 1 ? 1 : 0), 3, 1, "#141218");
    r(ctx, x + 10, y + 5 + (tail === 2 ? 1 : 0), 1, 3, "#141218");
  }
};
function drawRug(ctx, z, rug, dark) {
  r(ctx, z.x, z.y, z.w, z.h, dark);
  r(ctx, z.x + 2, z.y + 2, z.w - 4, z.h - 4, rug);
  ctx.globalAlpha = 0.18;
  for (let yy = z.y + 4; yy < z.y + z.h - 3; yy += 4)
    for (let xx = z.x + 4 + yy / 4 % 2 * 2; xx < z.x + z.w - 3; xx += 4) r(ctx, xx, yy, 1, 1, "#ffffff");
  ctx.globalAlpha = 1;
}
function drawChair(ctx, cx, top, w = 14, h = 13) {
  r(ctx, cx - w / 2 - 1, top - 1, w + 2, h + 1, OUTLINE);
  r(ctx, cx - w / 2, top, w, h, "#1f1e27");
  r(ctx, cx - w / 2 + 1, top + 1, w - 2, 2, "#2f2e3a");
}
function drawBackground(ctx, geo2) {
  ctx.imageSmoothingEnabled = false;
  const { floor, wall } = geo2.config;
  const floorLight = shade(floor, 0.06);
  const floorDark = shade(floor, -0.1);
  const mortar = shade(floor, -0.25);
  r(ctx, 0, 0, SCENE_W, SCENE_H, floor);
  const rand = rng(7);
  for (let row = 0; row * 8 + WALL_H < SCENE_H; row++) {
    const y = WALL_H + row * 8;
    const off = row % 2 ? 8 : 0;
    for (let x = -off; x < SCENE_W; x += 16) {
      const v = rand();
      r(ctx, x, y, 16, 8, v > 0.8 ? floorLight : v < 0.2 ? floorDark : floor);
      r(ctx, x, y, 16, 1, mortar);
      r(ctx, x, y, 1, 8, mortar);
    }
  }
  r(ctx, 0, 0, SCENE_W, WALL_H, wall);
  for (let x = 0; x < SCENE_W; x += 24) r(ctx, x, 2, 1, 38, shade(wall, -0.15));
  r(ctx, 0, 0, SCENE_W, 2, shade(wall, -0.35));
  r(ctx, 0, 40, SCENE_W, 4, shade(wall, -0.42));
  r(ctx, 0, 40, SCENE_W, 1, shade(wall, 0.12));
  r(ctx, 0, WALL_H, SCENE_W, 3, shade(floor, -0.3));
  const onWall = (d) => d.y < WALL_H;
  for (const d of geo2.decor) if (d.visible && onWall(d)) DECOR_DRAW[d.id](ctx, d.x, d.y);
  for (const z of geo2.zones) {
    drawRug(ctx, z, z.rug, z.rugDark);
    for (let i = 0; i < 3; i++) {
      const d = deskRect(z, i);
      drawChair(ctx, d.x + 18, d.y - 19, 18, 17);
    }
  }
  drawRug(ctx, geo2.chef.rug, "#4e321e", "#3a2414");
  drawChair(ctx, geo2.chef.anchor.x, geo2.chef.desk.y - 22, 22, 20);
  for (const d of geo2.decor) if (d.visible && !onWall(d)) DECOR_DRAW[d.id](ctx, d.x, d.y);
}
function drawRobot(ctx, cx, top, look, o) {
  const { t, seed } = o;
  const chef = look.zone === "chef";
  const bob = o.walking ? Math.floor(t / 160) % 2 : o.busy ? Math.floor((t + seed * 97) / 420) % 2 : 0;
  const y = top + bob;
  const body = chef ? "#3a3844" : look.subagent ? "#d6ecff" : "#e9eef4";
  const head = chef ? "#e8873a" : body;
  const shadeC = chef ? "#b8652a" : look.subagent ? "#9fc0dc" : "#b8c2cf";
  const blink = (t + seed * 431) % 3800 < 140;
  const eye = o.busy || chef ? chef ? "#ffb070" : look.accent : "#6a8a9a";
  if (o.selected) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t / 180);
    r(ctx, cx - 10, y - 8, 20, 30, "#fff3b0");
    ctx.globalAlpha = 1;
  }
  if (o.walking) {
    const step = Math.floor(t / 160) % 2;
    r(ctx, cx - 4, y + 17, 3, step ? 4 : 3, OUTLINE);
    r(ctx, cx + 1, y + 17, 3, step ? 3 : 4, OUTLINE);
  }
  r(ctx, cx - 6, y + 8, 12, 10, OUTLINE);
  r(ctx, cx - 5, y + 9, 10, 8, chef ? body : "#cdd6e0");
  if (chef) r(ctx, cx - 1, y + 10, 2, 5, "#e07a3a");
  else r(ctx, cx - 1, y + 11, 2, 2, look.accent);
  const type = o.busy && !o.walking ? Math.floor((t + seed * 53) / 140) % 2 : 0;
  r(ctx, cx - 8, y + 10 + type, 2, 5, OUTLINE);
  r(ctx, cx + 6, y + 11 - type, 2, 5, OUTLINE);
  r(ctx, cx - 7, y - 1, 14, 11, OUTLINE);
  r(ctx, cx - 6, y, 12, 9, head);
  r(ctx, cx - 6, y + 8, 12, 1, shadeC);
  r(ctx, cx - 4, y + 2, 8, 5, "#1d2433");
  if (blink) {
    r(ctx, cx - 3, y + 4, 2, 1, eye);
    r(ctx, cx + 1, y + 4, 2, 1, eye);
  } else {
    r(ctx, cx - 3, y + 3, 2, 2, eye);
    r(ctx, cx + 1, y + 3, 2, 2, eye);
  }
  if (look.subagent) {
    r(ctx, cx, y - 4, 1, 3, OUTLINE);
    const on = Math.floor(t / 300) % 2 === 0;
    r(ctx, cx - 1, y - 6, 3, 2, on ? look.accent : "#ffffff");
    return;
  }
  switch (look.zone) {
    case "recherche":
      r(ctx, cx - 9, y - 2, 18, 3, OUTLINE);
      r(ctx, cx - 8, y - 1, 16, 1, "#e8dcb0");
      r(ctx, cx - 6, y - 6, 12, 5, OUTLINE);
      r(ctx, cx - 5, y - 5, 10, 4, "#f0e6c0");
      r(ctx, cx - 5, y - 2, 10, 1, "#8a6a3a");
      break;
    case "code":
      r(ctx, cx - 5, y - 3, 10, 1, "#2b2b38");
      r(ctx, cx - 7, y - 2, 1, 4, "#2b2b38");
      r(ctx, cx + 6, y - 2, 1, 4, "#2b2b38");
      r(ctx, cx - 9, y + 2, 3, 4, "#ff7a59");
      r(ctx, cx + 6, y + 2, 3, 4, "#ff7a59");
      break;
    case "design":
      r(ctx, cx - 7, y - 3, 13, 3, "#d0457a");
      r(ctx, cx - 8, y - 1, 14, 1, "#a0305a");
      r(ctx, cx - 1, y - 4, 2, 1, "#a0305a");
      break;
    case "action":
      r(ctx, cx - 6, y - 5, 12, 4, OUTLINE);
      r(ctx, cx - 5, y - 4, 10, 3, "#f2c230");
      r(ctx, cx - 3, y - 4, 3, 1, "#ffe070");
      r(ctx, cx - 8, y - 1, 16, 1, "#d0a020");
      break;
    case "analyse":
      r(ctx, cx - 6, y - 3, 12, 3, "#5aa05a");
      r(ctx, cx + 1, y - 1, 8, 1, "#3a7a3a");
      break;
    case "chef":
      r(ctx, cx - 6, y, 12, 2, "#f2a050");
      break;
  }
}
function drawDesk(ctx, z, seat, busy, t) {
  const d = deskRect(z, seat);
  r(ctx, d.x - 1, d.y - 1, d.w + 2, d.h + 2, OUTLINE);
  r(ctx, d.x, d.y, d.w, 4, "#c08a52");
  r(ctx, d.x, d.y + 4, d.w, d.h - 4, "#8a5a34");
  r(ctx, d.x + 2, d.y + 7, d.w - 4, 1, "#6e4628");
  r(ctx, d.x + 2, d.y + 11, 10, 1, "#6e4628");
  r(ctx, d.x + d.w - 12, d.y + 11, 10, 1, "#6e4628");
  r(ctx, d.x + 10, d.y - 7, 16, 9, OUTLINE);
  r(ctx, d.x + 11, d.y - 6, 14, 7, "#2a2a33");
  const glow = busy && Math.floor(t / 500) % 2 === 0;
  r(ctx, d.x + 17, d.y - 3, 2, 2, busy ? glow ? z.accent : "#ffffff" : "#44444f");
  switch (z.id) {
    case "recherche":
      r(ctx, d.x + 2, d.y - 5, 6, 6, "#3b6fd8");
      r(ctx, d.x + 3, d.y - 4, 2, 2, "#5aa05a");
      r(ctx, d.x + 4, d.y + 1, 2, 2, "#5a3a24");
      break;
    case "code":
      r(ctx, d.x + 29, d.y - 4, 4, 5, "#f4f0e8");
      r(ctx, d.x + 33, d.y - 3, 1, 2, "#f4f0e8");
      break;
    case "design":
      r(ctx, d.x + 2, d.y - 3, 7, 4, "#f4f0e8");
      r(ctx, d.x + 3, d.y - 2, 1, 1, "#d0457a");
      r(ctx, d.x + 5, d.y - 2, 1, 1, "#3b6fd8");
      r(ctx, d.x + 7, d.y - 2, 1, 1, "#f2c230");
      break;
    case "action":
      r(ctx, d.x + 28, d.y - 2, 6, 3, "#f4f0e8");
      r(ctx, d.x + 29, d.y - 1, 4, 1, "#a0a0b0");
      break;
    case "analyse":
      r(ctx, d.x + 2, d.y - 6, 6, 7, "#f4f0e8");
      r(ctx, d.x + 3, d.y - 2, 1, 2, "#5aa05a");
      r(ctx, d.x + 5, d.y - 4, 1, 4, "#e07a3a");
      break;
  }
}
function drawChefDesk(ctx, d, busy, t) {
  r(ctx, d.x - 1, d.y - 1, d.w + 2, d.h + 2, OUTLINE);
  r(ctx, d.x, d.y, d.w, 5, "#2c2932");
  r(ctx, d.x, d.y + 5, d.w, d.h - 5, "#1a181e");
  r(ctx, d.x + 2, d.y + 6, d.w - 4, 1, "#e07a3a");
  r(ctx, d.x + 28, d.y + 12, 12, 3, "#e07a3a");
  r(ctx, d.x + 22, d.y - 9, 26, 11, OUTLINE);
  r(ctx, d.x + 23, d.y - 8, 24, 9, "#25232c");
  r(ctx, d.x + 33, d.y - 5, 4, 2, busy && Math.floor(t / 400) % 2 ? "#ffb070" : "#55505f");
  r(ctx, d.x + 4, d.y - 4, 8, 5, "#3a3844");
  r(ctx, d.x + 54, d.y - 4, 5, 5, "#f4f0e8");
  r(ctx, d.x + 59, d.y - 3, 1, 2, "#f4f0e8");
}
function pathFor(geo2, zone, seat) {
  const a = seatAnchor(zone, seat);
  const aisle = zone.x + zone.w / 2 < SCENE_W / 2 ? zone.x + zone.w + 4 : zone.x - 6;
  const corridor = Math.max(WALL_H + 20, geo2.door.y - 40);
  return [
    { x: geo2.door.x, y: geo2.door.y - 6 },
    { x: geo2.door.x, y: corridor },
    { x: aisle, y: corridor },
    { x: aisle, y: a.y },
    { x: a.x, y: a.y }
  ];
}
function along(points, p) {
  const segs = points.slice(1).map((pt, i) => Math.hypot(pt.x - points[i].x, pt.y - points[i].y));
  let d = Math.max(0, Math.min(1, p)) * segs.reduce((s, x) => s + x, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? d / segs[i] : 1;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * k,
        y: points[i].y + (points[i + 1].y - points[i].y) * k
      };
    }
    d -= segs[i];
  }
  return points.at(-1);
}
function robotPose(a, now, geo2) {
  const zone = geo2.byId[a.zone];
  if (a.seat < 0 || !zone) return { mode: "gone", x: 0, y: 0 };
  const path = pathFor(geo2, zone, a.seat);
  if (a.leaveAt !== void 0 && now >= a.leaveAt) {
    const q = (now - a.leaveAt) / WALK_MS;
    if (q >= 1) return { mode: "gone", x: 0, y: 0 };
    return { mode: "walk", ...along([...path].reverse(), q) };
  }
  const p = (now - a.enterAt) / WALK_MS;
  if (p < 1) return { mode: "walk", ...along(path, p) };
  const s = seatAnchor(zone, a.seat);
  return { mode: "seated", x: s.x, y: s.y };
}
function drawFrame(ctx, bg, office, now, selected, geo2, editing = false) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);
  const t = now;
  for (const d of geo2.decor) if (d.visible) DECOR_ANIM[d.id]?.(ctx, d.x, d.y, t);
  const poses = /* @__PURE__ */ new Map();
  for (const a of office.present) poses.set(a.key, robotPose(a, now, geo2));
  const seatedAt = /* @__PURE__ */ new Map();
  for (const a of office.present) if (poses.get(a.key)?.mode === "seated") seatedAt.set(`${a.zone}:${a.seat}`, a);
  for (const z of geo2.zones) {
    for (let i = 0; i < 3; i++) {
      const a = seatedAt.get(`${z.id}:${i}`);
      if (a) {
        const p = poses.get(a.key);
        drawRobot(ctx, p.x, p.y, { zone: z.id, subagent: a.kind === "subagent", accent: z.accent }, {
          walking: false,
          busy: a.busy,
          t,
          seed: i + z.x,
          selected: selected === a.key
        });
      }
      drawDesk(ctx, z, i, !!a?.busy, t);
    }
  }
  const chefBusy = office.chef.status === "thinking" || office.chef.status === "waiting";
  drawRobot(ctx, geo2.chef.anchor.x, geo2.chef.anchor.y, { zone: "chef", subagent: false, accent: "#ffb070" }, {
    walking: false,
    busy: chefBusy,
    t,
    seed: 3,
    selected: selected === "chef"
  });
  drawChefDesk(ctx, geo2.chef.desk, chefBusy, t);
  for (const a of office.present) {
    const p = poses.get(a.key);
    if (p.mode !== "walk") continue;
    const z = geo2.byId[a.zone];
    drawRobot(ctx, p.x, p.y, { zone: a.zone, subagent: a.kind === "subagent", accent: z.accent }, {
      walking: true,
      busy: false,
      t,
      seed: a.seat,
      selected: selected === a.key
    });
  }
  const g = ctx.createRadialGradient(
    geo2.chef.anchor.x,
    geo2.chef.anchor.y + 18,
    10,
    SCENE_W / 2,
    SCENE_H / 2,
    260
  );
  g.addColorStop(0, "rgba(255,190,120,0.07)");
  g.addColorStop(0.6, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
  if (editing) {
    ctx.globalAlpha = 0.09;
    for (let x = 0; x < SCENE_W; x += 8) r(ctx, x, 0, 1, SCENE_H, "#ffffff");
    for (let y = 0; y < SCENE_H; y += 8) r(ctx, 0, y, SCENE_W, 1, "#ffffff");
    ctx.globalAlpha = 1;
  }
}

// scripts/plugin-office/pixels.ts
var colorCache = /* @__PURE__ */ new Map();
function parseColor(c) {
  const hit = colorCache.get(c);
  if (hit) return hit;
  let out = [0, 0, 0, 1];
  const s = c.trim();
  if (s[0] === "#") {
    const h = s.slice(1);
    const full = h.length === 3 || h.length === 4 ? [...h].map((x) => x + x).join("") : h;
    const n = parseInt(full.slice(0, 6), 16);
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    out = [n >> 16 & 255, n >> 8 & 255, n & 255, a];
  } else {
    const m = /^rgba?\(([^)]*)\)$/i.exec(s);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      out = [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
    }
  }
  colorCache.set(c, out);
  return out;
}
var PixelCanvas = class _PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 3);
  }
  clone() {
    const c = new _PixelCanvas(this.width, this.height);
    c.data.set(this.data);
    return c;
  }
};
var RadialGradient = class {
  constructor(x0, y0, r0, x1, y1, r1) {
    this.x0 = x0;
    this.y0 = y0;
    this.r0 = r0;
    this.x1 = x1;
    this.y1 = y1;
    this.r1 = r1;
    this.stops = [];
  }
  addColorStop(offset, color) {
    this.stops.push({ offset, color: parseColor(color) });
    this.stops.sort((a, b) => a.offset - b.offset);
  }
  /** Position 0..1 d'un point (approximation : distance au centre extérieur). */
  at(x, y) {
    const d = Math.hypot(x - this.x1, y - this.y1);
    const t = Math.min(1, Math.max(0, (d - this.r0) / (this.r1 - this.r0)));
    const s = this.stops;
    if (!s.length) return [0, 0, 0, 0];
    if (t <= s[0].offset) return s[0].color;
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i].offset) {
        const a = s[i - 1];
        const b = s[i];
        const k = (t - a.offset) / (b.offset - a.offset || 1);
        return [0, 1, 2, 3].map((j) => a.color[j] + (b.color[j] - a.color[j]) * k);
      }
    }
    return s[s.length - 1].color;
  }
};
var PixelCtx = class {
  constructor(canvas, vectorGradients = false) {
    this.canvas = canvas;
    this.vectorGradients = vectorGradients;
    this.globalAlpha = 1;
    this.imageSmoothingEnabled = false;
    this.fillStyle = "#000000";
    this.gradients = [];
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    return new RadialGradient(x0, y0, r0, x1, y1, r1);
  }
  drawImage(src, dx = 0, dy = 0) {
    const { width: W, height: H, data } = this.canvas;
    for (let y = 0; y < src.height; y++) {
      const ty = y + Math.round(dy);
      if (ty < 0 || ty >= H) continue;
      for (let x = 0; x < src.width; x++) {
        const tx = x + Math.round(dx);
        if (tx < 0 || tx >= W) continue;
        const s = (y * src.width + x) * 3;
        const d = (ty * W + tx) * 3;
        data[d] = src.data[s];
        data[d + 1] = src.data[s + 1];
        data[d + 2] = src.data[s + 2];
      }
    }
  }
  fillRect(x, y, w, h) {
    const style = this.fillStyle;
    if (style instanceof RadialGradient && this.vectorGradients) {
      this.gradients.push({ gradient: style, x, y, w, h, alpha: this.globalAlpha });
      return;
    }
    const { width: W, height: H, data } = this.canvas;
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w));
    const y1 = Math.min(H, Math.round(y + h));
    if (x1 <= x0 || y1 <= y0) return;
    const flat = typeof style === "string" ? parseColor(style) : void 0;
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const c = flat ?? style.at(px + 0.5, py + 0.5);
        const a = Math.min(1, Math.max(0, c[3] * this.globalAlpha));
        if (a <= 0) continue;
        const i = (py * W + px) * 3;
        data[i] = c[0] * a + data[i] * (1 - a);
        data[i + 1] = c[1] * a + data[i + 1] * (1 - a);
        data[i + 2] = c[2] * a + data[i + 2] * (1 - a);
      }
    }
  }
};
var hex = (r2, g, b) => `#${(1 << 24 | r2 << 16 | g << 8 | b).toString(16).slice(1)}`;
function toSvgShapes(c) {
  const { width: W, height: H, data } = c;
  const n = W * H;
  const px = new Uint32Array(n);
  const count = /* @__PURE__ */ new Map();
  const box = /* @__PURE__ */ new Map();
  for (let k = 0; k < n; k++) {
    const color = data[k * 3] << 16 | data[k * 3 + 1] << 8 | data[k * 3 + 2];
    px[k] = color;
    count.set(color, (count.get(color) ?? 0) + 1);
    const x = k % W;
    const y = (k - x) / W;
    const b = box.get(color);
    if (!b) box.set(color, [x, y, x, y]);
    else {
      if (x < b[0]) b[0] = x;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
  }
  const order = [...count.keys()].sort((a, b) => count.get(b) - count.get(a));
  const rank = new Map(order.map((color, r2) => [color, r2]));
  const rankOf = new Int32Array(n);
  for (let k = 0; k < n; k++) rankOf[k] = rank.get(px[k]);
  let out = "";
  order.forEach((color, r2) => {
    const [bx0, by0, bx1, by1] = box.get(color);
    const parts = [];
    let open = /* @__PURE__ */ new Map();
    for (let y = by0; y <= by1 + 1; y++) {
      const next = /* @__PURE__ */ new Map();
      if (y <= by1) {
        let x = bx0;
        while (x <= bx1) {
          if (rankOf[y * W + x] < r2) {
            x++;
            continue;
          }
          let first = -1;
          let last = -1;
          while (x < W && rankOf[y * W + x] >= r2) {
            if (px[y * W + x] === color) {
              if (first < 0) first = x;
              last = x;
            }
            if (x >= bx1 && first >= 0) {
              x++;
              break;
            }
            x++;
          }
          if (first < 0) continue;
          const key = first * 4096 + (last - first + 1);
          next.set(key, open.get(key) ?? { x: first, w: last - first + 1, y });
        }
      }
      for (const [key, o] of open) if (!next.has(key)) parts.push(`M${o.x} ${o.y}h${o.w}v${y - o.y}h-${o.w}z`);
      open = next;
    }
    out += `<path fill="${hex(color >> 16 & 255, color >> 8 & 255, color & 255)}" d="${parts.join("")}"/>`;
  });
  return out;
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = bytes[i] << 16 | (bytes[i + 1] ?? 0) << 8 | (bytes[i + 2] ?? 0);
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63];
    out += i + 1 < bytes.length ? B64[n >> 6 & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}
function toCells(c, columns) {
  const cols = Math.max(1, Math.min(512, Math.floor(columns)));
  const rows = Math.max(1, Math.min(256, Math.round(cols * c.height / c.width / 2)));
  const sx = c.width / cols;
  const sy = c.height / (rows * 2);
  const sample = (cx, cy) => {
    const xa = Math.floor(cx * sx);
    const xb = Math.max(xa + 1, Math.floor((cx + 1) * sx));
    const ya = Math.floor(cy * sy);
    const yb = Math.max(ya + 1, Math.floor((cy + 1) * sy));
    let r2 = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = ya; y < yb && y < c.height; y++)
      for (let x = xa; x < xb && x < c.width; x++) {
        const i = (y * c.width + x) * 3;
        r2 += c.data[i];
        g += c.data[i + 1];
        b += c.data[i + 2];
        n++;
      }
    return n ? (Math.round(r2 / n) << 16 | Math.round(g / n) << 8 | Math.round(b / n)) >>> 0 : 0;
  };
  const bytes = new Uint8Array(cols * rows * 12);
  const view = new DataView(bytes.buffer);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const k = (row * cols + col) * 12;
      view.setUint32(k, 9600, true);
      view.setUint32(k + 4, sample(col, row * 2), true);
      view.setUint32(k + 8, sample(col, row * 2 + 1), true);
    }
  return { cells: base64(bytes), columns: cols, rows };
}

// scripts/plugin-office/entry.ts
var geo = DEFAULT_GEOMETRY;
var background;
function backgroundCanvas() {
  if (!background) {
    background = new PixelCanvas(SCENE_W, SCENE_H);
    drawBackground(new PixelCtx(background), geo);
  }
  return background;
}
function paint(office, now, vector) {
  const canvas = new PixelCanvas(SCENE_W, SCENE_H);
  const ctx = new PixelCtx(canvas, vector);
  drawFrame(ctx, backgroundCanvas(), office, now, null, geo, false);
  return { canvas, gradients: ctx.gradients };
}
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var chars = (s) => Array.from(s);
var cut = (s, n) => {
  const c = chars(s.replace(/\s+/g, " ").trim());
  return c.length > n ? `${c.slice(0, n - 1).join("")}\u2026` : c.join("");
};
var textWidth = (s, size) => chars(s).reduce((w, ch) => w + (/\p{Extended_Pictographic}/u.test(ch) ? 1.15 : 0.6) * size, 0);
var FONT = `font-family="ui-monospace,Menlo,Consolas,monospace"`;
function chefSays(office) {
  const chef = office.chef;
  if (chef.status === "idle") return { icon: "\u2615", text: "J'attends une requ\xEAte" };
  if (chef.status === "waiting")
    return {
      icon: "\u23F3",
      text: `J'attends l'\xE9quipe : ${chef.reportsDone} rapport${chef.reportsDone > 1 ? "s" : ""} sur ${chef.reportsTotal}`
    };
  if (chef.status === "done") return { icon: "\u2705", text: "R\xE9ponse envoy\xE9e !" };
  return { icon: "\u{1F9E0}", text: "Je r\xE9fl\xE9chis \xE0 la demande\u2026" };
}
function bubble(x, y, name, color, icon, text, compact) {
  const size = compact ? 5.6 : 6.6;
  const pad = 3;
  const lines = compact ? [] : wrap(`${icon} ${text}`, 24, 2);
  const head = compact ? `${icon} ${name}` : name;
  const w = Math.min(
    compact ? 64 : 118,
    pad * 2 + Math.max(textWidth(head, size * 0.85) + (compact ? 0 : 7), ...lines.map((l) => textWidth(l, size)))
  );
  const h = pad * 2 + size * 0.95 + lines.length * size * 1.2;
  const shiftK = x < 70 ? 0.18 : x > SCENE_W - 70 ? 0.82 : 0.5;
  const left = Math.max(1, Math.min(SCENE_W - w - 1, x - w * shiftK));
  const top = Math.max(1, y - h - 4);
  const tail = Math.max(left + 3, Math.min(left + w - 3, x));
  let out = `<g>`;
  out += `<rect x="${left + 1.5}" y="${top + 1.8}" width="${w}" height="${h}" fill="#000" opacity="0.35"/>`;
  out += `<rect x="${left}" y="${top}" width="${w}" height="${h}" fill="#f6f1e4" stroke="#15121b" stroke-width="1"/>`;
  out += `<path d="M${tail - 2.5} ${top + h - 0.5}h5l-2.5 3.5z" fill="#f6f1e4"/>`;
  const nameX = compact ? left + pad : left + pad + 6;
  if (!compact)
    out += `<rect x="${left + pad}" y="${top + pad + 0.5}" width="4" height="4" fill="${esc(color)}" stroke="#15121b" stroke-width="0.6"/>`;
  out += `<text x="${nameX}" y="${top + pad + size * 0.8}" font-size="${(size * 0.85).toFixed(2)}" fill="#15121b" opacity="0.8" ${FONT}>${esc(
    cut(head, compact ? 14 : 30)
  )}</text>`;
  lines.forEach((l, i) => {
    out += `<text x="${left + pad}" y="${top + pad + size * 0.95 + (i + 0.85) * size * 1.2}" font-size="${size}" fill="#15121b" ${FONT}>${esc(l)}</text>`;
  });
  return out + `</g>`;
}
function wrap(text, per, max) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (chars(next).length <= per) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = chars(w).length > per ? cut(w, per) : w;
    }
    if (lines.length === max) break;
  }
  if (lines.length < max && cur) lines.push(cur);
  const all = lines.join(" ");
  if (lines.length === max && chars(all).length < chars(text).length - 1)
    lines[max - 1] = cut(`${lines[max - 1]}\u2026`, per);
  return lines;
}
function label(x, y, text, bg, fg) {
  const size = 6;
  const w = textWidth(text, size) + 5;
  return `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${size + 3.5}" fill="${bg}"/><text x="${x + 2.5}" y="${y + size + 1.2}" font-size="${size}" fill="${fg}" letter-spacing="0.4" ${FONT}>${esc(text)}</text>`;
}
function gradientSvg(fills) {
  return fills.map(({ gradient: g, x, y, w, h, alpha }, i) => {
    const stops = g.stops.map(
      (s) => `<stop offset="${s.offset}" stop-color="rgb(${s.color.slice(0, 3).map(Math.round).join(",")})" stop-opacity="${s.color[3]}"/>`
    ).join("");
    return `<defs><radialGradient id="g${i}" gradientUnits="userSpaceOnUse" cx="${g.x1}" cy="${g.y1}" r="${g.r1}" fx="${g.x0}" fy="${g.y0}" fr="${g.r0}">${stops}</radialGradient></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g${i})" opacity="${alpha}"/>`;
  }).join("");
}
function seatedOf(office, now) {
  return office.present.map((a) => ({ a, pose: robotPose(a, now, geo) })).filter(({ pose }) => pose.mode === "seated").map(({ a, pose }) => ({ a, x: pose.x, y: pose.y }));
}
function describe(office, seated) {
  const chef = chefSays(office);
  const busy = seated.filter(({ a }) => a.busy);
  const parts = [`Bureau de Claude. ${office.chef.name} (chef) : ${chef.text}`];
  if (office.chef.currentPrompt) parts.push(`Demande : ${cut(office.chef.currentPrompt, 120)}`);
  if (busy.length)
    parts.push(
      `${busy.length} robot${busy.length > 1 ? "s" : ""} au travail : ${busy.map(({ a }) => `${a.name} (${geo.byId[a.zone].label}) ${currentTask(a)?.summary ?? "au travail"}`).join(" ; ")}`
    );
  else parts.push("Aucun robot au travail.");
  return parts.join(". ");
}
function renderOfficeSvg(events, now) {
  const office = buildOffice(events, now, LIVE_OPTIONS, geo);
  const { canvas, gradients } = paint(office, now, true);
  const seated = seatedOf(office, now);
  const best = /* @__PURE__ */ new Map();
  for (const { a } of seated) {
    const t = currentTask(a);
    if (!a.busy || !t) continue;
    const cur = best.get(a.zone);
    if (!cur || t.start > cur.start) best.set(a.zone, { key: a.key, start: t.start });
  }
  const featured = new Set([...best.values()].map((v) => v.key));
  let overlay = "";
  for (const z of geo.zones) overlay += label(z.x + 3, z.y + 3, z.label, "#17131c", "#d9d2e6");
  const { rug, anchor } = geo.chef;
  overlay += label(rug.x + 8, rug.y + rug.h - 13, "CHEF", "#2a1a10", "#ffb070");
  const busy = seated.filter(({ a }) => a.busy).sort((p, q) => Number(featured.has(p.a.key)) - Number(featured.has(q.a.key)));
  for (const { a, x, y } of busy) {
    const t = currentTask(a);
    overlay += bubble(x, y - 8, a.name, geo.byId[a.zone].accent, t?.icon ?? "\u2699\uFE0F", t?.summary ?? "Au travail", !featured.has(a.key));
  }
  const chef = chefSays(office);
  overlay += bubble(anchor.x, anchor.y - 6, office.chef.name, "#e8873a", chef.icon, chef.text, false);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_W} ${SCENE_H}" width="${SCENE_W * 2}" height="${SCENE_H * 2}"><g shape-rendering="crispEdges">${toSvgShapes(canvas)}</g>${gradientSvg(gradients)}${overlay}</svg>`;
  return {
    svg,
    alt: describe(office, seated),
    present: office.present.length,
    running: office.tasks.filter((t) => t.end === void 0).length,
    done: office.tasks.filter((t) => t.end !== void 0).length
  };
}
function renderOfficeCells(events, now, columns) {
  const office = buildOffice(events, now, LIVE_OPTIONS, geo);
  const { canvas } = paint(office, now, false);
  return { ...toCells(canvas, columns), alt: describe(office, seatedOf(office, now)) };
}
export {
  renderOfficeCells,
  renderOfficeSvg
};
