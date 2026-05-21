from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .db import RadarDatabase
from .market_data import YahooChartClient


@dataclass(frozen=True)
class BacktestRow:
    ticker: str
    first_signal_date: str
    first_signal_score: int
    first_signal_classification: str
    source: str
    title: str
    current_momentum: str


def backtest_from_evidence(
    db: RadarDatabase,
    client: YahooChartClient,
    tickers: list[str],
) -> list[BacktestRow]:
    evidence = db.recent_evidence(limit=10_000)
    rows: list[BacktestRow] = []
    for ticker in sorted({value.upper() for value in tickers}):
        ticker_rows = [row for row in evidence if row.ticker == ticker]
        if not ticker_rows:
            continue
        first = sorted(ticker_rows, key=lambda row: row.published_at)[0]
        momentum = client.momentum(ticker)
        rows.append(
            BacktestRow(
                ticker=ticker,
                first_signal_date=first.published_at.strftime("%Y-%m-%d"),
                first_signal_score=first.score,
                first_signal_classification=first.classification,
                source=first.source_name,
                title=first.title,
                current_momentum=_format_momentum(momentum.return_30d, momentum.return_90d, momentum.return_180d),
            )
        )
    return rows


def format_backtest(rows: list[BacktestRow]) -> str:
    if not rows:
        return "No stored evidence exists yet for those tickers. Run the radar first, or widen the config."
    lines = ["Backtest-style first-signal review from stored evidence:"]
    for row in rows:
        lines.append(
            f"- {row.ticker}: first signal {row.first_signal_date}, "
            f"score={row.first_signal_score}, class={row.first_signal_classification}, "
            f"source={row.source}, momentum={row.current_momentum}, title={row.title}"
        )
    return "\n".join(lines)


def _format_momentum(r30: float | None, r90: float | None, r180: float | None) -> str:
    def fmt(value: float | None) -> str:
        return "n/a" if value is None else f"{value:.1f}%"

    return f"30d {fmt(r30)}, 90d {fmt(r90)}, 180d {fmt(r180)}"
