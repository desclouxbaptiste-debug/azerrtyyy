# Bot de trading eToro multi-agents

Un script Python qui analyse les marchés et passe des ordres sur eToro tout seul,
dans des limites de risque qu'il ne peut pas dépasser.

> **À lire avant tout.** Aucun bot ne garantit de gagner de l'argent, celui-ci non
> plus : il peut perdre. Commence en mode `simulation`, puis `demo`, et ne passe en
> `real` qu'avec de l'argent que tu peux perdre sans que ça te mette en difficulté.
> Le mode réel demande un compte eToro **vérifié**.

## Comment il décide

À chaque tour, quatre agents donnent leur avis sur chaque actif de la liste :

| Agent | Ce qu'il regarde | Poids |
|---|---|---|
| Technique | Moyennes mobiles 20 et 50 jours, élan sur 20 jours, RSI | 50 % |
| Social | Ce que détiennent les meilleurs investisseurs eToro (classements « Beating the market »), en ignorant ceux trop risqués | 30 % |
| Marché | Le S&P 500 par rapport à sa moyenne 50 jours : on achète moins quand tout le marché baisse | 20 % |
| Décideur | Additionne les avis : achète au-dessus de `buy_threshold`, vend en dessous de `sell_threshold` | — |

Puis le **gestionnaire de risque** a le dernier mot :

- jamais d'effet de levier, jamais de vente à découvert (achats seulement) ;
- au plus `max_position_pct` % du budget par position, et jamais plus que `budget` au total ;
- au plus `max_positions` positions et `max_trades_per_run` achats par tour ;
- un stop-loss sur chaque achat (2 fois la volatilité, au plus `max_stop_pct` % sous le prix) et un objectif de gain ;
- **arrêt d'urgence** : si le compte a perdu plus de `max_drawdown_pct` % du budget depuis le premier tour, le bot vend tout, crée un fichier `STOP` et ne fait plus rien tant que tu ne l'as pas supprimé.

Chaque analyse et chaque ordre est écrit dans `journal.jsonl`, avec les raisons.

## Les trois modes

| `mode` | Ce qui se passe |
|---|---|
| `simulation` | Lit les vrais prix et ton compte démo, mais **n'envoie aucun ordre**. Par défaut. |
| `demo` | Passe de vrais ordres sur ton **compte démo** (argent virtuel). |
| `real` | Passe des ordres avec **ton argent**. Refusé tant que `real_mode_confirmation` ne contient pas exactement `J'ACCEPTE DE POUVOIR PERDRE CET ARGENT`. |

## Installation

Il faut Python 3.10 ou plus récent. Aucune bibliothèque à installer.

1. **Crée tes clés API eToro** : sur eToro, va dans Paramètres → Trading → API Key Management
   (le chemin exact peut changer, voir api-portal.etoro.com). Il faut une clé d'application
   et une clé utilisateur. Donne à la clé les droits démo pour commencer.
   **Ne partage jamais ces clés**, ni dans un chat, ni sur GitHub.
2. **Copie la configuration** :

   ```bash
   cp config.example.json config.json
   ```

3. **Mets tes clés dans le terminal** (macOS / Linux) :

   ```bash
   export ETORO_API_KEY="ta-clé-application"
   export ETORO_USER_KEY="ta-clé-utilisateur"
   ```

   Sous Windows (PowerShell) : `$env:ETORO_API_KEY="..."` et `$env:ETORO_USER_KEY="..."`.

4. **Lance un tour** :

   ```bash
   python -m bot.main
   ```

   Ou un tour toutes les 4 heures, tant que la fenêtre reste ouverte :

   ```bash
   python -m bot.main --boucle 240
   ```

## Avant de passer en mode `demo`

Les routes de lecture du bot ont été vérifiées sur l'API eToro. Les routes qui
**passent les ordres** (`ORDER_ROUTES` dans `bot/client.py`) viennent de la
documentation eToro et n'ont pas pu être testées d'ici. Au premier tour en mode
`demo`, regarde le résultat : si un ordre est refusé avec une erreur 404 ou 400,
compare ces routes et les champs envoyés avec api-portal.etoro.com.

## Conseils

- **Un compte dédié.** Le bot considère comme siennes toutes les positions des actifs de sa liste.
  Ne trade pas ces actifs à la main sur le même compte.
- **Après un dépôt ou un retrait**, supprime `state.json` : sinon le bot prend le dépôt pour un gain
  (ou le retrait pour une perte).
- **Évalue-le honnêtement.** Après 1 ou 2 mois en démo, compare son résultat à un simple achat de
  l'ETF SPY sur la même période. S'il ne fait pas mieux, l'ETF est le meilleur choix.
- **Pour l'arrêter tout de suite**, crée un fichier vide nommé `STOP` dans ce dossier.

## Tests

```bash
python -m unittest tests.test_bot -v
```
