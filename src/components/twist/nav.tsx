"use client";

import { motion } from "framer-motion";

const links = [
  { href: "#features", label: "Fonctionnalités" },
  { href: "#pricing", label: "Tarifs" },
];

export function TwistNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-[#111110]/10 bg-[#F6F4EF]/90 backdrop-blur-md"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5 text-[#111110]">
          <span className="flex size-7 items-center justify-center bg-[#111110] font-[family-name:var(--font-display)] text-sm font-bold text-[#F6F4EF]">
            T
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">Twist</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-widest text-[#111110]/60 transition-colors hover:text-[#111110]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#cta"
          className="cursor-pointer border border-[#111110] bg-[#111110] px-4 py-2 font-[family-name:var(--font-mono-ui)] text-xs uppercase tracking-widest text-[#F6F4EF] transition-colors duration-200 hover:bg-orange-700 hover:border-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111110]"
        >
          Essai gratuit
        </a>
      </nav>
    </motion.header>
  );
}
