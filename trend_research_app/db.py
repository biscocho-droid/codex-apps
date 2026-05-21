from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterable, List

from .models import SignalBacktest, TrendPoint, TrendSignal


SCHEMA = """
CREATE TABLE IF NOT EXISTS trend_series (
    trend_slug TEXT NOT NULL,
    keyword TEXT NOT NULL,
    period_start TEXT NOT NULL,
    value REAL NOT NULL,
    PRIMARY KEY (trend_slug, period_start)
);

CREATE TABLE IF NOT EXISTS trend_signals (
    trend_slug TEXT NOT NULL,
    keyword TEXT NOT NULL,
    category TEXT NOT NULL,
    signal_date TEXT NOT NULL,
    level REAL NOT NULL,
    baseline REAL NOT NULL,
    zscore REAL NOT NULL,
    accel_ratio REAL NOT NULL,
    persistence REAL NOT NULL,
    score REAL NOT NULL,
    PRIMARY KEY (trend_slug, signal_date)
);

CREATE TABLE IF NOT EXISTS backtest_results (
    trend_slug TEXT NOT NULL,
    keyword TEXT NOT NULL,
    category TEXT NOT NULL,
    signal_date TEXT NOT NULL,
    ticker TEXT NOT NULL,
    role TEXT NOT NULL,
    rationale TEXT NOT NULL,
    windows_json TEXT NOT NULL,
    PRIMARY KEY (trend_slug, signal_date, ticker)
);
"""


class TrendResearchDatabase:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    def replace_trend_points(self, trend_slug: str, points: Iterable[TrendPoint]) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM trend_series WHERE trend_slug = ?", (trend_slug,))
            connection.executemany(
                """
                INSERT INTO trend_series (trend_slug, keyword, period_start, value)
                VALUES (?, ?, ?, ?)
                """,
                [
                    (point.trend_slug, point.keyword, point.period_start.isoformat(), float(point.value))
                    for point in points
                ],
            )

    def list_trend_points(self, trend_slug: str) -> List[TrendPoint]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT trend_slug, keyword, period_start, value
                FROM trend_series
                WHERE trend_slug = ?
                ORDER BY period_start
                """,
                (trend_slug,),
            ).fetchall()
        return [
            TrendPoint(
                trend_slug=row["trend_slug"],
                keyword=row["keyword"],
                period_start=_parse_date(row["period_start"]),
                value=float(row["value"]),
            )
            for row in rows
        ]

    def replace_signals(self, signals: Iterable[TrendSignal]) -> None:
        with self.connect() as connection:
            signal_list = list(signals)
            connection.execute("DELETE FROM trend_signals")
            connection.executemany(
                """
                INSERT INTO trend_signals (
                    trend_slug, keyword, category, signal_date, level, baseline,
                    zscore, accel_ratio, persistence, score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        signal.trend_slug,
                        signal.keyword,
                        signal.category,
                        signal.signal_date.isoformat(),
                        float(signal.level),
                        float(signal.baseline),
                        float(signal.zscore),
                        float(signal.accel_ratio),
                        float(signal.persistence),
                        float(signal.score),
                    )
                    for signal in signal_list
                ],
            )

    def list_signals(self) -> List[TrendSignal]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM trend_signals
                ORDER BY signal_date DESC, score DESC
                """
            ).fetchall()
        return [
            TrendSignal(
                trend_slug=row["trend_slug"],
                keyword=row["keyword"],
                category=row["category"],
                signal_date=_parse_date(row["signal_date"]),
                level=float(row["level"]),
                baseline=float(row["baseline"]),
                zscore=float(row["zscore"]),
                accel_ratio=float(row["accel_ratio"]),
                persistence=float(row["persistence"]),
                score=float(row["score"]),
            )
            for row in rows
        ]

    def replace_backtests(self, rows: Iterable[SignalBacktest]) -> None:
        with self.connect() as connection:
            row_list = list(rows)
            connection.execute("DELETE FROM backtest_results")
            connection.executemany(
                """
                INSERT INTO backtest_results (
                    trend_slug, keyword, category, signal_date, ticker, role, rationale, windows_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        row.trend_slug,
                        row.keyword,
                        row.category,
                        row.signal_date.isoformat(),
                        row.ticker,
                        row.role,
                        row.rationale,
                        json.dumps(
                            {
                                str(days): {
                                    "trading_days": value.trading_days,
                                    "stock_return": value.stock_return,
                                    "benchmark_return": value.benchmark_return,
                                    "excess_return": value.excess_return,
                                    "max_drawdown": value.max_drawdown,
                                    "benchmark_ticker": value.benchmark_ticker,
                                }
                                for days, value in row.windows.items()
                            }
                        ),
                    )
                    for row in row_list
                ],
            )


def _parse_date(value: str):
    from datetime import date

    return date.fromisoformat(value)
