#!/usr/bin/env python3
"""Polygon options credit-spread backtest prototype.

This uses Polygon option aggregate bars, not quotes. That means fills are
conservative estimates from OHLC data, and the scanner's historical bid/ask and
open-interest filters cannot be reproduced unless the Polygon plan includes
snapshot/quote data.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import os
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests


BASE_URL = "https://api.polygon.io"
DEFAULT_TICKERS = ["SPY", "QQQ", "IWM", "AAPL", "AMZN", "MSFT", "NVDA", "TSLA", "PLTR"]
DEFAULT_EXPERIMENTS = [
    {
        "name": "all_trades",
        "description": "Every simulated spread.",
    },
    {
        "name": "puts_only",
        "description": "Put credit spreads only.",
        "option_type": "put",
    },
    {
        "name": "calls_only",
        "description": "Call credit spreads only.",
        "option_type": "call",
    },
    {
        "name": "high_credit_to_risk",
        "description": "Credit/risk >= 20%.",
        "min_credit_to_risk": 0.20,
    },
    {
        "name": "liquid_entries",
        "description": "Entry volume >= 100 contracts on both legs.",
        "min_entry_volume": 100,
    },
    {
        "name": "conservative_delta",
        "description": "Short delta absolute value <= 0.22.",
        "max_abs_delta": 0.22,
    },
    {
        "name": "balanced_liquid",
        "description": "Credit/risk >= 18%, volume >= 50, abs(delta) <= 0.25.",
        "min_credit_to_risk": 0.18,
        "min_entry_volume": 50,
        "max_abs_delta": 0.25,
    },
    {
        "name": "higher_iv",
        "description": "Estimated IV >= 30%.",
        "min_iv": 0.30,
    },
]


@dataclass(frozen=True)
class BacktestRules:
    min_dte: int = 45
    max_dte: int = 60
    spread_width: float = 5.0
    min_credit: float = 0.60
    min_short_delta: float = -0.30
    max_short_delta: float = -0.15
    min_short_call_delta: float = 0.15
    max_short_call_delta: float = 0.30
    risk_free_rate: float = 0.045
    min_entry_volume: int = 1
    fill_haircut: float = 0.10
    profit_target_pct: float = 0.50
    stop_loss_multiple: float = 2.0
    exit_dte: int = 21


class RateLimiter:
    def __init__(self, rpm: float) -> None:
        if rpm <= 0:
            raise ValueError("requests-per-minute must be > 0")
        self.min_interval = 60.0 / rpm
        self.last_call = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self.last_call
        wait_s = self.min_interval - elapsed
        if wait_s > 0:
            time.sleep(wait_s)
        self.last_call = time.monotonic()


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, value = s.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"").strip("'"))


def require_api_key() -> str:
    key = os.getenv("POLYGON_API_KEY")
    if not key:
        raise RuntimeError("POLYGON_API_KEY is not set. Put it in env or quant-polygon/.env.")
    return key


def cache_path(cache_dir: Path, url: str, params: dict[str, Any]) -> Path:
    public_params = {key: value for key, value in params.items() if key.lower() != "apikey"}
    raw = f"{url}?{urlencode(sorted(public_params.items()))}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return cache_dir / digest[:2] / f"{digest}.json"


def read_cache(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_cache(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload) + "\n", encoding="utf-8")
    tmp.replace(path)


def normal_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def bs_price(spot: float, strike: float, dte: int, vol: float, rate: float, option_type: str) -> float:
    if spot <= 0 or strike <= 0 or dte <= 0 or vol <= 0:
        return 0.0
    t = dte / 365.0
    sigma_t = vol * math.sqrt(t)
    if sigma_t <= 0:
        return 0.0
    d1 = (math.log(spot / strike) + (rate + 0.5 * vol * vol) * t) / sigma_t
    d2 = d1 - sigma_t
    if option_type == "call":
        return spot * normal_cdf(d1) - strike * math.exp(-rate * t) * normal_cdf(d2)
    return strike * math.exp(-rate * t) * normal_cdf(-d2) - spot * normal_cdf(-d1)


def bs_delta(spot: float, strike: float, dte: int, vol: float, rate: float, option_type: str) -> float:
    t = dte / 365.0
    sigma_t = vol * math.sqrt(t)
    if spot <= 0 or strike <= 0 or dte <= 0 or sigma_t <= 0:
        return 0.0
    d1 = (math.log(spot / strike) + (rate + 0.5 * vol * vol) * t) / sigma_t
    return normal_cdf(d1) if option_type == "call" else normal_cdf(d1) - 1.0


def implied_vol(price: float, spot: float, strike: float, dte: int, rate: float, option_type: str) -> float | None:
    if price <= 0 or spot <= 0 or strike <= 0 or dte <= 0:
        return None
    lo, hi = 0.01, 5.0
    for _ in range(80):
        mid = (lo + hi) / 2.0
        model = bs_price(spot, strike, dte, mid, rate, option_type)
        if model < price:
            lo = mid
        else:
            hi = mid
    vol = (lo + hi) / 2.0
    return vol if math.isfinite(vol) else None


def request_json(
    session: requests.Session,
    limiter: RateLimiter,
    url: str,
    params: dict[str, Any],
    timeout: int,
    retry_max: int,
    cache_dir: Path | None = None,
    refresh_cache: bool = False,
) -> dict[str, Any]:
    cpath = cache_path(cache_dir, url, params) if cache_dir else None
    if cpath and not refresh_cache:
        cached = read_cache(cpath)
        if cached is not None:
            return cached

    for attempt in range(1, retry_max + 2):
        limiter.wait()
        response = session.get(url, params=params, timeout=timeout)
        if response.status_code == 200:
            payload = response.json()
            if cpath:
                write_cache(cpath, payload)
            return payload
        if response.status_code in {429, 500, 502, 503, 504} and attempt <= retry_max:
            retry_after = response.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                sleep_s = float(retry_after)
            elif response.status_code == 429:
                sleep_s = 65.0
            else:
                sleep_s = min(60.0, 2 ** (attempt - 1))
            print(f"Retry {attempt}/{retry_max} status={response.status_code}; sleep {sleep_s:.1f}s")
            time.sleep(sleep_s)
            continue
        raise RuntimeError(f"Polygon request failed {response.status_code}: {response.text[:300]}")
    raise RuntimeError("Unreachable request retry state")


def list_contracts(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    symbol: str,
    option_type: str,
    entry_date: dt.date,
    min_exp: dt.date,
    max_exp: dt.date,
    strike_min: float,
    strike_max: float,
    args: argparse.Namespace,
) -> list[dict[str, Any]]:
    url = f"{BASE_URL}/v3/reference/options/contracts"
    params: dict[str, Any] = {
        "underlying_ticker": symbol,
        "contract_type": option_type,
        "as_of": entry_date.isoformat(),
        "expiration_date.gte": min_exp.isoformat(),
        "expiration_date.lte": max_exp.isoformat(),
        "strike_price.gte": round(strike_min, 2),
        "strike_price.lte": round(strike_max, 2),
        "limit": 1000,
        "sort": "expiration_date",
        "order": "asc",
        "apiKey": api_key,
    }
    contracts: list[dict[str, Any]] = []
    while True:
        payload = request_json(
            session,
            limiter,
            url,
            params,
            args.timeout,
            args.retry_max,
            args.cache_dir,
            args.refresh_cache,
        )
        contracts.extend(payload.get("results", []))
        next_url = payload.get("next_url")
        if not next_url:
            break
        url = next_url
        params = {"apiKey": api_key}
    return contracts


def get_daily_aggs(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    ticker: str,
    start: dt.date,
    end: dt.date,
    args: argparse.Namespace,
) -> list[dict[str, Any]]:
    memory = getattr(args, "_agg_memory", None)
    if memory is None:
        memory = {}
        setattr(args, "_agg_memory", memory)

    wide_start_raw = getattr(args, "wide_agg_start", None)
    wide_end_raw = getattr(args, "wide_agg_end", None)
    if wide_start_raw and wide_end_raw:
        wide_start = parse_date(wide_start_raw)
        wide_end = parse_date(wide_end_raw)
        if wide_start <= start and end <= wide_end:
            if ticker not in memory:
                memory[ticker] = _fetch_daily_aggs(session, limiter, api_key, ticker, wide_start, wide_end, args)
            return [bar for bar in memory[ticker] if start <= bar_date(bar) <= end]

    cache_key = (ticker, start.isoformat(), end.isoformat())
    if cache_key not in memory:
        memory[cache_key] = _fetch_daily_aggs(session, limiter, api_key, ticker, start, end, args)
    return memory[cache_key]


def _fetch_daily_aggs(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    ticker: str,
    start: dt.date,
    end: dt.date,
    args: argparse.Namespace,
) -> list[dict[str, Any]]:
    url = f"{BASE_URL}/v2/aggs/ticker/{ticker}/range/1/day/{start.isoformat()}/{end.isoformat()}"
    payload = request_json(
        session,
        limiter,
        url,
        {"adjusted": "true", "sort": "asc", "limit": 50000, "apiKey": api_key},
        args.timeout,
        args.retry_max,
        args.cache_dir,
        args.refresh_cache,
    )
    return payload.get("results", [])


def bar_date(bar: dict[str, Any]) -> dt.date:
    return dt.datetime.fromtimestamp(bar["t"] / 1000, tz=dt.timezone.utc).date()


def close_price_on_or_before(bars: list[dict[str, Any]], target: dt.date) -> float | None:
    chosen = None
    for bar in bars:
        if bar_date(bar) <= target:
            chosen = bar
    return float(chosen["c"]) if chosen else None


def stock_close(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    symbol: str,
    entry_date: dt.date,
    args: argparse.Namespace,
) -> float | None:
    bars = get_daily_aggs(session, limiter, api_key, symbol, entry_date - dt.timedelta(days=7), entry_date, args)
    return close_price_on_or_before(bars, entry_date)


def entry_bar_for_contract(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    ticker: str,
    entry_date: dt.date,
    args: argparse.Namespace,
) -> dict[str, Any] | None:
    bars = get_daily_aggs(session, limiter, api_key, ticker, entry_date, entry_date, args)
    return bars[0] if bars else None


def passes_delta(delta: float, option_type: str, rules: BacktestRules) -> bool:
    if option_type == "put":
        return rules.min_short_delta <= delta <= rules.max_short_delta
    return rules.min_short_call_delta <= delta <= rules.max_short_call_delta


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def entry_dates_from_args(args: argparse.Namespace) -> list[dt.date]:
    if args.entry_dates:
        raw_dates = args.entry_dates
    elif args.entry_start and args.entry_end:
        start = parse_date(args.entry_start)
        end = parse_date(args.entry_end)
        if end < start:
            raise ValueError("--entry-end must be on or after --entry-start")
        raw_dates = []
        day = start
        while day <= end:
            if day.weekday() in args.entry_weekdays:
                raw_dates.append(day.isoformat())
            day += dt.timedelta(days=args.entry_frequency_days)
    else:
        raw_dates = [args.entry_date]

    dates = sorted({parse_date(value) for value in raw_dates})
    if not dates:
        raise ValueError("No entry dates selected")
    return dates


def rules_from_args(args: argparse.Namespace) -> BacktestRules:
    return BacktestRules(
        min_dte=args.min_dte,
        max_dte=args.max_dte,
        spread_width=args.spread_width,
        min_credit=args.min_credit,
        min_short_delta=args.min_short_delta,
        max_short_delta=args.max_short_delta,
        min_short_call_delta=args.min_short_call_delta,
        max_short_call_delta=args.max_short_call_delta,
        risk_free_rate=args.risk_free_rate,
        min_entry_volume=args.min_entry_volume,
        fill_haircut=args.fill_haircut,
        profit_target_pct=args.profit_target_pct,
        stop_loss_multiple=args.stop_loss_multiple,
        exit_dte=args.exit_dte,
    )


def find_candidates_for_date(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    symbol: str,
    entry_date: dt.date,
    rules: BacktestRules,
    args: argparse.Namespace,
) -> tuple[list[dict[str, Any]], list[str]]:
    warnings: list[str] = []
    spot = stock_close(session, limiter, api_key, symbol, entry_date, args)
    if spot is None:
        return [], [f"{symbol} {entry_date}: no stock close"]

    min_exp = entry_date + dt.timedelta(days=rules.min_dte)
    max_exp = entry_date + dt.timedelta(days=rules.max_dte)
    candidates: list[dict[str, Any]] = []
    contract_cache: dict[str, dict[str, Any] | None] = {}

    specs = [
        ("put", spot * args.put_strike_floor, spot * args.put_strike_ceiling, -rules.spread_width),
        ("call", spot * args.call_strike_floor, spot * args.call_strike_ceiling, rules.spread_width),
    ]
    for option_type, strike_min, strike_max, width_direction in specs:
        contracts = list_contracts(
            session,
            limiter,
            api_key,
            symbol,
            option_type,
            entry_date,
            min_exp,
            max_exp,
            strike_min,
            strike_max,
            args,
        )
        contracts = sorted(
            contracts,
            key=lambda item: abs(float(item["strike_price"]) - spot),
        )
        if args.max_contracts_per_type > 0:
            contracts = contracts[: args.max_contracts_per_type]
        by_exp_strike = {
            (item["expiration_date"], round(float(item["strike_price"]), 4)): item
            for item in contracts
        }
        for (expiration, short_strike), short_contract in by_exp_strike.items():
            long_strike = round(short_strike + width_direction, 4)
            long_contract = by_exp_strike.get((expiration, long_strike))
            if not long_contract:
                continue

            short_ticker = short_contract["ticker"]
            long_ticker = long_contract["ticker"]
            if short_ticker not in contract_cache:
                contract_cache[short_ticker] = entry_bar_for_contract(
                    session, limiter, api_key, short_ticker, entry_date, args
                )
            if long_ticker not in contract_cache:
                contract_cache[long_ticker] = entry_bar_for_contract(
                    session, limiter, api_key, long_ticker, entry_date, args
                )
            short_bar = contract_cache[short_ticker]
            long_bar = contract_cache[long_ticker]
            if not short_bar or not long_bar:
                continue

            short_close = float(short_bar["c"])
            long_close = float(long_bar["c"])
            credit = round(short_close - long_close - rules.fill_haircut, 2)
            if credit < rules.min_credit:
                continue
            max_risk = round(rules.spread_width - credit, 2)
            if max_risk <= 0:
                continue

            exp_date = dt.date.fromisoformat(expiration)
            dte = (exp_date - entry_date).days
            iv = implied_vol(short_close, spot, short_strike, dte, rules.risk_free_rate, option_type)
            if iv is None:
                continue
            delta = bs_delta(spot, short_strike, dte, iv, rules.risk_free_rate, option_type)
            if not passes_delta(delta, option_type, rules):
                continue

            min_volume = int(min(short_bar.get("v", 0), long_bar.get("v", 0)))
            if min_volume < rules.min_entry_volume:
                continue

            candidates.append(
                {
                    "entry_date": entry_date.isoformat(),
                    "ticker": symbol,
                    "strategy": "put_credit_spread" if option_type == "put" else "call_credit_spread",
                    "option_type": option_type,
                    "underlying_price": round(spot, 2),
                    "expiration": expiration,
                    "dte": dte,
                    "short_strike": short_strike,
                    "long_strike": long_strike,
                    "short_contract": short_ticker,
                    "long_contract": long_ticker,
                    "short_delta": round(delta, 4),
                    "implied_volatility_estimate": round(iv, 4),
                    "entry_credit": credit,
                    "max_risk": max_risk,
                    "credit_to_risk": round(credit / max_risk, 4),
                    "entry_short_close": short_close,
                    "entry_long_close": long_close,
                    "entry_min_volume": min_volume,
                    "quote_filter_applied": False,
                    "open_interest_filter_applied": False,
                }
            )

    if not candidates:
        warnings.append(f"{symbol} {entry_date}: no candidates after filters")
    candidates.sort(key=lambda item: item["credit_to_risk"], reverse=True)
    return candidates[: args.max_candidates_per_symbol], warnings


def simulate_candidate(
    session: requests.Session,
    limiter: RateLimiter,
    api_key: str,
    candidate: dict[str, Any],
    rules: BacktestRules,
    args: argparse.Namespace,
) -> dict[str, Any]:
    entry_date = dt.date.fromisoformat(candidate["entry_date"])
    expiration = dt.date.fromisoformat(candidate["expiration"])
    planned_exit = max(entry_date, expiration - dt.timedelta(days=rules.exit_dte))
    end_date = min(expiration, planned_exit)

    short_bars = get_daily_aggs(session, limiter, api_key, candidate["short_contract"], entry_date, end_date, args)
    long_bars = get_daily_aggs(session, limiter, api_key, candidate["long_contract"], entry_date, end_date, args)
    long_by_date = {bar_date(bar): bar for bar in long_bars}

    credit = float(candidate["entry_credit"])
    target_debit = credit * (1.0 - rules.profit_target_pct)
    stop_debit = credit * rules.stop_loss_multiple
    exit_reason = "exit_dte"
    exit_date = end_date
    exit_debit = None

    for short_bar in short_bars:
        day = bar_date(short_bar)
        if day < entry_date or day not in long_by_date:
            continue
        long_bar = long_by_date[day]
        debit_close = max(0.0, float(short_bar["c"]) - float(long_bar["c"]) + rules.fill_haircut)
        if day == entry_date:
            continue
        if debit_close <= target_debit:
            exit_reason = "profit_target"
            exit_date = day
            exit_debit = debit_close
            break
        if debit_close >= stop_debit:
            exit_reason = "stop_loss"
            exit_date = day
            exit_debit = debit_close
            break
        exit_date = day
        exit_debit = debit_close

    if exit_debit is None:
        exit_debit = credit
        exit_reason = "no_exit_prices"

    pnl = round((credit - exit_debit) * 100, 2)
    return {
        **candidate,
        "exit_date": exit_date.isoformat(),
        "exit_reason": exit_reason,
        "exit_debit": round(exit_debit, 2),
        "pnl_dollars": pnl,
        "return_on_risk": round(pnl / (candidate["max_risk"] * 100), 4),
        "days_held": (exit_date - entry_date).days,
    }


def write_outputs(payload: dict[str, Any], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "polygon_backtest.json"
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    rows = payload["trades"]
    if rows:
        csv_path = output_dir / "polygon_backtest_trades.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)


def summarize(trades: list[dict[str, Any]]) -> dict[str, Any]:
    if not trades:
        return {"trade_count": 0}
    pnl = [float(t["pnl_dollars"]) for t in trades]
    wins = [x for x in pnl if x > 0]
    return {
        "trade_count": len(trades),
        "wins": len(wins),
        "losses": len([x for x in pnl if x < 0]),
        "win_rate": round(len(wins) / len(trades), 4),
        "total_pnl_dollars": round(sum(pnl), 2),
        "avg_pnl_dollars": round(sum(pnl) / len(pnl), 2),
        "best_trade_dollars": round(max(pnl), 2),
        "worst_trade_dollars": round(min(pnl), 2),
        "avg_return_on_risk": round(sum(float(t["return_on_risk"]) for t in trades) / len(trades), 4),
    }


def trade_matches_experiment(trade: dict[str, Any], experiment: dict[str, Any]) -> bool:
    option_type = experiment.get("option_type")
    if option_type and trade.get("option_type") != option_type:
        return False
    min_credit_to_risk = experiment.get("min_credit_to_risk")
    if min_credit_to_risk is not None and float(trade.get("credit_to_risk", 0)) < float(min_credit_to_risk):
        return False
    min_entry_volume = experiment.get("min_entry_volume")
    if min_entry_volume is not None and int(trade.get("entry_min_volume", 0)) < int(min_entry_volume):
        return False
    max_abs_delta = experiment.get("max_abs_delta")
    if max_abs_delta is not None and abs(float(trade.get("short_delta", 0))) > float(max_abs_delta):
        return False
    min_iv = experiment.get("min_iv")
    if min_iv is not None and float(trade.get("implied_volatility_estimate", 0)) < float(min_iv):
        return False
    max_iv = experiment.get("max_iv")
    if max_iv is not None and float(trade.get("implied_volatility_estimate", 0)) > float(max_iv):
        return False
    return True


def experiment_results(trades: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for experiment in DEFAULT_EXPERIMENTS:
        filtered = [trade for trade in trades if trade_matches_experiment(trade, experiment)]
        summary = summarize(filtered)
        rows.append(
            {
                "name": experiment["name"],
                "description": experiment["description"],
                "summary": summary,
            }
        )
    rows.sort(
        key=lambda row: (
            int(row["summary"].get("trade_count", 0) >= 30),
            float(row["summary"].get("win_rate", 0)),
            float(row["summary"].get("total_pnl_dollars", 0)),
        ),
        reverse=True,
    )
    return rows


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Backtest app-style credit spreads with Polygon option aggregates.")
    p.add_argument("--tickers", nargs="*", default=DEFAULT_TICKERS)
    p.add_argument("--entry-date", default="2026-02-02", help="Single historical entry date YYYY-MM-DD")
    p.add_argument("--entry-dates", nargs="*", help="Explicit historical entry dates YYYY-MM-DD")
    p.add_argument("--entry-start", help="Start date for generated entry dates YYYY-MM-DD")
    p.add_argument("--entry-end", help="End date for generated entry dates YYYY-MM-DD")
    p.add_argument("--entry-frequency-days", type=int, default=7)
    p.add_argument(
        "--entry-weekdays",
        nargs="*",
        type=int,
        default=[0, 1, 2, 3, 4],
        help="Allowed generated weekdays where Monday=0 and Friday=4.",
    )
    p.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "backtests")
    p.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("/Users/dax/Documents/polygon-data/options-cache/rest-json"),
        help="Local cache for Polygon JSON responses",
    )
    p.add_argument("--refresh-cache", action="store_true", help="Ignore cached Polygon responses")
    p.add_argument("--requests-per-minute", type=float, default=4.8)
    p.add_argument("--timeout", type=int, default=45)
    p.add_argument("--retry-max", type=int, default=6)
    p.add_argument("--max-candidates-per-symbol", type=int, default=3)
    p.add_argument("--max-contracts-per-type", type=int, default=80)
    p.add_argument("--max-trades", type=int, default=0, help="Stop after this many simulated trades; 0 means no cap.")
    p.add_argument("--wide-agg-start", help="Fetch and reuse aggregate bars from this date when requested ranges fit.")
    p.add_argument("--wide-agg-end", help="Fetch and reuse aggregate bars through this date when requested ranges fit.")
    p.add_argument("--min-dte", type=int, default=45)
    p.add_argument("--max-dte", type=int, default=60)
    p.add_argument("--spread-width", type=float, default=5.0)
    p.add_argument("--min-credit", type=float, default=0.60)
    p.add_argument("--min-short-delta", type=float, default=-0.30)
    p.add_argument("--max-short-delta", type=float, default=-0.15)
    p.add_argument("--min-short-call-delta", type=float, default=0.15)
    p.add_argument("--max-short-call-delta", type=float, default=0.30)
    p.add_argument("--risk-free-rate", type=float, default=0.045)
    p.add_argument("--min-entry-volume", type=int, default=1)
    p.add_argument("--fill-haircut", type=float, default=0.10)
    p.add_argument("--profit-target-pct", type=float, default=0.50)
    p.add_argument("--stop-loss-multiple", type=float, default=2.0)
    p.add_argument("--exit-dte", type=int, default=21)
    p.add_argument("--put-strike-floor", type=float, default=0.70)
    p.add_argument("--put-strike-ceiling", type=float, default=1.02)
    p.add_argument("--call-strike-floor", type=float, default=0.98)
    p.add_argument("--call-strike-ceiling", type=float, default=1.30)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    load_dotenv(project_root / "quant-polygon" / ".env")
    api_key = require_api_key()
    entry_dates = entry_dates_from_args(args)
    rules = rules_from_args(args)

    limiter = RateLimiter(args.requests_per_minute)
    warnings: list[str] = []
    trades: list[dict[str, Any]] = []

    with requests.Session() as session:
        for entry_date in entry_dates:
            if args.max_trades > 0 and len(trades) >= args.max_trades:
                break
            for symbol in [ticker.upper() for ticker in args.tickers]:
                if args.max_trades > 0 and len(trades) >= args.max_trades:
                    break
                print(f"Scanning {symbol} for {entry_date}...", flush=True)
                candidates, symbol_warnings = find_candidates_for_date(
                    session, limiter, api_key, symbol, entry_date, rules, args
                )
                warnings.extend(symbol_warnings)
                for candidate in candidates:
                    if args.max_trades > 0 and len(trades) >= args.max_trades:
                        break
                    print(
                        f"  Simulating {candidate['strategy']} "
                        f"{candidate['short_strike']:g}/{candidate['long_strike']:g} "
                        f"exp {candidate['expiration']}",
                        flush=True,
                    )
                    trades.append(simulate_candidate(session, limiter, api_key, candidate, rules, args))

    payload = {
        "run": {
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "entry_date": entry_dates[0].isoformat() if len(entry_dates) == 1 else None,
            "entry_dates": [date.isoformat() for date in entry_dates],
            "data_source": "Polygon option daily aggregate bars",
            "limitations": [
                "Historical bid/ask quotes were not available to this API key.",
                "Historical open interest was not available to this API key.",
                "Entry and exit fills use option close prices plus a configurable haircut.",
                "Experiment rows are in-sample filters over the generated trade set and should be validated out-of-sample.",
            ],
        },
        "tickers": [ticker.upper() for ticker in args.tickers],
        "rules": asdict(rules),
        "summary": summarize(trades),
        "experiments": experiment_results(trades),
        "warnings": warnings,
        "trades": trades,
    }
    write_outputs(payload, args.output_dir)
    print(json.dumps(payload["summary"], indent=2))
    print(f"Wrote outputs to {args.output_dir}")
    if warnings:
        print("Warnings:")
        for warning in warnings[:12]:
            print(f"- {warning}")
        if len(warnings) > 12:
            print(f"- ... {len(warnings) - 12} more")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Fatal error: {exc}", file=sys.stderr)
        sys.exit(1)
