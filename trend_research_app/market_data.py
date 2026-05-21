from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, Iterable

import pandas as pd
import yfinance as yf


BENCHMARK = "SPY"


class MarketDataError(RuntimeError):
    pass


def download_close_history(tickers: Iterable[str], start_date: date, end_date: date) -> pd.DataFrame:
    universe = sorted({ticker.upper() for ticker in tickers if ticker})
    if BENCHMARK not in universe:
        universe.append(BENCHMARK)

    padded_start = start_date - timedelta(days=30)
    padded_end = end_date + timedelta(days=200)
    frame = yf.download(
        tickers=" ".join(universe),
        start=padded_start.isoformat(),
        end=padded_end.isoformat(),
        auto_adjust=True,
        progress=False,
        group_by="ticker",
    )
    if frame is None or frame.empty:
        raise MarketDataError("Yahoo Finance returned no price data.")

    close_map: Dict[str, pd.Series] = {}
    if isinstance(frame.columns, pd.MultiIndex):
        for ticker in universe:
            if ticker not in frame.columns.get_level_values(0):
                continue
            ticker_frame = frame[ticker]
            if "Close" not in ticker_frame.columns:
                continue
            close_map[ticker] = ticker_frame["Close"].dropna()
    else:
        if "Close" not in frame.columns or len(universe) != 1:
            raise MarketDataError("Unexpected price frame shape from Yahoo Finance.")
        close_map[universe[0]] = frame["Close"].dropna()

    if not close_map:
        raise MarketDataError("No closing-price series were available after download.")

    close_frame = pd.DataFrame(close_map).sort_index()
    close_frame.index = pd.to_datetime(close_frame.index).normalize()
    return close_frame
