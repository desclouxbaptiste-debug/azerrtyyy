"""Les agents d'analyse. Chacun rend un score entre -1 (vendre) et +1 (acheter)
avec ses raisons, pour que chaque décision soit lisible dans le journal."""

from dataclasses import dataclass, field


@dataclass
class Opinion:
    agent: str
    score: float
    reasons: list = field(default_factory=list)


def clamp(x, lo=-1.0, hi=1.0):
    return max(lo, min(hi, x))


# --- indicateurs ------------------------------------------------------------

def sma(values, n):
    return sum(values[-n:]) / n if len(values) >= n else None


def rsi(closes, n=14):
    if len(closes) <= n:
        return None
    gains = losses = 0.0
    for prev, cur in zip(closes[-n - 1:-1], closes[-n:]):
        diff = cur - prev
        if diff > 0:
            gains += diff
        else:
            losses -= diff
    if losses == 0:
        return 100.0
    rs = (gains / n) / (losses / n)
    return 100 - 100 / (1 + rs)


def atr(candles, n=14):
    if len(candles) <= n:
        return None
    trs = []
    for prev, c in zip(candles[-n - 1:-1], candles[-n:]):
        trs.append(max(c["high"] - c["low"], abs(c["high"] - prev["close"]), abs(c["low"] - prev["close"])))
    return sum(trs) / n


# --- agent 1 : analyse technique --------------------------------------------

def technical_agent(candles):
    """Tendance (moyennes mobiles), élan sur 20 jours et RSI."""
    closes = [c["close"] for c in candles]
    if len(closes) < 60:
        return Opinion("technique", 0.0, ["historique trop court"])
    price, s20, s50 = closes[-1], sma(closes, 20), sma(closes, 50)
    score, reasons = 0.0, []

    if price > s50 and s20 > s50:
        score += 0.4
        reasons.append("tendance haussière (prix et MM20 au-dessus de la MM50)")
    elif price < s50 and s20 < s50:
        score -= 0.4
        reasons.append("tendance baissière (prix et MM20 sous la MM50)")

    momentum = closes[-1] / closes[-21] - 1
    score += clamp(momentum / 0.10) * 0.3
    reasons.append(f"élan 20 jours {momentum:+.1%}")

    r = rsi(closes)
    if r is not None:
        if r > 75:
            score -= 0.3
            reasons.append(f"RSI {r:.0f} : surachat")
        elif r < 30:
            score += 0.2
            reasons.append(f"RSI {r:.0f} : survente")
    return Opinion("technique", clamp(score), reasons)


# --- agent 2 : avis des meilleurs investisseurs eToro -----------------------

def social_agent(instrument_id, crowd):
    """`crowd` : {instrument_id: (nb_acheteurs, nb_vendeurs), "_total": nb_investisseurs}."""
    buyers, sellers = crowd.get(instrument_id, (0, 0))
    total = crowd.get("_total", 0)
    if not total:
        return Opinion("social", 0.0, ["pas de données sur les investisseurs"])
    share = (buyers - sellers) / total
    score = clamp(share * 3)
    return Opinion("social", score, [f"{buyers} des {total} meilleurs investisseurs suivis en détiennent"])


def build_crowd(portfolios):
    """Compte, pour chaque actif, combien d'investisseurs l'ont en achat ou en vente."""
    crowd = {"_total": len(portfolios)}
    for p in portfolios:
        held = {}
        positions = list(p.get("positions") or [])
        for st in p.get("socialTrades") or []:
            positions.extend(st.get("positions") or [])
        for pos in positions:
            held.setdefault(pos["instrumentId"], set()).add(bool(pos.get("isBuy", True)))
        for iid, sides in held.items():
            b, s = crowd.get(iid, (0, 0))
            crowd[iid] = (b + (True in sides), s + (sides == {False}))
    return crowd


# --- agent 3 : climat du marché ---------------------------------------------

def market_agent(index_candles):
    """Regarde le S&P 500 : on achète moins quand le marché entier baisse."""
    closes = [c["close"] for c in index_candles]
    s50 = sma(closes, 50)
    if s50 is None:
        return Opinion("marché", 0.0, ["historique de l'indice trop court"])
    gap = closes[-1] / s50 - 1
    return Opinion("marché", clamp(gap / 0.05), [f"S&P 500 à {gap:+.1%} de sa MM50"])


# --- agent 4 : décideur -----------------------------------------------------

WEIGHTS = {"technique": 0.5, "social": 0.3, "marché": 0.2}


def decide(opinions, held, buy_threshold, sell_threshold):
    total = sum(WEIGHTS[o.agent] * o.score for o in opinions)
    if not held and total >= buy_threshold:
        action = "acheter"
    elif held and total <= sell_threshold:
        action = "vendre"
    else:
        action = "garder" if held else "attendre"
    return action, total
