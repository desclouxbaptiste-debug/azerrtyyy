#!/usr/bin/env bash
# Installe l'extension Claude Code « bureau-agents » (fenêtre des agents et lien
# vers le Bureau de Claude) pour toutes les sessions d'un environnement cloud.
#
# À coller dans le « Setup script » de l'environnement (menu de l'environnement
# dans la barre de titre d'une session, puis Edit) :
#
#   rm -rf /tmp/bureau-src && git clone -q --depth 1 https://github.com/desclouxbaptiste-debug/azerrtyyy /tmp/bureau-src && bash /tmp/bureau-src/scripts/bureau-setup.sh || echo "bureau-agents non installé"
#
# Chaque nouvelle session prend la dernière version de `main`. Le script ne fait
# jamais échouer la préparation de la session.

set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/../plugins/bureau-agents"
dest="${HOME:-/root}/.claude/bureau-agents"
settings="${HOME:-/root}/.claude/settings.json"

if [ ! -f "$src/.claude-plugin/plugin.json" ]; then
  echo "bureau-agents : extension introuvable dans $src" >&2
  exit 0
fi

mkdir -p "$(dirname "$dest")"
rm -rf "$dest.new"
cp -R "$src" "$dest.new" && rm -rf "$dest" && mv "$dest.new" "$dest" || {
  echo "bureau-agents : copie impossible vers $dest" >&2
  exit 0
}

# Claude Code charge les dossiers listés dans CLAUDE_CODE_PLUGIN_DIRS (bloc `env`
# de ~/.claude/settings.json) : on y ajoute celui de l'extension, sans toucher au reste.
manual="ajoute la variable CLAUDE_CODE_PLUGIN_DIRS=$dest à l'environnement"
if command -v node >/dev/null 2>&1; then
  node - "$settings" "$dest" <<'EOF' || { echo "bureau-agents : $settings illisible, $manual" >&2; exit 0; }
const fs = require("fs");
const [file, dir] = process.argv.slice(2);
let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") process.exit(1);
}
const env = (cfg.env = cfg.env ?? {});
const dirs = (env.CLAUDE_CODE_PLUGIN_DIRS ?? "").split(":").filter(Boolean);
if (!dirs.includes(dir)) env.CLAUDE_CODE_PLUGIN_DIRS = [...dirs, dir].join(":");
fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
EOF
elif [ ! -f "$settings" ]; then
  printf '{\n  "env": {\n    "CLAUDE_CODE_PLUGIN_DIRS": "%s"\n  }\n}\n' "$dest" > "$settings"
else
  echo "bureau-agents : node absent, $manual" >&2
  exit 0
fi

echo "bureau-agents installé dans $dest"
