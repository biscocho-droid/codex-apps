from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Exposure:
    ticker: str
    role: str
    rationale: str


@dataclass(frozen=True)
class TrendDefinition:
    slug: str
    keyword: str
    category: str
    thesis: str
    benchmark_ticker: str
    exposures: List[Exposure]


@dataclass(frozen=True)
class TrendPoint:
    trend_slug: str
    keyword: str
    period_start: date
    value: float


@dataclass(frozen=True)
class TrendSignal:
    trend_slug: str
    keyword: str
    category: str
    signal_date: date
    level: float
    baseline: float
    zscore: float
    accel_ratio: float
    persistence: float
    score: float


@dataclass(frozen=True)
class ForwardWindowResult:
    trading_days: int
    stock_return: Optional[float]
    benchmark_return: Optional[float]
    excess_return: Optional[float]
    max_drawdown: Optional[float]
    benchmark_ticker: str


@dataclass(frozen=True)
class SignalBacktest:
    trend_slug: str
    keyword: str
    category: str
    signal_date: date
    benchmark_ticker: str
    ticker: str
    role: str
    rationale: str
    windows: Dict[int, ForwardWindowResult] = field(default_factory=dict)


@dataclass(frozen=True)
class AggregateWindowSummary:
    trading_days: int
    sample_size: int
    avg_stock_return: Optional[float]
    avg_benchmark_return: Optional[float]
    avg_excess_return: Optional[float]
    hit_rate: Optional[float]
    avg_max_drawdown: Optional[float]


@dataclass(frozen=True)
class AggregateSummary:
    strategy_name: str
    created_at: str
    windows: Dict[int, AggregateWindowSummary]
    category_windows: Dict[str, Dict[int, AggregateWindowSummary]]
    trend_windows: Dict[str, Dict[int, AggregateWindowSummary]]
    trend_count: int
    signal_count: int
    exposure_count: int
