# Clipzo

Clipzo transforme une longue vidéo (YouTube, VOD Twitch, TikTok, X, Kick, Instagram ou un fichier envoyé)
en shorts verticaux de 1 à 3 minutes. Le serveur télécharge la vidéo, l'analyse, repère les moments qui ont
le plus de chances de percer et les découpe pour de vrai avec ffmpeg.

## Lancer le site

### Avec Docker (le plus simple)

```bash
cd clipzo
export ANTHROPIC_API_KEY=sk-ant-...   # facultatif : active l'analyse par Claude
docker compose up --build
```

Ouvre ensuite http://localhost:8000.

### Sans Docker, sous Windows

Dans un terminal (`cmd`) :

```bat
winget install Python.Python.3.12
winget install Gyan.FFmpeg
```

**Ferme le terminal et rouvre-en un** (sinon il ne connaît pas encore ffmpeg), puis :

```bat
cd chemin\vers\clipzo
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set ANTHROPIC_API_KEY=sk-ant-...
py -m server
```

(`set ANTHROPIC_API_KEY` est facultatif.) Ouvre ensuite http://localhost:8000.

Si le serveur affiche « ffmpeg est introuvable », vérifie avec `ffmpeg -version` dans un nouveau terminal.
Si ffmpeg est installé ailleurs, indique son dossier `bin` :
`set CLIPZO_FFMPEG_DIR=C:\ffmpeg\bin` avant `py -m server`.

### Sans Docker, sous Mac ou Linux

Il faut Python 3.10+ et ffmpeg (`brew install ffmpeg` sur Mac, `sudo apt install ffmpeg` sur Ubuntu).

```bash
cd clipzo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...   # facultatif
python -m server
```

La première analyse télécharge le modèle de transcription Whisper (environ 500 Mo pour `small`).

Sans serveur, en ouvrant juste `index.html`, le studio passe en **mode démo** : les shorts affichés sont simulés.

## Comment l'IA choisit les moments

Chaque seconde de la vidéo reçoit un score d'intérêt calculé à partir de plusieurs signaux :

| Signal | Ce qui est mesuré | Poids |
|---|---|---|
| Moments les plus revus | La courbe « les plus revus » de YouTube, quand elle existe | 26 % |
| Chat du live | Pics de messages et d'emotes (KEKW, POG, 😂…) dans le chat des rediffusions YouTube | 18 % |
| Énergie du son | Volume par rapport aux 2 minutes autour : un passage plus intense que le reste | 14 % |
| Pics sonores | Hausses brusques de volume : cris, rires, réactions | 12 % |
| Paroles | Rires, mots forts (« incroyable », « jamais vu », « c'est fou »…), exclamations | 20 % |
| Débit de parole | On parle plus vite quand ça devient intéressant | 5 % |
| Image | Changements de plan, mouvements rapides | 5 % |

Les signaux absents (pas de chat, pas de transcription…) sont simplement retirés du calcul.

Pour chaque extrait possible de la durée choisie, l'algorithme note :

- l'intérêt moyen ;
- le pic le plus fort (la chute, la réaction) ;
- les 5 premières secondes, c'est-à-dire l'accroche ;
- les temps morts, qui pénalisent ;
- la position du pic : un pic coupé à la toute fin fait un mauvais short.

Il garde les meilleurs extraits qui ne se chevauchent pas, puis cale les bords sur des débuts et fins de
phrase pour ne jamais couper un mot.

**Avec une clé Claude** (`ANTHROPIC_API_KEY`), l'algorithme sélectionne 3 fois plus de candidats. Claude lit
leur transcription et garde ceux qui fonctionnent seuls : accroche dès les premières secondes, chute avant
la fin, pas besoin du reste de la vidéo pour comprendre. Il ajuste aussi le début et la fin. Pour le
forfait Pro, il écrit en plus le titre, l'accroche et les hashtags.

Ensuite, pour chaque short :

- recadrage en 9:16, centré sur le visage s'il y en a un (Créateur et Pro) ;
- sinon la vidéo entière sur un fond flouté (gameplay, écran partagé) ;
- sous-titres incrustés : classiques pour Créateur, animés mot par mot pour Pro ;
- son normalisé à -14 LUFS, le niveau de TikTok et YouTube Shorts ;
- filigrane pour le forfait Gratuit.

## Forfaits

| | Gratuit | Créateur (5 €) | Pro (10 €) |
|---|---|---|---|
| Shorts par mois | 3 | 50 | illimité |
| Shorts par vidéo | 5 | 8 | 12 |
| Durée max de la vidéo source | 1 h | 3 h | 10 h |
| Qualité | 720p | 1080p | 1080p, 4K si la source l'est |
| Filigrane | oui | non (option) | non (option) |
| Sous-titres | non | oui | oui, animés |
| Suivi du visage | non | oui | oui |
| Titres et hashtags IA | non | non | oui |

Toutes ces limites sont appliquées par le serveur (`server/config.py`). Le quota mensuel ne compte que les
shorts réellement livrés : une analyse annulée ou en échec ne coûte rien.

## Réglages (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | vide | Active le classement et les titres par Claude |
| `CLIPZO_CLAUDE_MODEL` | `claude-opus-5-5` | Modèle Claude utilisé |
| `CLIPZO_CLAUDE_EFFORT` | `medium` | Effort de réflexion de Claude (`low`, `medium`, `high`) |
| `CLIPZO_WHISPER_MODEL` | `small` | Modèle de transcription (`base`, `small`, `medium`, `large-v3`, ou `off`) |
| `CLIPZO_WHISPER_DEVICE` | `auto` (`cpu` sous Windows) | `cuda` pour utiliser une carte graphique NVIDIA (sous Windows, il faut aussi installer cuBLAS et cuDNN) |
| `CLIPZO_WORKERS` | `1` | Vidéos traitées en même temps |
| `CLIPZO_DATA_DIR` | `clipzo/data` | Dossier des shorts générés (effacés au bout de 24 h) |
| `CLIPZO_JOB_TTL_HOURS` | `24` | Durée de conservation des shorts |
| `CLIPZO_MAX_UPLOAD_MB` | `4096` | Taille max des fichiers envoyés |
| `CLIPZO_HOST` / `CLIPZO_PORT` | `127.0.0.1` / `8000` | Adresse d'écoute |
| `CLIPZO_FFMPEG_DIR` | vide | Dossier qui contient `ffmpeg` et `ffprobe`, s'ils ne sont pas dans le PATH |
| `STRIPE_SECRET_KEY` | vide | Clé secrète Stripe : active les abonnements payants |
| `STRIPE_WEBHOOK_SECRET` | vide | Secret du webhook Stripe (voir « Brancher Stripe ») |
| `STRIPE_PRICE_*` | vide | Identifiants de prix Stripe (facultatif) |
| `CLIPZO_PUBLIC_URL` | vide | Adresse publique du site, ex. `https://clipzo.fr` (liens de retour Stripe) |
| `CLIPZO_TRUST_PROXY` | vide | `1` derrière un reverse proxy (adresse réelle des visiteurs) |
| `CLIPZO_COOKIE_SECURE` | vide | `1` pour n'envoyer le cookie de connexion qu'en HTTPS |

## Comptes et abonnements

- Chaque utilisateur crée un compte (e-mail + mot de passe) pour lancer une analyse. Le compte gratuit
  donne 3 shorts par mois, sans carte bancaire.
- Le forfait et le quota sont gérés par le serveur (base SQLite dans `CLIPZO_DATA_DIR/clipzo.db`) :
  seuls les shorts livrés sont décomptés, une analyse annulée ou en échec ne coûte rien.
- Les abonnements Créateur et Pro passent par Stripe : page de paiement Stripe pour s'abonner, portail
  client Stripe pour changer de carte, de forfait ou résilier. Le serveur suit l'état de l'abonnement grâce
  aux notifications (webhooks) de Stripe.
- Sans clé Stripe, personne ne peut acheter de forfait (la page Tarifs l'indique), mais tu peux en donner
  un à la main, par exemple pour tester les options payantes sur ton ordinateur. Dans un **autre terminal**,
  ouvert dans le dossier `clipzo` (avec le `.venv` activé si tu en utilises un), pendant que le serveur
  tourne :

  ```bash
  python -m server.admin users                       # liste des comptes
  python -m server.admin set-plan ami@exemple.com pro
  python -m server.admin set-plan ami@exemple.com free   # retour au forfait gratuit
  ```

  Sous Windows, remplace `python` par `py`. Recharge ensuite la page du site. Le compte doit déjà exister
  (crée-le d'abord sur le site).
  Avec Docker, lance la même commande dans le conteneur, depuis le dossier `clipzo` :
  `docker compose exec clipzo python -m server.admin set-plan ami@exemple.com pro` en local, ou
  `docker compose -f docker-compose.prod.yml exec clipzo python -m server.admin ...` sur le serveur.

## Mettre le site en ligne

Il faut un serveur qui tourne en continu, avec au moins 4 Go de mémoire (par exemple un petit VPS
Hetzner, OVH ou Scaleway, autour de 5 € par mois), et un nom de domaine.

1. **Domaine.** Chez ton registrar, crée un enregistrement DNS de type `A` qui pointe ton domaine
   (par exemple `clipzo.fr`) vers l'adresse IP du serveur.
2. **Docker.** Sur le serveur (Ubuntu/Debian) : `curl -fsSL https://get.docker.com | sh`
3. **Le code.** `git clone <ton dépôt> && cd <ton dépôt>/clipzo`
4. **Les réglages.** `cp env.example .env`, puis ouvre `.env` et remplis au moins `CLIPZO_DOMAIN`.
5. **Lancement.** `docker compose -f docker-compose.prod.yml up -d --build`

   Caddy obtient tout seul le certificat HTTPS. Le site répond sur `https://ton-domaine` au bout d'une
   minute environ. La première analyse télécharge le modèle Whisper (environ 500 Mo).
6. **Mises à jour.** `git pull && docker compose -f docker-compose.prod.yml up -d --build`
7. **Sauvegardes.** Les comptes sont dans le volume `clipzo-data`. Pour en faire une copie :
   `docker compose -f docker-compose.prod.yml exec clipzo python -m server.admin backup`
   (le fichier `sauvegarde-<date>.db` est écrit dans `/data` ; copie-le ailleurs que sur le serveur).

### Brancher Stripe

1. Crée un compte sur https://dashboard.stripe.com et reste d'abord en **mode test**.
2. **Clé API.** Développeurs → Clés API → copie la clé secrète (`sk_test_...`) dans `STRIPE_SECRET_KEY`.
3. **Webhook.** Développeurs → Webhooks → Ajouter un endpoint :
   - URL : `https://ton-domaine/api/billing/webhook`
   - Événements : `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`

   Copie le « secret de signature » (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET`.
4. **Portail client.** Paramètres → Facturation → Portail client : active-le et autorise la résiliation.
   Pour que les clients puissent changer de forfait eux-mêmes, crée les 4 prix (Créateur et Pro, mensuel
   et annuel) dans le catalogue de produits, ajoute-les au portail et mets leurs identifiants (`price_...`)
   dans les variables `STRIPE_PRICE_*`. Sans ces identifiants, les prix 5 € / 10 € par mois (‑20 % à
   l'année) sont créés automatiquement au paiement, et changer de forfait se fait en résiliant puis en
   se réabonnant.
5. Relance le site (`docker compose ... up -d`), puis teste un abonnement avec la carte de test
   `4242 4242 4242 4242` (date future, n'importe quel code).

   **Tester Stripe sur ton ordinateur** (sans domaine) : Stripe ne peut pas joindre `localhost`, alors
   installe la [Stripe CLI](https://docs.stripe.com/stripe-cli). Dans un premier terminal, lance
   `stripe login` puis `stripe listen --forward-to localhost:8000/api/billing/webhook` et laisse-le
   ouvert : il affiche un secret `whsec_...`. Dans le terminal du serveur (dossier `clipzo`), arrête-le
   avec Ctrl+C puis relance-le avec les deux clés :

   ```bat
   set STRIPE_SECRET_KEY=sk_test_...
   set STRIPE_WEBHOOK_SECRET=whsec_...
   py -m server
   ```

   (Mac/Linux : `export` au lieu de `set`, et `python -m server`.) `py -m server` ne lit pas le fichier
   `.env` : il ne sert qu'avec Docker (`docker compose up` le lit aussi pour ces deux clés).
6. Quand tout marche, refais les étapes 2 à 4 en **mode live** avec les vraies clés.

### À savoir

- **Droits sur les vidéos.** Ne découpe que des vidéos dont tu as les droits ou l'accord du créateur, et
  respecte les conditions d'utilisation des plateformes.
- **Machine.** La transcription est l'étape la plus lourde : compte quelques minutes par heure de vidéo
  avec une carte graphique, beaucoup plus sur un simple processeur.
- **yt-dlp.** Les plateformes changent souvent : reconstruis l'image régulièrement
  (`up -d --build`) pour avoir la dernière version de yt-dlp.
- **Factures et TVA.** Stripe envoie les reçus ; pour la TVA et les mentions légales (CGV, politique de
  confidentialité), renseigne-toi selon ton statut (micro-entreprise, société).

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest tests
```
