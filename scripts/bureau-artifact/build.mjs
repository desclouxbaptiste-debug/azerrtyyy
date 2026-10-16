// Construit la page publiée du bureau en un seul fichier HTML :
// scripts/bureau-artifact/dist/bureau-de-claude.html
// React 18 est chargé depuis cdnjs (seuls hôtes de scripts admis par les artefacts).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const dist = path.join(here, "dist");
mkdirSync(dist, { recursive: true });

// Les imports de React pointent vers les globales des builds UMD.
const reactGlobals = {
  name: "react-globals",
  setup(build) {
    build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) => ({ path: args.path, namespace: "react-global" }));
    build.onLoad({ filter: /.*/, namespace: "react-global" }, (args) => {
      if (args.path === "react") return { contents: "module.exports = window.React", loader: "js" };
      if (args.path.startsWith("react-dom")) return { contents: "module.exports = window.ReactDOM", loader: "js" };
      // react/jsx-runtime : createElement garde `children` passé dans les props.
      return {
        contents:
          "const R = window.React; const j = (t, p, k) => R.createElement(t, k === undefined ? p : Object.assign({}, p, { key: k })); module.exports = { jsx: j, jsxs: j, jsxDEV: j, Fragment: R.Fragment };",
        loader: "js",
      };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(here, "entry.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  outdir: dist,
  entryNames: "bundle",
  plugins: [reactGlobals],
  tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "error",
});

const js = readFileSync(path.join(dist, "bundle.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(dist, "bundle.css"), "utf8");

const html = `<title>Bureau de Claude</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;700&display=swap">
<style>
:root { color-scheme: dark; --ground: #0d0b10; --text: #f6f1e4; }
body { background: var(--ground); color: var(--text); }
#root { font-family: "Pixelify Sans", ui-rounded, system-ui, sans-serif; }
@media (prefers-reduced-motion: reduce) { #root * { animation: none !important; transition: none !important; } }
${css}
</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;

const out = path.join(dist, "bureau-de-claude.html");
writeFileSync(out, html);
console.log(`${path.relative(root, out)} : ${(html.length / 1024).toFixed(1)} Ko`);
