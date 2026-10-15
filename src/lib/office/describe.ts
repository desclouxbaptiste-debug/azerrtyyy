import type { ZoneId } from "./types";

type Input = Record<string, unknown> | undefined;

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

const basename = (p?: string) => (p ? p.split(/[\\/]/).filter(Boolean).pop() ?? p : "");

const host = (u?: string) => {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

const DESIGN_EXT = /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|fig|sketch)$/i;

export function zoneForTool(tool: string, input?: Input): ZoneId | "chef" {
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

export function zoneForAgentType(type?: string): ZoneId {
  const t = (type ?? "").toLowerCase();
  if (/explore|research|fetch|search|web/.test(t)) return "recherche";
  if (/plan|review|audit|analy|security/.test(t)) return "analyse";
  if (/design|ui|ux|artifact/.test(t)) return "design";
  if (/test|run|deploy|ops|shell|statusline/.test(t)) return "action";
  return "code";
}

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Phrase à la première personne affichée dans la bulle, plus un détail technique. */
export function describeTool(
  tool: string,
  input?: Input,
): { icon: string; summary: string; detail?: string } {
  const t = tool.toLowerCase();
  const path = str(input?.file_path) ?? str(input?.notebook_path) ?? str(input?.path);
  switch (t) {
    case "websearch":
      return { icon: "🔎", summary: `Je cherche : ${clip(str(input?.query) ?? "…")}`, detail: str(input?.query) };
    case "webfetch":
      return { icon: "🌐", summary: `Je lis ${host(str(input?.url))}`, detail: str(input?.url) };
    case "read":
      return { icon: "📄", summary: `Je lis ${basename(path)}`, detail: path };
    case "grep":
      return { icon: "🔍", summary: `Je fouille : ${clip(str(input?.pattern) ?? "")}`, detail: str(input?.path) ?? path };
    case "glob":
      return { icon: "🗂️", summary: `Je liste ${clip(str(input?.pattern) ?? "")}`, detail: str(input?.pattern) };
    case "edit":
    case "multiedit":
      return { icon: "✏️", summary: `Je modifie ${basename(path)}`, detail: path };
    case "write":
      return { icon: "📝", summary: `J'écris ${basename(path)}`, detail: path };
    case "notebookedit":
      return { icon: "📓", summary: `J'édite ${basename(path)}`, detail: path };
    case "bash": {
      const cmd = str(input?.command) ?? "";
      const desc = str(input?.description);
      return { icon: "⚙️", summary: `J'exécute : ${clip(desc ?? cmd, 90)}`, detail: cmd };
    }
    case "agent":
    case "task": {
      const desc = str(input?.description) ?? "une mission";
      const type = str(input?.subagent_type);
      return {
        icon: "🤖",
        summary: `Je délègue : ${clip(desc, 90)}`,
        detail: type ? `${type} — ${str(input?.prompt) ?? ""}` : str(input?.prompt),
      };
    }
    case "todowrite":
      return { icon: "📋", summary: "Je planifie les étapes" };
    case "askuserquestion":
      return { icon: "❓", summary: "Je te pose une question" };
    case "skill":
      return { icon: "🧰", summary: `J'ouvre le guide ${str(input?.skill) ?? ""}`, detail: str(input?.args) };
    case "artifact":
      return { icon: "🎨", summary: "Je publie une page", detail: path ?? str(input?.url) };
    default: {
      const pretty = tool.startsWith("mcp__") ? tool.split("__").slice(1).join(" › ") : tool;
      return { icon: "🛠️", summary: `J'utilise ${clip(pretty, 60)}` };
    }
  }
}

export const shortText = clip;
