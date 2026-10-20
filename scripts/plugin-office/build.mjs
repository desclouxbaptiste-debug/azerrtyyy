// Construit le dessin du bureau pour l'extension « bureau-agents » :
// plugins/bureau-agents/hooks/office.gen.js (fichier généré, à ne pas modifier).
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

await build({
  entryPoints: [`${root}/scripts/plugin-office/entry.ts`],
  outfile: `${root}/plugins/bureau-agents/hooks/office.gen.js`,
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  tsconfig: `${root}/tsconfig.json`,
  legalComments: "none",
  banner: {
    js: "// Généré par `npm run build:plugin-office` depuis scripts/plugin-office et src/ : ne pas modifier à la main.",
  },
  logLevel: "warning",
});
console.log("plugins/bureau-agents/hooks/office.gen.js");
