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

### Sans Docker

Il faut Python 3.10+ et ffmpeg (`sudo apt install ffmpeg` sur Ubuntu, `brew install ffmpeg` sur Mac).

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
| Moments les plus revus | La courbe « les plus revus » de YouTube, quand elle existe | 30 % |
| Chat du live | Pics de messages et d'emotes (KEKW, POG, 😂…) dans le chat des rediffusions YouTube | 22 % |
| Énergie du son | Volume par rapport aux 2 minutes autour : un passage plus intense que le reste | 16 % |
| Pics sonores | Hausses brusques de volume : cris, rires, réactions | 12 % |
| Paroles | Rires, mots forts (« incroyable », « jamais vu », « c'est fou »…), exclamations | 14 % |
| Débit de parole | On parle plus vite quand ça devient intéressant | 8 % |
| Image | Changements de plan, mouvements rapides | 8 % |

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

Les limites par vidéo sont appliquées par le serveur dans `server/config.py`. Le quota mensuel est compté
dans le navigateur.

## Réglages (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | vide | Active le classement et les titres par Claude |
| `CLIPZO_CLAUDE_MODEL` | `claude-opus-5-5` | Modèle Claude utilisé |
| `CLIPZO_CLAUDE_EFFORT` | `medium` | Effort de réflexion de Claude (`low`, `medium`, `high`) |
| `CLIPZO_WHISPER_MODEL` | `small` | Modèle de transcription (`base`, `small`, `medium`, `large-v3`, ou `off`) |
| `CLIPZO_WHISPER_DEVICE` | `auto` | `cuda` pour utiliser une carte graphique NVIDIA |
| `CLIPZO_WORKERS` | `1` | Vidéos traitées en même temps |
| `CLIPZO_DATA_DIR` | `clipzo/data` | Dossier des shorts générés (effacés au bout de 24 h) |
| `CLIPZO_JOB_TTL_HOURS` | `24` | Durée de conservation des shorts |
| `CLIPZO_MAX_UPLOAD_MB` | `4096` | Taille max des fichiers envoyés |
| `CLIPZO_FORCE_PLAN` | vide | Impose un forfait (`free`, `creator`, `pro`) quel que soit le navigateur |
| `CLIPZO_HOST` / `CLIPZO_PORT` | `127.0.0.1` / `8000` | Adresse d'écoute |

## Avant de mettre en ligne

- **Comptes et paiement ne sont pas encore faits.** Le forfait est choisi dans le navigateur, donc
  n'importe qui peut se mettre en Pro. Il faut ajouter des comptes utilisateurs et un paiement (Stripe par
  exemple) avant de faire payer. En attendant, `CLIPZO_FORCE_PLAN=free` bloque tout le monde en Gratuit.
- **Droits sur les vidéos.** Ne découpe que des vidéos dont tu as les droits ou l'accord du créateur, et
  respecte les conditions d'utilisation des plateformes.
- **Machine.** La transcription est l'étape la plus lourde : compte quelques minutes par heure de vidéo
  avec une carte graphique, beaucoup plus sur un simple processeur.
- **yt-dlp.** Les plateformes changent souvent : mets à jour régulièrement avec
  `pip install -U "yt-dlp[default,deno]"`.
- **HTTPS.** Pour un accès public, place un reverse proxy (Caddy, Nginx) devant le serveur et règle sa
  taille maximale d'envoi de fichiers.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest tests
```
