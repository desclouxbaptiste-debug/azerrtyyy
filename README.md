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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Le Bureau de Claude (`/bureau`)

Un bureau en pixel art pour regarder Claude et ses agents travailler :
Max, le chef, reçoit tes requêtes au centre ; les robots des zones
**Recherche**, **Code**, **Design**, **Action** et **Analyse** prennent les
tâches. Clique sur un robot ou une bulle pour voir sa mission, sa tâche en
cours et tout son historique (paramètres et résultats).

- `npm run dev` puis ouvre <http://localhost:3000/bureau>.
- Les hooks de `.claude/settings.json` lancent `.claude/hooks/office-log.mjs`,
  qui écrit chaque requête, appel d'outil et sous-agent dans
  `.claude/office/events.jsonl` (ignoré par git). La page lit ce journal via
  `/api/office` et passe automatiquement en **direct**.
- Sans activité, le bureau rejoue un scénario de **démo**.
