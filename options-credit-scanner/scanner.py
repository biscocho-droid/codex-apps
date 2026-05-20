#!/usr/bin/env python3
"""
Live put credit spread scanner for the static dashboard.

The scanner uses yfinance option chains, estimates put delta with Black-Scholes
when Yahoo does not provide Greeks, applies the configured filters, and writes
data/latest.json for the GitHub Pages dashboard.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import yfinance as yf


CENTRAL = ZoneInfo("America/Chicago")
EASTERN = ZoneInfo("America/New_York")
DEFAULT_TICKERS = ["SPY", "QQQ", "IWM", "AAPL", "AMZN", "MSFT", "NVDA", "TSLA"]


@dataclass(frozen=True)
class ScanRules:
    min_dte: int = 45
    max_dte: int = 60
    spread_width: float = 5.0
    min_credit: float = 0.60
    min_short_delta: float = -0.30
    max_short_delta: float = -0.15
    min_open_interest: int = 50
    max_bid_ask_pct_of_mid: float = 0.35
    risk_free_rate: float = 0.045


def normal_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def put_delta(spot: float, strike: float, dte: int, iv: float, rate: float) -> float | None:
    if spot <= 0 or strike <= 0 or dte <= 0 or iv <= 0 or not np.isfinite(iv):
        return None
    time_years = dte / 365.0
    sigma_root_t = iv * math.sqrt(time_years)
    if sigma_root_t <= 0:
        return None
    d1 = (math.log(spot / strike) + (rate + 0.5 * iv * iv) * time_years) / sigma_root_t
    return normal_cdf(d1) - 1.0


def quote_mid(row: pd.Series) -> float | None:
    bid = safe_float(row.get("bid"))
    ask = safe_float(row.get("ask"))
    last = safe_float(row.get("lastPrice"))
    if bid is not None and ask is not None and bid > 0 and ask > 0 and ask >= bid:
        return round((bid + ask) / 2.0, 4)
    if last is not None and last > 0:
        return round(last, 4)
    return None


def safe_float(value: Any) -> float | None:
    try:
        if value is None or pd.isna(value):
            return None
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def safe_int(value: Any) -> int:
    number = safe_float(value)
    return int(number) if number is not None else 0


def get_spot_price(ticker: yf.Ticker) -> float | None:
    try:
        fast_price = ticker.fast_info.get("last_price")
        if fast_price:
            return float(fast_price)
    except Exception:
        pass

    history = ticker.history(period="5d", interval="1d", auto_adjust=False)
    if history.empty:
        return None
    return float(history["Close"].dropna().iloc[-1])


def get_earnings_date(ticker: yf.Ticker) -> date | None:
    # yfinance earnings availability varies by symbol and Yahoo response shape.
    for limit in (8, 12):
        try:
            earnings = ticker.get_earnings_dates(limit=limit)
        except Exception:
            continue
        if earnings is None or earnings.empty:
            continue
        index = earnings.index
        if len(index) == 0:
            continue
        next_dates = [pd.Timestamp(item).date() for item in index if pd.notna(item)]
        if next_dates:
            return min(next_dates, key=lambda item: abs((item - date.today()).days))
    return None


def earnings_is_blocked(earnings_date: date | None, today: date) -> bool:
    if earnings_date is None:
        return False
    delta = (earnings_date - today).days
    return -3 <= delta <= 7


def bid_ask_quality(row: pd.Series, mid: float | None, rules: ScanRules) -> tuple[str, bool, float | None]:
    bid = safe_float(row.get("bid"))
    ask = safe_float(row.get("ask"))
    if bid is None or ask is None or bid <= 0 or ask <= 0 or ask < bid or mid is None or mid <= 0:
        return "unknown", True, None
    width_pct = (ask - bid) / mid
    if width_pct <= 0.12:
        return "tight", True, width_pct
    if width_pct <= rules.max_bid_ask_pct_of_mid:
        return "good", True, width_pct
    return "wide", False, width_pct


def liquidity_quality(short_row: pd.Series, long_row: pd.Series, rules: ScanRules) -> tuple[str, bool, dict[str, int]]:
    short_oi = safe_int(short_row.get("openInterest"))
    long_oi = safe_int(long_row.get("openInterest"))
    short_vol = safe_int(short_row.get("volume"))
    long_vol = safe_int(long_row.get("volume"))
    min_oi = min(short_oi, long_oi)
    min_vol = min(short_vol, long_vol)
    detail = {
        "short_open_interest": short_oi,
        "long_open_interest": long_oi,
        "short_volume": short_vol,
        "long_volume": long_vol,
        "min_open_interest": min_oi,
        "min_volume": min_vol,
    }

    passes = min_oi >= rules.min_open_interest
    if min_oi >= 500 and min_vol >= 50:
        return "strong", passes, detail
    if min_oi >= rules.min_open_interest:
        return "good", passes, detail
    return "thin", False, detail


def contract_snapshot(row: pd.Series, mid: float | None, quality: str, width_pct: float | None) -> dict[str, Any]:
    return {
        "contract_symbol": str(row.get("contractSymbol", "")),
        "strike": safe_float(row.get("strike")),
        "bid": safe_float(row.get("bid")),
        "ask": safe_float(row.get("ask")),
        "mid": mid,
        "last": safe_float(row.get("lastPrice")),
        "volume": safe_int(row.get("volume")),
        "open_interest": safe_int(row.get("openInterest")),
        "implied_volatility": safe_float(row.get("impliedVolatility")),
        "bid_ask_quality": quality,
        "bid_ask_width_pct": round(width_pct, 4) if width_pct is not None else None,
    }


def market_status(now_ct: datetime) -> str:
    if now_ct.weekday() >= 5:
        return "closed"
    open_time = now_ct.replace(hour=8, minute=30, second=0, microsecond=0)
    close_time = now_ct.replace(hour=15, minute=0, second=0, microsecond=0)
    if open_time <= now_ct <= close_time:
        return "open"
    return "closed"


def spread_status(delta: float | None, credit: float | None, rules: ScanRules) -> tuple[str, bool]:
    if delta is None:
        return "No delta", False
    if delta < rules.min_short_delta:
        return "Too aggressive", False
    if delta > rules.max_short_delta:
        return "Too low delta", False
    if credit is None or credit < rules.min_credit:
        return "Too little credit", False
    return "Valid", True


def build_spread_candidate(
    symbol: str,
    spot: float,
    expiration: str,
    dte: int,
    short_strike: float,
    long_strike: float,
    short_row: pd.Series,
    long_row: pd.Series,
    rules: ScanRules,
    earnings_date: date | None,
) -> tuple[dict[str, Any] | None, str]:
    iv = safe_float(short_row.get("impliedVolatility"))
    delta = put_delta(spot, short_strike, dte, iv or 0.0, rules.risk_free_rate)
    short_mid = quote_mid(short_row)
    long_mid = quote_mid(long_row)
    credit = round(short_mid - long_mid, 2) if short_mid is not None and long_mid is not None else None
    status, rules_pass = spread_status(delta, credit, rules)

    if credit is None:
        return None, status

    max_risk = round(rules.spread_width - credit, 2)
    if max_risk <= 0:
        return None, status

    short_ba, short_ba_pass, short_ba_width = bid_ask_quality(short_row, short_mid, rules)
    long_ba, long_ba_pass, long_ba_width = bid_ask_quality(long_row, long_mid, rules)
    liquidity, liquidity_pass, liquidity_detail = liquidity_quality(short_row, long_row, rules)
    if not (short_ba_pass and long_ba_pass and liquidity_pass):
        return None, "Liquidity/quote filter"

    combined_bid_ask = "tight" if short_ba == "tight" and long_ba == "tight" else "good"
    min_acceptable_credit = max(rules.min_credit, credit - 0.10)
    candidate = {
        "id": f"{symbol}-{expiration}-{short_strike:g}-{long_strike:g}-P",
        "ticker": symbol,
        "underlying_price": round(spot, 2),
        "expiration": expiration,
        "dte": dte,
        "short_put": short_strike,
        "long_put": long_strike,
        "short_delta": round(delta, 4) if delta is not None else None,
        "delta_source": "black_scholes_estimate",
        "credit": credit,
        "max_risk": max_risk,
        "credit_to_risk": round(credit / max_risk, 4),
        "breakeven": round(short_strike - credit, 2),
        "max_profit_dollars": round(credit * 100, 2),
        "max_loss_dollars": round(max_risk * 100, 2),
        "suggested_limit_credit": credit,
        "minimum_acceptable_credit": round(min_acceptable_credit, 2),
        "short_mid": short_mid,
        "long_mid": long_mid,
        "earnings_date": earnings_date.isoformat() if earnings_date else None,
        "rules_pass": rules_pass,
        "status": status,
        "legs": {
            "short": contract_snapshot(short_row, short_mid, short_ba, short_ba_width),
            "long": contract_snapshot(long_row, long_mid, long_ba, long_ba_width),
        },
        "liquidity": liquidity_detail,
        "quality": {
            "bid_ask": combined_bid_ask,
            "open_interest": liquidity,
            "volume": liquidity,
            "earnings": "ETF" if symbol in {"SPY", "QQQ", "IWM"} else ("clear" if earnings_date else "unknown"),
        },
    }
    return candidate, status


def ladder_row(
    spread: dict[str, Any],
    selected_short: float,
    selected_long: float,
    rules: ScanRules,
) -> dict[str, Any]:
    selected = spread["short_put"] == selected_short and spread["long_put"] == selected_long
    status = "Selected" if selected else spread.get("status", "Valid")
    return {
        "short_put": spread["short_put"],
        "long_put": spread["long_put"],
        "short_delta": spread["short_delta"],
        "credit": spread["credit"],
        "max_risk": spread["max_risk"],
        "credit_to_risk": spread["credit_to_risk"],
        "status": status,
        "selected": selected,
        "rules_pass": spread.get("rules_pass", False),
    }


def attach_nearby_ladders(candidates: list[dict[str, Any]], all_spreads: list[dict[str, Any]], rules: ScanRules) -> None:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for spread in all_spreads:
        grouped.setdefault((spread["ticker"], spread["expiration"]), []).append(spread)

    for spreads in grouped.values():
        spreads.sort(key=lambda item: item["short_put"], reverse=True)

    for candidate in candidates:
        peers = grouped.get((candidate["ticker"], candidate["expiration"]), [])
        selected_index = next((i for i, item in enumerate(peers) if item["id"] == candidate["id"]), None)
        if selected_index is None:
            candidate["nearby_spreads"] = []
            continue
        start = max(0, selected_index - 3)
        end = min(len(peers), selected_index + 4)
        candidate["nearby_spreads"] = [
            ladder_row(item, candidate["short_put"], candidate["long_put"], rules)
            for item in peers[start:end]
        ]


def scan_ticker(symbol: str, rules: ScanRules, today: date) -> tuple[list[dict[str, Any]], list[str]]:
    warnings: list[str] = []
    candidates: list[dict[str, Any]] = []
    all_spreads: list[dict[str, Any]] = []
    ticker = yf.Ticker(symbol)

    earnings_date = get_earnings_date(ticker)
    if earnings_is_blocked(earnings_date, today):
        warnings.append(f"{symbol}: skipped because earnings is {earnings_date}")
        return candidates, warnings

    spot = get_spot_price(ticker)
    if spot is None:
        warnings.append(f"{symbol}: could not determine current underlying price")
        return candidates, warnings

    try:
        expirations = ticker.options
    except Exception as exc:
        warnings.append(f"{symbol}: could not fetch expiration list ({exc})")
        return candidates, warnings

    valid_expirations = []
    for expiration in expirations:
        exp_date = datetime.strptime(expiration, "%Y-%m-%d").date()
        dte = (exp_date - today).days
        if rules.min_dte <= dte <= rules.max_dte:
            valid_expirations.append((expiration, exp_date, dte))

    if not valid_expirations:
        warnings.append(f"{symbol}: no expirations between {rules.min_dte} and {rules.max_dte} DTE")
        return candidates, warnings

    for expiration, exp_date, dte in valid_expirations:
        try:
            puts = ticker.option_chain(expiration).puts.copy()
        except Exception as exc:
            warnings.append(f"{symbol} {expiration}: could not fetch puts ({exc})")
            continue

        if puts.empty or "strike" not in puts.columns:
            warnings.append(f"{symbol} {expiration}: no puts returned")
            continue

        puts["strike_key"] = puts["strike"].round(4)
        put_by_strike = {float(row["strike_key"]): row for _, row in puts.iterrows()}

        for short_strike, short_row in put_by_strike.items():
            long_strike = round(short_strike - rules.spread_width, 4)
            long_row = put_by_strike.get(long_strike)
            if long_row is None:
                continue

            spread, _ = build_spread_candidate(
                symbol,
                spot,
                expiration,
                dte,
                short_strike,
                long_strike,
                short_row,
                long_row,
                rules,
                earnings_date,
            )
            if spread is None:
                continue
            all_spreads.append(spread)
            if spread["rules_pass"]:
                candidates.append(spread)

    attach_nearby_ladders(candidates, all_spreads, rules)
    return candidates, warnings


def build_payload(tickers: list[str], rules: ScanRules) -> dict[str, Any]:
    now_ct = datetime.now(CENTRAL)
    today_et = datetime.now(EASTERN).date()
    all_candidates: list[dict[str, Any]] = []
    warnings: list[str] = []
    skipped_for_earnings = 0

    for symbol in tickers:
        symbol_candidates, symbol_warnings = scan_ticker(symbol, rules, today_et)
        if any("skipped because earnings" in warning for warning in symbol_warnings):
            skipped_for_earnings += 1
        all_candidates.extend(symbol_candidates)
        warnings.extend(symbol_warnings)

    all_candidates.sort(key=lambda item: item["credit_to_risk"], reverse=True)

    return {
        "scan": {
            "mode": "live yfinance",
            "generated_at": now_ct.isoformat(timespec="seconds"),
            "local_time": now_ct.strftime("%-I:%M %p"),
            "timezone": "America/Chicago",
            "market_status": market_status(now_ct),
            "data_source": "Yahoo Finance via yfinance",
        },
        "rules": asdict(rules),
        "summary": {
            "ticker_count": len(tickers),
            "candidate_count": len(all_candidates),
            "skipped_for_earnings": skipped_for_earnings,
            "warning_count": len(warnings),
        },
        "tickers": tickers,
        "candidates": all_candidates,
        "warnings": warnings,
    }


def write_json(payload: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix(".tmp")
    temp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temp.replace(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate live credit spread scanner JSON.")
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "data" / "latest.json")
    parser.add_argument("--tickers", nargs="*", default=DEFAULT_TICKERS)
    parser.add_argument("--min-credit", type=float, default=0.60)
    parser.add_argument("--min-dte", type=int, default=45)
    parser.add_argument("--max-dte", type=int, default=60)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rules = ScanRules(min_credit=args.min_credit, min_dte=args.min_dte, max_dte=args.max_dte)
    payload = build_payload([ticker.upper() for ticker in args.tickers], rules)
    write_json(payload, args.output)
    print(f"Wrote {len(payload['candidates'])} candidates to {args.output}")
    if payload["warnings"]:
        print("Warnings:")
        for warning in payload["warnings"][:12]:
            print(f"- {warning}")
        if len(payload["warnings"]) > 12:
            print(f"- ... {len(payload['warnings']) - 12} more")


if __name__ == "__main__":
    main()
