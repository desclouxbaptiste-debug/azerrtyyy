/**
 * Version publiée du bureau (artefact claude.ai) : lit les vraies sessions
 * Claude Code via le connecteur « Claude Code Remote » et garde la mise en page
 * dans la base de l'artefact, où Claude peut la relire.
 * Construction : `npm run build:bureau-artifact`.
 */
import { createRoot } from "react-dom/client";
import type { ConfigStore } from "@/components/office/office";
import { RemoteOffice } from "@/components/office/remote-office";
import type { OfficeConfig } from "@/lib/office/layout";

type DocSnap = { exists: boolean; data(): Record<string, unknown> | undefined };
type DocRef = { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void> };
type Db = { doc(path: string): DocRef };
type Host = { use(name: string): Promise<unknown> };

const host = (globalThis as { claude?: Partial<Host> }).claude;
const dbPromise: Promise<Db | null> =
  typeof host?.use === "function"
    ? (host.use("db") as Promise<Db | null>).catch(() => null)
    : Promise.resolve(null);

/** La mise en page partagée, que Claude lit pour l'installer dans le projet. */
const LAYOUT_DOC = "layout/current";

const store: ConfigStore = {
  saveLabel: "Enregistrer pour Claude",
  async load() {
    const db = await dbPromise;
    if (!db) return null;
    const snap = await db.doc(LAYOUT_DOC).get();
    const d = snap.exists ? snap.data() : undefined;
    if (!d) return null;
    return { config: d.config, savedAt: typeof d.savedAt === "number" ? d.savedAt : 0 };
  },
  async save(config: OfficeConfig) {
    const db = await dbPromise;
    if (!db)
      throw new Error(
        "L'enregistrement n'est pas disponible ici. Ouvre la page depuis claude.ai en étant connecté, ou utilise « Copier le code ».",
      );
    try {
      await db.doc(LAYOUT_DOC).set({ config, savedAt: Date.now() });
    } catch (e) {
      if ((e as { code?: string })?.code === "invalid_argument")
        throw new Error("Seul le propriétaire de cette page peut l'enregistrer. Utilise « Copier le code » à la place.");
      throw new Error("L'enregistrement n'a pas abouti. Réessaie dans un instant.");
    }
  },
};

createRoot(document.getElementById("root")!).render(<RemoteOffice store={store} />);
