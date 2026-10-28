"""Le gestionnaire de risque : il a le dernier mot sur chaque ordre."""

from .agents import atr


def position_size(cfg, invested, credit):
    """Montant d'un nouvel achat, ou 0 si une limite l'interdit."""
    remaining_budget = cfg["budget"] - invested
    amount = min(cfg["budget"] * cfg["max_position_pct"] / 100, remaining_budget, credit * 0.95)
    return amount if amount >= cfg["min_order_amount"] else 0.0


def protective_levels(cfg, candles, price):
    """Stop-loss sous le prix (2 ATR, plafonné) et objectif de gain (4 ATR)."""
    volatility = atr(candles) or price * 0.03
    stop_gap = min(cfg["stop_atr_mult"] * volatility, price * cfg["max_stop_pct"] / 100)
    take_gap = cfg["take_profit_atr_mult"] * volatility
    digits = 2 if price >= 10 else 4 if price >= 0.1 else 6
    return round(price - stop_gap, digits), round(price + take_gap, digits)


def loss_pct_of_budget(loss, budget):
    """Perte depuis le premier tour, en % du budget confié au bot."""
    return loss / budget * 100 if budget else 0.0


def account_equity(account):
    positions = account.get("positions") or []
    invested = sum(p.get("amount", 0) for p in positions)
    return account.get("credit", 0) + invested + account.get("unrealizedPnL", 0)
