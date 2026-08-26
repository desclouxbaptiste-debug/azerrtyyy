import { Sparkles } from "lucide-react";

export function TwistFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/40 sm:flex-row">
        <div className="flex items-center gap-2 text-white/70">
          <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <Sparkles className="size-3.5 text-white" strokeWidth={2.5} />
          </span>
          <span className="font-bold">Twist</span>
        </div>
        <p>© 2026 Twist. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
