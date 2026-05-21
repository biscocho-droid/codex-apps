from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class MomentumSnapshot:
    ticker: str
    latest_price: float | None
    return_30d: float | None
    return_90d: float | None
    return_180d: float | None
    crowd_risk: str


class YahooChartClient:
    URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"

    def __init__(self, user_agent: str) -> None:
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})

    def momentum(self, ticker: str) -> MomentumSnapshot:
        try:
            response = self.session.get(
                self.URL.format(ticker=ticker),
                params={"range": "6mo", "interval": "1d"},
                timeout=20,
            )
            response.raise_for_status()
            result = response.json()["chart"]["result"][0]
        except Exception:
            LOGGER.warning("Could not fetch market data for %s", ticker, exc_info=True)
            return MomentumSnapshot(ticker, None, None, None, None, "Unknown")

        timestamps = result.get("timestamp") or []
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close") or []
        prices = [
            (datetime.fromtimestamp(ts, timezone.utc), float(close))
            for ts, close in zip(timestamps, closes)
            if close is not None
        ]
        if not prices:
            return MomentumSnapshot(ticker, None, None, None, None, "Unknown")

        latest_price = prices[-1][1]
        r30 = _period_return(prices, 30)
        r90 = _period_return(prices, 90)
        r180 = _period_return(prices, 180)
        return MomentumSnapshot(
            ticker=ticker,
            latest_price=latest_price,
            return_30d=r30,
            return_90d=r90,
            return_180d=r180,
            crowd_risk=_crowd_risk(r30, r90, r180),
        )


def _period_return(prices: list[tuple[datetime, float]], days: int) -> float | None:
    if len(prices) < 2:
        return None
    target = prices[-1][0].timestamp() - days * 86_400
    prior = None
    for timestamp, price in prices:
        if timestamp.timestamp() <= target:
            prior = price
        else:
            break
    if prior is None or prior <= 0:
        prior = prices[0][1]
    return (prices[-1][1] / prior - 1) * 100


def _crowd_risk(r30: float | None, r90: float | None, r180: float | None) -> str:
    values = [value for value in (r30, r90, r180) if value is not None]
    if not values:
        return "Unknown"
    if (r30 is not None and r30 >= 35) or (r90 is not None and r90 >= 75) or (r180 is not None and r180 >= 120):
        return "High"
    if (r30 is not None and r30 >= 18) or (r90 is not None and r90 >= 40) or (r180 is not None and r180 >= 70):
        return "Medium"
    return "Low"
