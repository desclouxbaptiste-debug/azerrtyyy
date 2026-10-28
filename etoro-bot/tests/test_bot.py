import unittest

from bot.agents import build_crowd, decide, market_agent, rsi, social_agent, technical_agent
from bot.client import EtoroClient
from bot.risk import account_equity, loss_pct_of_budget, position_size, protective_levels

CFG = {
    "budget": 1000, "max_position_pct": 10, "min_order_amount": 10,
    "stop_atr_mult": 2, "max_stop_pct": 8, "take_profit_atr_mult": 4,
}


def candles(closes):
    return [{"open": c, "high": c * 1.01, "low": c * 0.99, "close": c} for c in closes]


class AgentTests(unittest.TestCase):
    def test_rising_trend_is_positive(self):
        op = technical_agent(candles([100 + i for i in range(100)]))
        self.assertGreater(op.score, 0.3)

    def test_falling_trend_is_negative(self):
        op = technical_agent(candles([200 - i for i in range(100)]))
        self.assertLess(op.score, -0.3)

    def test_short_history_is_neutral(self):
        self.assertEqual(technical_agent(candles([100] * 10)).score, 0.0)

    def test_rsi_bounds(self):
        self.assertEqual(rsi([float(i) for i in range(30)]), 100.0)
        self.assertLess(rsi([float(30 - i) for i in range(30)]), 1)

    def test_crowd_counts_buyers_and_short_sellers(self):
        crowd = build_crowd([
            {"positions": [{"instrumentId": 1, "isBuy": True}, {"instrumentId": 1, "isBuy": True}]},
            {"positions": [{"instrumentId": 1, "isBuy": False}],
             "socialTrades": [{"positions": [{"instrumentId": 2, "isBuy": True}]}]},
        ])
        self.assertEqual(crowd["_total"], 2)
        self.assertEqual(crowd[1], (1, 1))
        self.assertEqual(crowd[2], (1, 0))
        self.assertEqual(social_agent(1, crowd).score, 0.0)
        self.assertGreater(social_agent(2, crowd).score, 0)

    def test_market_agent_sign(self):
        self.assertGreater(market_agent(candles([100 + i for i in range(60)])).score, 0)

    def test_decide(self):
        from bot.agents import Opinion
        strong = [Opinion("technique", 1), Opinion("social", 1), Opinion("marché", 1)]
        weak = [Opinion("technique", -1), Opinion("social", -1), Opinion("marché", -1)]
        self.assertEqual(decide(strong, False, 0.35, -0.15)[0], "acheter")
        self.assertEqual(decide(strong, True, 0.35, -0.15)[0], "garder")
        self.assertEqual(decide(weak, True, 0.35, -0.15)[0], "vendre")
        self.assertEqual(decide(weak, False, 0.35, -0.15)[0], "attendre")


class RiskTests(unittest.TestCase):
    def test_position_size_respects_limits(self):
        self.assertEqual(position_size(CFG, 0, 100000), 100)
        self.assertEqual(position_size(CFG, 950, 100000), 50)
        self.assertEqual(position_size(CFG, 995, 100000), 0)
        self.assertEqual(position_size(CFG, 0, 5), 0)

    def test_stop_is_below_price_and_capped(self):
        stop, take = protective_levels(CFG, candles([100] * 30), 100)
        self.assertLess(stop, 100)
        self.assertGreaterEqual(stop, 92)
        self.assertGreater(take, 100)

    def test_equity_and_loss(self):
        acct = {"credit": 900, "positions": [{"amount": 100}], "unrealizedPnL": -20}
        self.assertEqual(account_equity(acct), 980)
        self.assertEqual(loss_pct_of_budget(100, 1000), 10)


class ClientTests(unittest.TestCase):
    def test_simulation_sends_no_order(self):
        client = EtoroClient("k", "u", "simulation", base_url="http://127.0.0.1:9")
        result = client.open_position(1001, 100, 90, 120)
        self.assertTrue(result["simulated"])
        self.assertEqual(result["request"]["Leverage"], 1)
        self.assertTrue(result["request"]["IsBuy"])


if __name__ == "__main__":
    unittest.main()
