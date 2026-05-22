#!/usr/bin/env python3
"""Update Portfolio Command Center market prices."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_TICKERS = ["AMD", "TSLA", "CRWV", "CLSK", "AMZN", "SOFI", "COIN", "IBIT", "SOL", "MU"]
COINBASE_PRODUCTS = {"SOL": "SOL-USD"}


def fetch_stooq_quote(ticker: str) -> dict:
    symbol = f"{ticker.lower()}.us"
    params = urllib.parse.urlencode({"s": symbol, "f": "sd2t2ohlcv", "h": "", "e": "csv"})
    url = f"https://stooq.com/q/l/?{params}"
    request = urllib.request.Request(url, headers={"User-Agent": "portfolio-command-center/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        rows = list(csv.DictReader(response.read().decode("utf-8").splitlines()))

    if not rows:
        raise RuntimeError(f"No quote returned for {ticker}")

    row = rows[0]
    close = row.get("Close")
    if not close or close == "N/D":
        raise RuntimeError(f"No close price returned for {ticker}: {row}")

    return {
        "price": round(float(close), 4),
        "date": row.get("Date"),
        "time": row.get("Time"),
        "currency": "USD",
    }


def fetch_coinbase_spot(ticker: str) -> dict:
    product = COINBASE_PRODUCTS[ticker]
    url = f"https://api.coinbase.com/v2/prices/{product}/spot"
    request = urllib.request.Request(url, headers={"User-Agent": "portfolio-command-center/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    amount = payload.get("data", {}).get("amount")
    if not amount:
        raise RuntimeError(f"No Coinbase spot price returned for {ticker}: {payload}")

    now = datetime.now(timezone.utc)
    return {
        "price": round(float(amount), 4),
        "date": now.date().isoformat(),
        "time": now.time().replace(microsecond=0).isoformat(),
        "currency": "USD",
    }


def fetch_quote(ticker: str) -> dict:
    if ticker in COINBASE_PRODUCTS:
        return fetch_coinbase_spot(ticker)
    return fetch_stooq_quote(ticker)


def load_tickers(path: Path) -> list[str]:
    if not path.exists():
        return DEFAULT_TICKERS
    data = json.loads(path.read_text())
    prices = data.get("prices", {})
    return sorted({*DEFAULT_TICKERS, *prices.keys()})


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--tickers", nargs="*", default=None)
    args = parser.parse_args()

    tickers = args.tickers or load_tickers(args.output)
    prices = {}
    failures = {}

    for ticker in tickers:
        try:
            prices[ticker] = fetch_quote(ticker)
        except Exception as exc:  # noqa: BLE001
            failures[ticker] = str(exc)
        time.sleep(0.35)

    if not prices:
        print(f"No prices updated. Failures: {failures}", file=sys.stderr)
        return 1

    as_of_candidates = [
        f"{quote['date']}T{quote['time']}Z"
        for quote in prices.values()
        if quote.get("date") and quote.get("time")
    ]
    payload = {
        "asOf": max(as_of_candidates) if as_of_candidates else datetime.now(timezone.utc).isoformat(),
        "source": "Stooq end-of-day close + Coinbase spot",
        "updatedBy": "github-actions" if "GITHUB_ACTIONS" in __import__("os").environ else "local",
        "prices": prices,
    }
    if failures:
        payload["failures"] = failures

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(f"Updated {len(prices)} portfolio prices at {payload['asOf']}")
    if failures:
        print(f"Failures: {failures}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
