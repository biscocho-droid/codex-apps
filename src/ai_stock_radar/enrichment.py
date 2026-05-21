from __future__ import annotations

from dataclasses import replace

from .market_data import MomentumSnapshot, YahooChartClient
from .models import Evidence


def enrich_with_momentum(evidence: list[Evidence], client: YahooChartClient) -> list[Evidence]:
    cache: dict[str, MomentumSnapshot] = {}
    enriched: list[Evidence] = []
    for row in evidence:
        if row.ticker not in cache:
            cache[row.ticker] = client.momentum(row.ticker)
        snapshot = cache[row.ticker]
        metadata = dict(row.metadata)
        metadata.update(
            {
                "latest_price": _fmt(snapshot.latest_price),
                "return_30d": _fmt(snapshot.return_30d),
                "return_90d": _fmt(snapshot.return_90d),
                "return_180d": _fmt(snapshot.return_180d),
                "crowd_risk": snapshot.crowd_risk,
            }
        )
        enriched.append(replace(row, metadata=metadata, classification=_classification(row.classification, snapshot)))
    return enriched


def _classification(current: str, snapshot: MomentumSnapshot) -> str:
    if snapshot.crowd_risk == "High" and current in {"Confirmed Beneficiary", "Emerging Beneficiary"}:
        return f"{current} / Crowded"
    if snapshot.crowd_risk == "Low" and current in {"Early Signal", "Business Evidence", "Emerging Beneficiary"}:
        return f"{current} / Less Crowded"
    return current


def _fmt(value: float | None) -> str:
    if value is None:
        return ""
    return f"{value:.2f}"
