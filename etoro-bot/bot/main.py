"""Un tour du bot : analyse, décisions, ordres, journal.

Lancement : python -m bot.main            (un tour)
            python -m bot.main --boucle 240  (un tour toutes les 4 heures)
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from .agents import build_crowd, decide, market_agent, social_agent, technical_agent
from .client import EtoroClient, EtoroError
from .risk import account_equity, loss_pct_of_budget, position_size, protective_levels

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config.json"
STATE = ROOT / "state.json"
JOURNAL = ROOT / "journal.jsonl"
STOP = ROOT / "STOP"

REAL_CONFIRMATION = "J'ACCEPTE DE POUVOIR PERDRE CET ARGENT"


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def log(event, **data):
    with JOURNAL.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"at": now(), "event": event, **data}, ensure_ascii=False) + "\n")


def say(text):
    print(text, flush=True)


def load_config():
    if not CONFIG.exists():
        sys.exit("config.json introuvable : copie config.example.json en config.json et ajuste-le.")
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    if cfg["mode"] == "real" and cfg.get("real_mode_confirmation") != REAL_CONFIRMATION:
        sys.exit(f'Mode réel refusé : écris exactement "{REAL_CONFIRMATION}" dans real_mode_confirmation.')
    return cfg


def load_state():
    return json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}


def save_state(state):
    STATE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def gather_crowd(client, cfg):
    """Portefeuilles en direct des meilleurs investisseurs, filtrés par risque."""
    investors, seen = [], set()
    for preset in cfg["ranking_presets"]:
        try:
            for inv in client.top_investors(preset, page_size=cfg["max_investors"]):
                if inv["username"] not in seen and inv.get("riskScore", 10) <= cfg["max_investor_risk"]:
                    seen.add(inv["username"])
                    investors.append(inv["username"])
        except EtoroError as e:
            say(f"  ! classement {preset} indisponible : {e}")
    portfolios = []
    for username in investors[: cfg["max_investors"]]:
        try:
            portfolios.append(client.live_portfolio(username))
        except EtoroError as e:
            say(f"  ! portefeuille de {username} indisponible : {e}")
        time.sleep(1.1)
    return build_crowd(portfolios)


def close_all(client, positions, reason):
    for p in positions:
        pid, iid = p.get("positionID") or p.get("positionId"), p.get("instrumentID") or p.get("instrumentId")
        try:
            client.close_position(pid, iid)
            log("vente", position=pid, instrument=iid, reason=reason)
        except EtoroError as e:
            log("erreur", action="vente", position=pid, error=str(e))
            say(f"  ! vente de la position {pid} refusée : {e}")


def run_once(cfg, client):
    if STOP.exists():
        say("Arrêt d'urgence actif (fichier STOP présent). Supprime-le pour relancer le bot.")
        return

    say(f"=== Tour du {now()} · mode {cfg['mode']} ===")
    account = client.account()
    watch_ids = {iid: sym for sym, iid in cfg["watchlist"].items()}
    positions = [p for p in account.get("positions") or [] if (p.get("instrumentID") or p.get("instrumentId")) in watch_ids]
    held = {(p.get("instrumentID") or p.get("instrumentId")): p for p in positions}
    equity = account_equity(account)

    state = load_state()
    state.setdefault("start_equity", equity)
    save_state(state)
    loss = state["start_equity"] - equity
    dd = loss_pct_of_budget(loss, cfg["budget"])
    say(f"Valeur du compte : {equity:,.2f} $ (départ {state['start_equity']:,.2f} $, "
        f"perte {max(loss, 0):,.2f} $ = {max(dd, 0):.1f} % du budget)")

    if dd >= cfg["max_drawdown_pct"]:
        say(f"Perte maximale atteinte ({dd:.1f} % du budget) : je vends tout et je m'arrête.")
        close_all(client, positions, "perte maximale atteinte")
        STOP.write_text(f"Arrêt le {now()} : perte de {loss:,.2f} $ ({dd:.1f} % du budget).\n", encoding="utf-8")
        log("arret_urgence", loss=round(loss, 2), pct_of_budget=round(dd, 2))
        return

    say("Analyse des meilleurs investisseurs eToro...")
    crowd = gather_crowd(client, cfg)
    index = cfg["market_index"]
    market = market_agent(client.daily_candles(index["id"]))
    say(f"Climat du marché : {market.score:+.2f} ({'; '.join(market.reasons)})")

    rates = client.rates(list(watch_ids))
    decisions = []
    for sym, iid in cfg["watchlist"].items():
        try:
            candles = client.daily_candles(iid)
        except EtoroError as e:
            say(f"  ! {sym} : bougies indisponibles ({e})")
            continue
        opinions = [technical_agent(candles), social_agent(iid, crowd), market]
        action, score = decide(opinions, iid in held, cfg["buy_threshold"], cfg["sell_threshold"])
        decisions.append({"symbol": sym, "id": iid, "action": action, "score": score, "candles": candles, "opinions": opinions})
        log("analyse", symbol=sym, action=action, score=round(score, 3),
            opinions={o.agent: {"score": round(o.score, 3), "raisons": o.reasons} for o in opinions})
        say(f"  {sym:<8} {score:+.2f}  {action}")

    # Ventes d'abord, pour libérer de la place.
    for d in decisions:
        if d["action"] == "vendre":
            say(f"→ Vente de {d['symbol']} (score {d['score']:+.2f})")
            close_all(client, [held[d["id"]]], f"score {d['score']:+.2f}")
            held.pop(d["id"], None)

    invested = sum(p.get("amount", 0) for p in held.values())
    credit = account.get("credit", 0)
    buys = sorted((d for d in decisions if d["action"] == "acheter"), key=lambda d: d["score"], reverse=True)
    trades = 0
    for d in buys:
        if trades >= cfg["max_trades_per_run"] or len(held) >= cfg["max_positions"]:
            break
        amount = position_size(cfg, invested, credit)
        if not amount:
            say("Budget du bot épuisé : pas de nouvel achat.")
            break
        quote = rates.get(d["id"])
        if not quote:
            continue
        price = quote["ask"]
        stop_loss, take_profit = protective_levels(cfg, d["candles"], price)
        say(f"→ Achat de {d['symbol']} : {amount:,.2f} $ à ~{price} (stop {stop_loss}, objectif {take_profit})")
        try:
            result = client.open_position(d["id"], amount, stop_loss, take_profit)
        except EtoroError as e:
            say(f"  ! ordre refusé : {e}")
            log("erreur", action="achat", symbol=d["symbol"], error=str(e))
            continue
        log("achat", symbol=d["symbol"], amount=round(amount, 2), price=price,
            stop_loss=stop_loss, take_profit=take_profit, result=result)
        invested += amount
        credit -= amount
        held[d["id"]] = {"amount": amount}
        trades += 1

    say(f"Fin du tour : {trades} achat(s), {len(held)} position(s) suivie(s), {invested:,.2f} $ investis sur {cfg['budget']:,.2f} $.")


def main():
    parser = argparse.ArgumentParser(description="Bot de trading multi-agents pour eToro")
    parser.add_argument("--boucle", type=int, metavar="MINUTES", help="relancer un tour toutes les N minutes")
    args = parser.parse_args()

    cfg = load_config()
    api_key, user_key = os.environ.get("ETORO_API_KEY"), os.environ.get("ETORO_USER_KEY")
    if not api_key or not user_key:
        sys.exit("Clés manquantes : définis ETORO_API_KEY et ETORO_USER_KEY (voir README).")
    client = EtoroClient(api_key, user_key, cfg["mode"])

    while True:
        try:
            run_once(cfg, client)
        except EtoroError as e:
            say(f"Erreur eToro : {e}")
            log("erreur", error=str(e))
        if not args.boucle or STOP.exists():
            break
        time.sleep(args.boucle * 60)


if __name__ == "__main__":
    main()
