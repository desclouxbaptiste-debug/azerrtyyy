"use client";

import { useState, type FormEvent, type SVGProps } from "react";
import { Send } from "lucide-react";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={18}
      height={18}
      {...props}
    />
  );
}

function InstagramGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function FacebookGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 21v-7h2.2l.4-3H13.5v-1.8c0-.9.3-1.5 1.6-1.5h1.2V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7V11H8.5v3h2V21" />
    </IconBase>
  );
}

function XGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </IconBase>
  );
}

function YoutubeGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="4" />
      <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

const socials = [InstagramGlyph, FacebookGlyph, XGlyph, YoutubeGlyph];

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail("");
  }

  return (
    <footer className="relative z-10 mt-10 rounded-t-[3rem] bg-[#2F2521] px-6 py-16 text-[#FCF6EC]">
      <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-black">Tchiao Kombucha</h2>
          <p className="mt-3 max-w-sm text-[#FCF6EC]/70">
            Brassé avec amour, servi avec malice. Rejoins la tribu pétillante.
          </p>
          <div className="mt-6 flex gap-3">
            {socials.map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Réseau social Tchiao Kombucha"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCF6EC]/10 transition-colors hover:bg-[#FCF6EC]/20"
              >
                <Icon width={18} height={18} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-xl font-extrabold">Newsletter pétillante</h3>
          <p className="mt-2 text-sm text-[#FCF6EC]/70">
            Nouvelles saveurs, promos et fun facts sur le kombucha, une fois par mois.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full rounded-full bg-[#FCF6EC]/10 px-5 py-3 text-sm text-[#FCF6EC] outline-none placeholder:text-[#FCF6EC]/40 focus:bg-[#FCF6EC]/15"
            />
            <button
              type="submit"
              aria-label="S'inscrire à la newsletter"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCF6EC] text-[#2F2521] transition-transform hover:scale-105 active:scale-95"
            >
              <Send size={16} />
            </button>
          </form>
          {sent && (
            <p className="mt-2 text-sm text-[#FCF6EC]/80">
              Merci, à très vite dans ta boîte mail 🎉
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-5xl border-t border-[#FCF6EC]/10 pt-6 text-xs text-[#FCF6EC]/40">
        © {new Date().getFullYear()} Tchiao Kombucha — Marque fictive à but créatif. Boisson
        fermentée, à consommer avec modération et bonne humeur.
      </div>
    </footer>
  );
}
