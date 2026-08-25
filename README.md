This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Strike Protocol (`/game`)

A browser-based wave-survival FPS (Three.js, WebGL) lives at `/game`, playable
with keyboard/mouse on desktop and touch controls on mobile. Source is under
`src/game/` (engine, HUD, weapons, economy) plus the route in `src/app/game/`.

- Weapons and enemy waves scale with in-game "Crédits" earned from kills,
  persisted to `localStorage` — no account/server needed to play.
- A premium "Or" currency can be bought with real money via Stripe Checkout
  (`src/app/api/checkout`, `src/app/api/verify-purchase`). Copy `.env.example`
  to `.env.local` and set `STRIPE_SECRET_KEY` to enable it — without a key,
  the game still works, only the real-money packs are disabled.
- This is a single-player, client-side-economy prototype: there's no database,
  so `localStorage` currency isn't cheat-proof and purchase crediting is
  best-effort (deduped per browser via a stored session id). A production
  "rentable" version would need real accounts + a server-side wallet.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
