# Rendezo

Mini SaaS de prise de rendez-vous en ligne avec rappels automatiques par email.

- Page de réservation publique par professionnel (`/r/[slug]`)
- Tableau de bord : disponibilités, liste des rendez-vous, paramètres
- Rappel automatique envoyé par email avant chaque rendez-vous (Resend)
- Authentification par session (cookie signé, sans dépendance externe)

## Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Resend](https://resend.com) pour l'envoi d'emails
- Tailwind CSS v4

## Configuration

1. Copiez `.env.example` vers `.env` et renseignez les variables :

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` : chaîne de connexion PostgreSQL (Supabase, Neon, Railway, instance locale...)
   - `SESSION_SECRET` : secret aléatoire de 32+ caractères (`openssl rand -base64 32`)
   - `RESEND_API_KEY` : clé API [Resend](https://resend.com). Laissez vide en dev — les emails
     sont alors simplement journalisés dans la console au lieu d'être envoyés.
   - `REMINDER_FROM_EMAIL` : adresse d'expédition des emails
   - `CRON_SECRET` : secret partagé pour protéger l'endpoint de rappels planifiés
   - `NEXT_PUBLIC_APP_URL` : URL publique de l'application

2. Installez les dépendances puis appliquez les migrations :

   ```bash
   npm install
   npx prisma migrate deploy   # ou `prisma migrate dev` en local
   ```

3. Lancez le serveur de développement :

   ```bash
   npm run dev
   ```

   Ouvrez [http://localhost:3000](http://localhost:3000).

## Rappels automatiques

Les rappels sont envoyés par la route `GET /api/cron/reminders`, protégée par le header
`Authorization: Bearer $CRON_SECRET` (envoyé automatiquement par Vercel Cron si `CRON_SECRET`
est défini). La planification est déclarée dans `vercel.json` (toutes les 15 minutes).

Sur un hébergement sans cron intégré, appelez cette route périodiquement via un service externe
(cron-job.org, GitHub Actions, etc.) avec le même header d'autorisation.

Un bouton « Envoyer les rappels maintenant » est aussi disponible dans
**Tableau de bord → Paramètres** pour déclencher l'envoi manuellement (pratique en développement).

## Déploiement

Déployez sur [Vercel](https://vercel.com/new) ou tout hébergeur Node.js compatible Next.js.
Pensez à exécuter `prisma migrate deploy` contre votre base de données de production avant le
premier déploiement.
