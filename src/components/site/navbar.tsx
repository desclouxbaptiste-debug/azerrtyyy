"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#club", label: "Le Club" },
  { href: "#palmares", label: "Palmarès" },
  { href: "#stade", label: "Parc des Princes" },
  { href: "#supporters", label: "Supporters" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-colors duration-300",
        scrolled || open
          ? "bg-[#050914]/90 backdrop-blur-md border-b border-white/10"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2 text-white">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[--psg-blue] to-[--psg-navy] text-sm font-black tracking-tight ring-1 ring-white/20">
            PSG
          </span>
          <span className="hidden text-sm font-semibold tracking-wide sm:inline">
            Paris Saint-Germain
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/80 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <Button className="bg-red-600 text-white hover:bg-red-700">
            Billetterie
          </Button>
        </div>

        <button
          type="button"
          aria-label="Ouvrir le menu"
          className="text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open ? (
        <div className="flex flex-col gap-1 border-t border-white/10 bg-[#050914] px-6 pb-6 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-3 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <Button className="mt-2 bg-red-600 text-white hover:bg-red-700">
            Billetterie
          </Button>
        </div>
      ) : null}
    </header>
  );
}
