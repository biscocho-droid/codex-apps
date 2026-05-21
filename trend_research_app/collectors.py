from __future__ import annotations

from datetime import date
import time
from typing import List

import pandas as pd

from .models import TrendDefinition, TrendPoint


class TrendsCollectorError(RuntimeError):
    pass


def collect_weekly_points(definition: TrendDefinition, start_date: date, end_date: date) -> List[TrendPoint]:
    try:
        from pytrends.request import TrendReq
    except ImportError as exc:
        raise TrendsCollectorError(
            "pytrends is not installed. Install it before fetching live Google Trends data."
        ) from exc

    timeframe = "{} {}".format(start_date.isoformat(), end_date.isoformat())
    attempts = 4
    frame = None
    for attempt in range(1, attempts + 1):
        client = TrendReq(hl="en-US", tz=360)
        try:
            client.build_payload([definition.keyword], timeframe=timeframe, geo="US")
            frame = client.interest_over_time()
            break
        except Exception as exc:
            if "429" not in str(exc) or attempt == attempts:
                raise
            time.sleep(8 * attempt)
    if frame is None:
        raise TrendsCollectorError("No trend data returned for keyword '{}'.".format(definition.keyword))
    if frame.empty or definition.keyword not in frame.columns:
        raise TrendsCollectorError("No trend data returned for keyword '{}'.".format(definition.keyword))

    series = frame[definition.keyword]
    if "isPartial" in frame.columns:
        series = series[~frame["isPartial"]]
    if series.empty:
        raise TrendsCollectorError("Only partial or empty trend data was returned for '{}'.".format(definition.keyword))

    points: List[TrendPoint] = []
    for period_start, value in series.items():
        if isinstance(period_start, pd.Timestamp):
            period_date = period_start.date()
        else:
            period_date = pd.Timestamp(period_start).date()
        points.append(
            TrendPoint(
                trend_slug=definition.slug,
                keyword=definition.keyword,
                period_start=period_date,
                value=float(value),
            )
        )
    return points
