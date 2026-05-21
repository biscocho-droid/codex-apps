from __future__ import annotations

from dataclasses import dataclass
from itertools import product
from typing import Iterable, Sequence

from .backtesting import run_backtests, summarize_top_basket_backtests
from .market_data import download_close_history
from .models import TrendDefinition, TrendPoint
from .signals import detect_signals


BAD_FAMILY_EXCLUSIONS = {
    "uber-eats",
    "klarna",
}

FOCUSED_FAMILY_EXCLUSIONS = {
    "uber-eats",
    "klarna",
    "airbnb",
    "temu",
    "cruise",
}


@dataclass(frozen=True)
class ExperimentConfig:
    name: str
    min_level: float
    min_accel_ratio: float
    min_zscore: float
    min_persistence: float
    baseline_floor: float
    min_score: float
    min_peak_ratio: float
    recent_window: int
    baseline_window: int
    prior_peak_window: int
    cooldown_periods: int
    excluded_slugs: frozenset[str]


@dataclass(frozen=True)
class ExperimentResult:
    config: ExperimentConfig
    signal_count: int
    basket_count: int
    score: float
    basket_summary: dict


def default_experiment_configs() -> list[ExperimentConfig]:
    threshold_grid = product(
        [18.0],
        [1.8, 2.0],
        [1.25, 1.5],
        [0.5, 0.67],
        [5.0],
        [45.0, 50.0],
        [0.0, 1.05],
        [3, 4, 6],
        [9, 12, 18],
        [18, 24],
        [0, 6, 12],
    )
    universe_variants = [
        ("current", frozenset()),
    ]
    configs: list[ExperimentConfig] = []
    for (
        min_level,
        min_accel_ratio,
        min_zscore,
        min_persistence,
        baseline_floor,
        min_score,
        min_peak_ratio,
        recent_window,
        baseline_window,
        prior_peak_window,
        cooldown_periods,
    ) in threshold_grid:
        for universe_name, excluded in universe_variants:
            name = (
                f"{universe_name}"
                f"_lvl{int(min_level)}"
                f"_acc{str(min_accel_ratio).replace('.', '')}"
                f"_z{str(min_zscore).replace('.', '')}"
                f"_p{str(min_persistence).replace('.', '')}"
                f"_b{str(baseline_floor).replace('.', '')}"
                f"_s{int(min_score)}"
                f"_pk{str(min_peak_ratio).replace('.', '')}"
                f"_rw{recent_window}"
                f"_bw{baseline_window}"
                f"_pp{prior_peak_window}"
                f"_cd{cooldown_periods}"
            )
            configs.append(
                ExperimentConfig(
                    name=name,
                    min_level=min_level,
                    min_accel_ratio=min_accel_ratio,
                    min_zscore=min_zscore,
                    min_persistence=min_persistence,
                    baseline_floor=baseline_floor,
                    min_score=min_score,
                    min_peak_ratio=min_peak_ratio,
                    recent_window=recent_window,
                    baseline_window=baseline_window,
                    prior_peak_window=prior_peak_window,
                    cooldown_periods=cooldown_periods,
                    excluded_slugs=excluded,
                )
            )
    return configs


def run_experiments(
    definitions: Sequence[TrendDefinition],
    series_map: dict[str, list[TrendPoint]],
    configs: Iterable[ExperimentConfig],
) -> list[ExperimentResult]:
    close_frame = _download_shared_close_frame(definitions, series_map)
    results: list[ExperimentResult] = []
    for config in configs:
        active_definitions = [definition for definition in definitions if definition.slug not in config.excluded_slugs]
        signals = []
        for definition in active_definitions:
            points = series_map.get(definition.slug, [])
            signals.extend(
                detect_signals(
                    definition,
                    points,
                    min_level=config.min_level,
                    min_accel_ratio=config.min_accel_ratio,
                    min_zscore=config.min_zscore,
                    min_persistence=config.min_persistence,
                    baseline_floor=config.baseline_floor,
                    min_score=config.min_score,
                    min_peak_ratio=config.min_peak_ratio,
                    recent_window=config.recent_window,
                    baseline_window=config.baseline_window,
                    prior_peak_window=config.prior_peak_window,
                    cooldown_periods=config.cooldown_periods,
                )
            )
        if not signals:
            continue
        rows = run_backtests(active_definitions, signals, close_frame=close_frame)
        basket_summary = summarize_top_basket_backtests(rows, top_n=3)
        score = _score_basket_summary(basket_summary)
        results.append(
            ExperimentResult(
                config=config,
                signal_count=len(signals),
                basket_count=basket_summary["basket_count"],
                score=score,
                basket_summary=basket_summary,
            )
        )
    return sorted(results, key=lambda result: result.score, reverse=True)


def _score_basket_summary(basket_summary: dict) -> float:
    windows = basket_summary["windows"]
    one_year = windows.get("252", {})
    two_year = windows.get("504", {})
    three_year = windows.get("756", {})
    basket_count = basket_summary.get("basket_count", 0)

    def val(window: dict, key: str) -> float:
        raw = window.get(key)
        return 0.0 if raw is None else float(raw)

    # Favor durable 1-2 year outcomes, keep some respect for 3-year follow-through,
    # and penalize tiny sample sizes so the optimizer cannot win with only a few cases.
    score = 0.0
    score += val(one_year, "avg_excess_return") * 100.0 * 0.45
    score += val(two_year, "avg_excess_return") * 100.0 * 0.35
    score += val(three_year, "avg_excess_return") * 100.0 * 0.20
    score += val(one_year, "hit_rate") * 10.0
    score += val(two_year, "hit_rate") * 8.0
    score += min(basket_count, 24) * 0.9
    if basket_count < 10:
        score -= (10 - basket_count) * 5.0
    return score


def _download_shared_close_frame(
    definitions: Sequence[TrendDefinition],
    series_map: dict[str, list[TrendPoint]],
):
    tickers: set[str] = set()
    start_dates = []
    end_dates = []
    for definition in definitions:
        tickers.add(definition.benchmark_ticker)
        for exposure in definition.exposures:
            tickers.add(exposure.ticker)
        points = series_map.get(definition.slug, [])
        if points:
            start_dates.append(min(point.period_start for point in points))
            end_dates.append(max(point.period_start for point in points))
    if not start_dates or not end_dates:
        raise RuntimeError("No stored trend series found for optimization.")
    return download_close_history(
        tickers=sorted(tickers),
        start_date=min(start_dates),
        end_date=max(end_dates),
    )
