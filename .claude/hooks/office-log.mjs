#!/usr/bin/env node
// Hook Claude Code : consigne chaque requête, outil et sous-agent dans
// .claude/office/events.jsonl, que la page /bureau affiche en direct.
// Il ne doit jamais bloquer Claude : toute erreur est avalée.
import { appendFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const MAX_STR = 1500;
const MAX_FILE = 4 * 1024 * 1024;

const trim = (v, depth = 0) => {
  if (typeof v === "string") return v.length > MAX_STR ? `${v.slice(0, MAX_STR)}…` : v;
  if (Array.isArray(v)) return depth > 2 ? `[${v.length} éléments]` : v.slice(0, 20).map((x) => trim(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 2) return "{…}";
    return Object.fromEntries(Object.entries(v).slice(0, 30).map(([k, x]) => [k, trim(x, depth + 1)]));
  }
  return v;
};

const text = (v) => {
  if (v == null) return undefined;
  if (typeof v === "string") return trim(v);
  if (Array.isArray(v)) return text(v.map((x) => (typeof x === "string" ? x : x?.text ?? "")).join("\n"));
  if (typeof v === "object") {
    if (typeof v.stdout === "string" || typeof v.stderr === "string")
      return text([v.stdout, v.stderr].filter(Boolean).join("\n"));
    if (v.content) return text(v.content);
    if (typeof v.text === "string") return text(v.text);
    try {
      return text(JSON.stringify(v));
    } catch {
      return undefined;
    }
  }
  return String(v);
};

try {
  const h = JSON.parse(readFileSync(0, "utf8") || "{}");
  const base = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    session: h.session_id,
    agentId: h.agent_id,
    agentType: h.agent_type,
  };
  let ev;
  switch (h.hook_event_name) {
    case "UserPromptSubmit":
      ev = { ...base, type: "prompt", text: trim(h.prompt ?? "") };
      break;
    case "PreToolUse":
      ev = { ...base, type: "tool_start", tool: h.tool_name, toolUseId: h.tool_use_id, input: trim(h.tool_input ?? {}) };
      break;
    case "PostToolUse":
    case "PostToolUseFailure": {
      const failed =
        h.hook_event_name === "PostToolUseFailure" ||
        h.tool_response?.is_error === true ||
        h.tool_response?.success === false;
      ev = {
        ...base,
        type: "tool_end",
        tool: h.tool_name,
        toolUseId: h.tool_use_id,
        ok: !failed,
        output: text(h.tool_response ?? h.error),
      };
      break;
    }
    case "SubagentStart":
      ev = { ...base, type: "subagent_start" };
      break;
    case "SubagentStop":
      ev = { ...base, type: "subagent_end", text: text(h.last_assistant_message) };
      break;
    case "Stop":
      ev = { ...base, type: "stop" };
      break;
  }
  if (ev) {
    const root = process.env.CLAUDE_PROJECT_DIR || h.cwd || process.cwd();
    const dir = path.join(root, ".claude", "office");
    const file = path.join(dir, "events.jsonl");
    mkdirSync(dir, { recursive: true });
    try {
      if (statSync(file).size > MAX_FILE) {
        const lines = readFileSync(file, "utf8").split("\n");
        writeFileSync(file, lines.slice(Math.floor(lines.length / 2)).join("\n"));
      }
    } catch {}
    appendFileSync(file, `${JSON.stringify(ev)}\n`);
  }
} catch {}
process.exit(0);
