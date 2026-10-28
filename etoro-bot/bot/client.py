"""Client minimal pour l'API publique eToro (sans dépendance externe)."""

import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE_URL = "https://public-api.etoro.com"

# Routes de lecture : vérifiées sur l'API eToro.
READ_ROUTES = {
    "candles": "/api/v1/market-data/instruments/{instrument_id}/history/candles/desc/{interval}/{count}",
    "rates": "/api/v2/market-data/rates",
    "rankings": "/api/v2/portfolios/rankings/presets/{preset}",
    "live_portfolio": "/api/v1/user-info/people/{username}/portfolio/live",
    "pnl_demo": "/api/v1/trading/info/demo/pnl",
    "pnl_real": "/api/v1/trading/info/real/pnl",
}

# Routes d'ordres : tirées de la documentation eToro, à confirmer sur
# api-portal.etoro.com avant la première utilisation (voir README).
ORDER_ROUTES = {
    "open_demo": "/api/v1/trading/execution/demo/market-open-orders/by-amount",
    "open_real": "/api/v1/trading/execution/market-open-orders/by-amount",
    "close_demo": "/api/v1/trading/execution/demo/market-close-orders/positions/{position_id}",
    "close_real": "/api/v1/trading/execution/market-close-orders/positions/{position_id}",
}


class EtoroError(Exception):
    pass


class EtoroClient:
    def __init__(self, api_key, user_key, mode, base_url=BASE_URL, timeout=30):
        if mode not in ("simulation", "demo", "real"):
            raise ValueError("mode doit être 'simulation', 'demo' ou 'real'")
        self.api_key = api_key
        self.user_key = user_key
        self.mode = mode
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # --- bas niveau -------------------------------------------------------

    def _request(self, method, path, query=None, body=None, retries=3):
        url = self.base_url + path
        if query:
            url += "?" + urllib.parse.urlencode(query)
        data = json.dumps(body).encode() if body is not None else None
        for attempt in range(retries + 1):
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header("x-api-key", self.api_key)
            req.add_header("x-user-key", self.user_key)
            req.add_header("x-request-id", str(uuid.uuid4()))
            req.add_header("Accept", "application/json")
            if data is not None:
                req.add_header("Content-Type", "application/json")
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read().decode()
                    return json.loads(raw) if raw else {}
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="replace")[:500]
                if e.code == 429 and attempt < retries:
                    time.sleep(int(e.headers.get("Retry-After", "60")))
                    continue
                if e.code >= 500 and attempt < retries:
                    time.sleep(2 ** (attempt + 1))
                    continue
                raise EtoroError(f"{method} {path} -> HTTP {e.code}: {detail}") from e
            except urllib.error.URLError as e:
                if attempt < retries:
                    time.sleep(2 ** (attempt + 1))
                    continue
                raise EtoroError(f"{method} {path} -> réseau : {e.reason}") from e

    # --- lecture ----------------------------------------------------------

    def daily_candles(self, instrument_id, count=120):
        """Bougies journalières, de la plus ancienne à la plus récente."""
        path = READ_ROUTES["candles"].format(instrument_id=instrument_id, interval="OneDay", count=count)
        data = self._request("GET", path)
        groups = data.get("candles") or []
        candles = groups[0].get("candles", []) if groups else []
        return list(reversed(candles))

    def rates(self, instrument_ids):
        data = self._request("GET", READ_ROUTES["rates"], {"instrumentIds": ",".join(map(str, instrument_ids))})
        return {r["instrumentId"]: r for r in data.get("results", [])}

    def top_investors(self, preset, page_size=20):
        path = READ_ROUTES["rankings"].format(preset=urllib.parse.quote(preset))
        return self._request("GET", path, {"pageSize": page_size}).get("results", [])

    def live_portfolio(self, username):
        path = READ_ROUTES["live_portfolio"].format(username=urllib.parse.quote(username))
        return self._request("GET", path)

    def account(self):
        """Solde, positions et P&L latent du compte démo ou réel."""
        key = "pnl_real" if self.mode == "real" else "pnl_demo"
        return self._request("GET", READ_ROUTES[key]).get("clientPortfolio", {})

    # --- ordres -----------------------------------------------------------

    def open_position(self, instrument_id, amount, stop_loss, take_profit):
        """Achat au marché, sans levier. En simulation, rien n'est envoyé."""
        body = {
            "InstrumentID": instrument_id,
            "IsBuy": True,
            "Leverage": 1,
            "Amount": round(amount, 2),
            "StopLossRate": stop_loss,
            "TakeProfitRate": take_profit,
            "IsTslEnabled": False,
        }
        if self.mode == "simulation":
            return {"simulated": True, "request": body}
        key = "open_real" if self.mode == "real" else "open_demo"
        return self._request("POST", ORDER_ROUTES[key], body=body, retries=0)

    def close_position(self, position_id, instrument_id):
        body = {"InstrumentId": instrument_id, "UnitsToDeduct": None}
        if self.mode == "simulation":
            return {"simulated": True, "request": body}
        key = "close_real" if self.mode == "real" else "close_demo"
        path = ORDER_ROUTES[key].format(position_id=position_id)
        return self._request("POST", path, body=body, retries=0)
