export function TwistFooter() {
  return (
    <footer className="border-t border-[#111110]/10 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-widest text-[#111110]/50 sm:flex-row">
        <div className="flex items-center gap-2 text-[#111110]">
          <span className="flex size-6 items-center justify-center bg-[#111110] font-[family-name:var(--font-display)] text-xs font-bold normal-case text-[#F6F4EF]">
            T
          </span>
          <span className="font-[family-name:var(--font-display)] text-sm font-bold normal-case">Twist</span>
        </div>
        <p>© 2026 Twist. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
