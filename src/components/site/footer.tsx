type IconProps = { size?: number };

const InstagramIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3l7.5 9.4L3.4 21H6l5.8-6.6L16.5 21H21l-7.9-9.9L20.6 3H18l-5.3 6L8 3H3z" />
  </svg>
);

const FacebookIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 21v-7.5H16l.5-3.2h-3V8.2c0-.9.3-1.6 1.7-1.6H16.6V3.8C16.2 3.7 15 3.6 13.7 3.6c-2.7 0-4.6 1.7-4.6 4.7v2h-3v3.2h3V21h3.4z" />
  </svg>
);

const YoutubeIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="M10.5 9.5l5 2.5-5 2.5v-5z" fill="currentColor" stroke="none" />
  </svg>
);

const SOCIALS = [
  { icon: InstagramIcon, label: "Instagram" },
  { icon: XIcon, label: "X / Twitter" },
  { icon: FacebookIcon, label: "Facebook" },
  { icon: YoutubeIcon, label: "YouTube" },
];

const COLUMNS = [
  {
    title: "Le Club",
    links: ["Histoire", "Palmarès", "Centre de formation", "Recrutement"],
  },
  {
    title: "Match",
    links: ["Calendrier", "Résultats", "Classement Ligue 1", "Billetterie"],
  },
  {
    title: "Parc des Princes",
    links: ["Accès & plans", "Visites du stade", "Boutique officielle"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050914] text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2 text-white">
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[--psg-blue] to-[--psg-navy] text-sm font-black ring-1 ring-white/20">
                PSG
              </span>
              <span className="text-sm font-semibold">Paris Saint-Germain</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Fondé en 1970, le Paris Saint-Germain est le club le plus titré
              du football français, porté par le Parc des Princes et ses
              supporters.
            </p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 transition hover:border-red-500 hover:text-red-400"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs sm:flex-row">
          <p>
            Site fan-made non officiel — © {new Date().getFullYear()} Paris
            Saint-Germain. Tous droits réservés à leurs propriétaires
            respectifs.
          </p>
          <p>Ici c&apos;est Paris.</p>
        </div>
      </div>
    </footer>
  );
}
