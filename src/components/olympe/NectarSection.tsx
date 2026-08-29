export function NectarSection() {
  return (
    <section
      id="nectar-cta"
      className="relative bg-[#0b0a10] px-6 py-24 text-center text-[#f5eede] sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-2xl">
        <span className="text-xs font-medium tracking-[0.35em] text-[#e8c98a] uppercase">
          Nectar de l&apos;Olympe
        </span>
        <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-4xl font-black tracking-tight sm:text-5xl">
          Prête à être cueillie
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[#cfc3ad]">
          Récoltée à maturité, gorgée de lumière dorée. Chaque poire porte
          l&apos;empreinte des Dieux — et du terroir qui l&apos;a vue naître.
        </p>
        <a
          href="#"
          className="mt-8 inline-block rounded-full bg-gradient-to-r from-[#e8c98a] to-[#c9962f] px-10 py-4 text-sm font-bold tracking-wide text-[#1a1408] shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-transform hover:scale-105 active:scale-95"
        >
          Goûter au Nectar
        </a>
      </div>

      <div className="relative mx-auto mt-20 max-w-3xl border-t border-[#e8c98a]/10 pt-8 text-xs text-[#cfc3ad]/50">
        © {new Date().getFullYear()} Nectar de l&apos;Olympe — Marque fictive à but créatif.
      </div>
    </section>
  );
}
