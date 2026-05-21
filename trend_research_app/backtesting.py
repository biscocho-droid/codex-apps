from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Dict, Iterable, List, Sequence

import pandas as pd

from .market_data import download_close_history
from .models import (
    AggregateSummary,
    AggregateWindowSummary,
    ForwardWindowResult,
    SignalBacktest,
    TrendDefinition,
    TrendSignal,
)


DEFAULT_WINDOWS = (5, 20, 60, 120, 252, 504, 756)
DEFAULT_TOP_N = 3
MAX_ENTRY_LAG_DAYS = 10


def run_backtests(
    definitions: Sequence[TrendDefinition],
    signals: Sequence[TrendSignal],
    windows: Sequence[int] = DEFAULT_WINDOWS,
    close_frame: pd.DataFrame | None = None,
) -> List[SignalBacktest]:
    definition_map = {definition.slug: definition for definition in definitions}
    tickers = []
    signal_dates = []
    for signal in signals:
        definition = definition_map.get(signal.trend_slug)
        if not definition:
            continue
        signal_dates.append(signal.signal_date)
        tickers.append(definition.benchmark_ticker)
        tickers.extend([exposure.ticker for exposure in definition.exposures])

    if not signal_dates or not tickers:
        return []

    if close_frame is None:
        close_frame = download_close_history(
            tickers=tickers,
            start_date=min(signal_dates),
            end_date=max(signal_dates),
        )

    rows: List[SignalBacktest] = []
    for signal in signals:
        definition = definition_map.get(signal.trend_slug)
        if not definition:
            continue
        for exposure in definition.exposures:
            window_map: Dict[int, ForwardWindowResult] = {}
            for trading_days in windows:
                window_map[trading_days] = _window_result(
                    close_frame=close_frame,
                    ticker=exposure.ticker,
                    benchmark_ticker=definition.benchmark_ticker,
                    signal_date=signal.signal_date,
                    trading_days=trading_days,
                )
            rows.append(
                SignalBacktest(
                    trend_slug=signal.trend_slug,
                    keyword=signal.keyword,
                    category=signal.category,
                    signal_date=signal.signal_date,
                    benchmark_ticker=definition.benchmark_ticker,
                    ticker=exposure.ticker,
                    role=exposure.role,
                    rationale=exposure.rationale,
                    windows=window_map,
                )
            )
    return rows


def summarize_backtests(rows: Iterable[SignalBacktest], windows: Sequence[int] = DEFAULT_WINDOWS) -> AggregateSummary:
    rows = list(rows)
    summary_windows = _summarize_group(rows, windows)
    category_windows = {
        category: _summarize_group([row for row in rows if row.category == category], windows)
        for category in sorted({row.category for row in rows})
    }
    trend_windows = {
        trend_slug: _summarize_group([row for row in rows if row.trend_slug == trend_slug], windows)
        for trend_slug in sorted({row.trend_slug for row in rows})
    }

    return AggregateSummary(
        strategy_name="trend_signal_event_backtest",
        created_at=pd.Timestamp.utcnow().isoformat(),
        windows=summary_windows,
        category_windows=category_windows,
        trend_windows=trend_windows,
        trend_count=len({row.trend_slug for row in rows}),
        signal_count=len({(row.trend_slug, row.signal_date) for row in rows}),
        exposure_count=len(rows),
    )


def summarize_top_basket_backtests(
    rows: Iterable[SignalBacktest],
    windows: Sequence[int] = DEFAULT_WINDOWS,
    top_n: int = DEFAULT_TOP_N,
) -> dict:
    rows = list(rows)
    grouped: Dict[tuple[str, str], List[SignalBacktest]] = defaultdict(list)
    for row in rows:
        grouped[(row.trend_slug, row.signal_date.isoformat())].append(row)

    baskets = []
    for (trend_slug, signal_date), group_rows in grouped.items():
        candidates = [row for row in group_rows if row.role == "beneficiary"]
        selected = candidates[:top_n]
        if not selected:
            continue
        windows_out = {}
        for trading_days in windows:
            stock_returns = []
            benchmark_returns = []
            excess_returns = []
            drawdowns = []
            for row in selected:
                result = row.windows.get(trading_days)
                if not result or result.excess_return is None:
                    continue
                if result.stock_return is not None:
                    stock_returns.append(result.stock_return)
                if result.benchmark_return is not None:
                    benchmark_returns.append(result.benchmark_return)
                excess_returns.append(result.excess_return)
                if result.max_drawdown is not None:
                    drawdowns.append(result.max_drawdown)
            windows_out[str(trading_days)] = {
                "trading_days": trading_days,
                "selected_count": len(excess_returns),
                "avg_stock_return": _average(stock_returns),
                "avg_benchmark_return": _average(benchmark_returns),
                "avg_excess_return": _average(excess_returns),
                "hit": None if not excess_returns else _average([1.0 if value > 0 else 0.0 for value in excess_returns]),
                "avg_max_drawdown": _average(drawdowns),
            }

        first = selected[0]
        baskets.append(
            {
                "trend_slug": trend_slug,
                "keyword": first.keyword,
                "category": first.category,
                "signal_date": signal_date,
                "benchmark_ticker": first.benchmark_ticker,
                "selected_tickers": [row.ticker for row in selected],
                "top_n": top_n,
                "windows": windows_out,
            }
        )

    return {
        "strategy_name": f"top_{top_n}_beneficiary_basket",
        "created_at": pd.Timestamp.utcnow().isoformat(),
        "top_n": top_n,
        "basket_count": len(baskets),
        "windows": _summarize_baskets(baskets, windows),
        "category_windows": {
            category: _summarize_baskets([basket for basket in baskets if basket["category"] == category], windows)
            for category in sorted({basket["category"] for basket in baskets})
        },
        "trend_windows": {
            trend_slug: _summarize_baskets([basket for basket in baskets if basket["trend_slug"] == trend_slug], windows)
            for trend_slug in sorted({basket["trend_slug"] for basket in baskets})
        },
        "baskets": baskets,
    }


def _window_result(
    close_frame: pd.DataFrame,
    ticker: str,
    benchmark_ticker: str,
    signal_date: date,
    trading_days: int,
) -> ForwardWindowResult:
    ticker_prices = close_frame.get(ticker)
    benchmark_prices = close_frame.get(benchmark_ticker)
    if ticker_prices is None or benchmark_prices is None:
        return ForwardWindowResult(trading_days, None, None, None, None, benchmark_ticker)

    ticker_path = ticker_prices.dropna()
    benchmark_path = benchmark_prices.dropna()
    ticker_loc = _entry_index(ticker_path, signal_date, MAX_ENTRY_LAG_DAYS)
    benchmark_loc = _entry_index(benchmark_path, signal_date, MAX_ENTRY_LAG_DAYS)
    if ticker_loc is None or benchmark_loc is None:
        return ForwardWindowResult(trading_days, None, None, None, None, benchmark_ticker)

    stock_return, max_drawdown = _forward_return_and_drawdown(ticker_path, ticker_loc, trading_days)
    benchmark_return, _ = _forward_return_and_drawdown(benchmark_path, benchmark_loc, trading_days)
    excess_return = None
    if stock_return is not None and benchmark_return is not None:
        excess_return = stock_return - benchmark_return
    return ForwardWindowResult(
        trading_days=trading_days,
        stock_return=stock_return,
        benchmark_return=benchmark_return,
        excess_return=excess_return,
        max_drawdown=max_drawdown,
        benchmark_ticker=benchmark_ticker,
    )


def _summarize_group(rows: Iterable[SignalBacktest], windows: Sequence[int]) -> Dict[int, AggregateWindowSummary]:
    grouped: Dict[int, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        for trading_days in windows:
            result = row.windows.get(trading_days)
            if not result:
                continue
            if result.stock_return is not None:
                grouped[trading_days]["stock_return"].append(result.stock_return)
            if result.benchmark_return is not None:
                grouped[trading_days]["benchmark_return"].append(result.benchmark_return)
            if result.excess_return is not None:
                grouped[trading_days]["excess_return"].append(result.excess_return)
                grouped[trading_days]["hit"].append(1.0 if result.excess_return > 0 else 0.0)
            if result.max_drawdown is not None:
                grouped[trading_days]["max_drawdown"].append(result.max_drawdown)

    summary_windows = {}
    for trading_days in windows:
        bucket = grouped.get(trading_days, {})
        sample_size = len(bucket.get("excess_return", []))
        summary_windows[trading_days] = AggregateWindowSummary(
            trading_days=trading_days,
            sample_size=sample_size,
            avg_stock_return=_average(bucket.get("stock_return", [])),
            avg_benchmark_return=_average(bucket.get("benchmark_return", [])),
            avg_excess_return=_average(bucket.get("excess_return", [])),
            hit_rate=_average(bucket.get("hit", [])),
            avg_max_drawdown=_average(bucket.get("max_drawdown", [])),
        )
    return summary_windows


def _summarize_baskets(baskets: list[dict], windows: Sequence[int]) -> dict:
    output = {}
    for trading_days in windows:
        key = str(trading_days)
        stock_returns = []
        benchmark_returns = []
        excess_returns = []
        hit_rates = []
        drawdowns = []
        for basket in baskets:
            result = basket["windows"].get(key)
            if not result or result["avg_excess_return"] is None:
                continue
            if result["avg_stock_return"] is not None:
                stock_returns.append(result["avg_stock_return"])
            if result["avg_benchmark_return"] is not None:
                benchmark_returns.append(result["avg_benchmark_return"])
            excess_returns.append(result["avg_excess_return"])
            if result["hit"] is not None:
                hit_rates.append(result["hit"])
            if result["avg_max_drawdown"] is not None:
                drawdowns.append(result["avg_max_drawdown"])
        output[key] = {
            "trading_days": trading_days,
            "sample_size": len(excess_returns),
            "avg_stock_return": _average(stock_returns),
            "avg_benchmark_return": _average(benchmark_returns),
            "avg_excess_return": _average(excess_returns),
            "hit_rate": _average(hit_rates),
            "avg_max_drawdown": _average(drawdowns),
        }
    return output


def _entry_index(series: pd.Series, signal_date: date, max_entry_lag_days: int):
    eligible = series.index[series.index >= pd.Timestamp(signal_date)]
    if len(eligible) == 0:
        return None
    first_eligible = eligible[0]
    if (first_eligible - pd.Timestamp(signal_date)).days > max_entry_lag_days:
        return None
    return series.index.get_loc(first_eligible)


def _forward_return_and_drawdown(series: pd.Series, start_loc: int, trading_days: int):
    end_loc = start_loc + trading_days
    if end_loc >= len(series):
        return None, None
    start_price = float(series.iloc[start_loc])
    end_price = float(series.iloc[end_loc])
    if start_price <= 0:
        return None, None
    path = series.iloc[start_loc : end_loc + 1]
    running_max = path.cummax()
    drawdown = (path / running_max) - 1.0
    return (end_price / start_price) - 1.0, float(drawdown.min())


def _average(values: List[float]):
    if not values:
        return None
    return float(sum(values) / len(values))
