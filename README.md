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
  `/api/office` et affiche tout en **direct**. Sans activité, le bureau est
  vide et Max attend une requête.
- **Version publiée sur claude.ai** : `npm run build:bureau-artifact` produit
  `scripts/bureau-artifact/dist/bureau-de-claude.html`. Cette page lit les
  vraies sessions Claude Code de la personne qui la regarde grâce à son
  connecteur « Claude Code Remote » (outils `list_sessions` et `list_events`,
  relus toutes les 4 secondes) : choix de la session dans la liste, puis
  requêtes, outils et sous-agents en direct.
- La case **TA DEMANDE** de la version publiée envoie un message à la session
  regardée (outil `send_message` du même connecteur) : Claude le reçoit dans
  cette session et le bureau montre aussitôt les robots qui s'y mettent.
- Le bouton **✏️ Aménager** ouvre l'atelier : fais glisser les zones, les meubles
  et le bureau du chef (ou utilise les flèches du clavier), renomme les zones et
  les robots, change les couleurs, masque des meubles. La mise en page est gardée
  dans le navigateur ; « Copier le code » permet de la transmettre à Claude.

## Extension Claude Code « bureau-agents »

À chaque demande, sur n'importe quel projet, la fenêtre « Bureau de Claude »
montre le bureau en pixel art, en direct : Max au bureau du chef, les robots
dans leurs zones avec leurs bulles, les sous-agents (et les agents d'une équipe)
qui arrivent par la porte. Dessous : la demande en cours, les missions et les
dernières actions, et un lien « 🏢 Ouvrir le bureau virtuel ». La commande
`/bureau` rouvre la fenêtre.

La fenêtre n'a besoin d'aucun connecteur : l'extension suit la session de
l'intérieur. Le dessin est celui du bureau web (`buildOffice`, `drawBackground`,
`drawFrame`), rendu sans navigateur en SVG (application de bureau, appli mobile)
ou en cellules « ▀ » dans le terminal ; `npm run build:plugin-office` le
reconstruit dans `plugins/bureau-agents/hooks/office.gen.js` après un changement
de `src/` ou de `scripts/plugin-office/`.

Installation, à l'invite d'une session Claude Code dans un terminal :

```
/plugin install bureau-agents --marketplace desclouxbaptiste-debug/azerrtyyy
```

Depuis un terminal :

```
claude plugin install bureau-agents --marketplace desclouxbaptiste-debug/azerrtyyy
```

Dans l'application de bureau : + à côté de la zone de saisie, puis Plugins,
Ajouter une marketplace avec `desclouxbaptiste-debug/azerrtyyy`, puis Ajouter le
plugin. Les sessions ouvertes sur ce dépôt l'activent toutes seules
(`.claude/settings.json`). Code : `plugins/bureau-agents/`.


### Dans toutes les sessions Claude Code sur claude.ai (cloud)

Chaque session cloud démarre dans un conteneur neuf : pour que la fenêtre et le
lien vers le bureau soient là dans **toutes** les sessions, quel que soit le
dépôt, colle cette ligne dans le « Setup script » de l'environnement (menu de
l'environnement dans la barre de titre d'une session, puis Edit) :

```
rm -rf /tmp/bureau-src && git clone -q --depth 1 https://github.com/desclouxbaptiste-debug/azerrtyyy /tmp/bureau-src && bash /tmp/bureau-src/scripts/bureau-setup.sh || echo "bureau-agents non installé"
```

`scripts/bureau-setup.sh` copie l'extension dans `~/.claude/bureau-agents` et
l'ajoute à `CLAUDE_CODE_PLUGIN_DIRS` (bloc `env` de `~/.claude/settings.json`).
Chaque nouvelle session prend la dernière version de `main` ; le script ne fait
jamais échouer la préparation d'une session.

Le bureau publié liste toutes les sessions du compte (jusqu'aux 200 plus
récentes), celles au travail en tête.
