from __future__ import annotations

from typing import Iterable, List

import pandas as pd

from .models import TrendDefinition, TrendPoint, TrendSignal


def detect_signals(
    definition: TrendDefinition,
    points: Iterable[TrendPoint],
    min_level: float = 18.0,
    min_accel_ratio: float = 1.8,
    min_zscore: float = 1.25,
    min_persistence: float = 0.5,
    baseline_floor: float = 5.0,
    min_score: float = 45.0,
    min_peak_ratio: float = 0.0,
    recent_window: int = 4,
    baseline_window: int = 12,
    prior_peak_window: int = 18,
    cooldown_periods: int = 0,
) -> List[TrendSignal]:
    frame = pd.DataFrame(
        [
            {"period_start": point.period_start, "value": float(point.value)}
            for point in points
        ]
    )
    if frame.empty or len(frame) < 30:
        return []

    frame = frame.sort_values("period_start").reset_index(drop=True)
    frame["recent_mean"] = frame["value"].rolling(recent_window).mean()
    frame["baseline_mean"] = frame["value"].shift(recent_window).rolling(baseline_window).mean()
    frame["baseline_std"] = frame["value"].shift(recent_window).rolling(baseline_window).std(ddof=0)
    frame["persistence"] = frame["value"].rolling(recent_window).apply(_persistence_ratio, raw=True)
    frame["prior_peak"] = frame["value"].shift(1).rolling(prior_peak_window).max()

    safe_baseline = frame["baseline_mean"].clip(lower=baseline_floor)
    safe_std = frame["baseline_std"].clip(lower=2.0)
    frame["accel_ratio"] = frame["recent_mean"] / safe_baseline
    frame["peak_ratio"] = frame["recent_mean"] / frame["prior_peak"].clip(lower=baseline_floor)
    frame["zscore"] = (
        (frame["recent_mean"] - frame["baseline_mean"])
        / safe_std
    )
    frame["score_level"] = (frame["value"] / 100.0).clip(lower=0.0, upper=1.0)
    frame["score_accel"] = ((frame["accel_ratio"] - 1.0) / 2.0).clip(lower=0.0, upper=1.0)
    frame["score_z"] = (frame["zscore"] / 4.0).clip(lower=0.0, upper=1.0)
    frame["score_persist"] = frame["persistence"].clip(lower=0.0, upper=1.0)
    frame["score"] = (
        (frame["score_level"] * 0.25)
        + (frame["score_accel"] * 0.35)
        + (frame["score_z"] * 0.25)
        + (frame["score_persist"] * 0.15)
    ) * 100.0

    signals: List[TrendSignal] = []
    in_signal = False
    cooldown_remaining = 0
    for row in frame.itertuples(index=False):
        if pd.isna(row.baseline_mean) or pd.isna(row.zscore) or pd.isna(row.accel_ratio):
            continue

        is_signal = (
            row.value >= min_level
            and row.recent_mean >= min_level
            and row.accel_ratio >= min_accel_ratio
            and row.zscore >= min_zscore
            and row.persistence >= min_persistence
            and row.score >= min_score
            and (pd.isna(row.peak_ratio) or row.peak_ratio >= min_peak_ratio)
        )
        if cooldown_remaining > 0:
            cooldown_remaining -= 1
        if is_signal and not in_signal and cooldown_remaining == 0:
            signals.append(
                TrendSignal(
                    trend_slug=definition.slug,
                    keyword=definition.keyword,
                    category=definition.category,
                    signal_date=row.period_start,
                    level=float(row.value),
                    baseline=float(row.baseline_mean),
                    zscore=float(row.zscore),
                    accel_ratio=float(row.accel_ratio),
                    persistence=float(row.persistence),
                    score=round(float(row.score), 2),
                )
            )
            cooldown_remaining = cooldown_periods
        in_signal = is_signal
    return signals


def _persistence_ratio(values) -> float:
    if len(values) == 0:
        return 0.0
    values = list(values)
    diffs = 0
    for index in range(1, len(values)):
        if values[index] >= values[index - 1]:
            diffs += 1
    return diffs / max(1, len(values) - 1)
