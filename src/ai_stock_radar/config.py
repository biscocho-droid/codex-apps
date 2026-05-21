from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class SourceConfig:
    name: str
    url: str
    enabled: bool = True


@dataclass(frozen=True)
class AppConfig:
    path: Path
    database_path: Path
    report_dir: Path
    lookback_days: int
    max_items_per_source: int
    user_agent: str
    watchlist: list[str]
    candidate_tickers: list[str]
    company_aliases: dict[str, list[str]]
    rss_sources: list[SourceConfig]
    sec_enabled: bool
    sec_forms: list[str]
    ai_themes: list[str]
    narrative_triggers: list[str]
    scoring: dict[str, Any]
    notifications: dict[str, Any]


def load_config(path: str | Path) -> AppConfig:
    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as handle:
        raw = yaml.safe_load(handle) or {}

    run = raw.get("run", {})
    keywords = raw.get("keywords", {})
    sec = raw.get("sec", {})

    base_dir = config_path.parent
    database_path = _resolve(base_dir, raw.get("database_path", "data/radar.sqlite3"))
    report_dir = _resolve(base_dir, raw.get("report_dir", "reports"))

    return AppConfig(
        path=config_path,
        database_path=database_path,
        report_dir=report_dir,
        lookback_days=int(run.get("lookback_days", 7)),
        max_items_per_source=int(run.get("max_items_per_source", 30)),
        user_agent=str(run.get("user_agent", "AI Beneficiary Stock Radar")),
        watchlist=_normalize_tickers(raw.get("watchlist", [])),
        candidate_tickers=_normalize_tickers(raw.get("candidate_tickers", [])),
        company_aliases=_normalize_aliases(raw.get("company_aliases", {})),
        rss_sources=[
            SourceConfig(
                name=str(item["name"]),
                url=str(item["url"]),
                enabled=bool(item.get("enabled", True)),
            )
            for item in raw.get("rss_sources", [])
        ],
        sec_enabled=bool(sec.get("enabled", True)),
        sec_forms=[str(form) for form in sec.get("forms", ["8-K", "10-Q", "10-K"])],
        ai_themes=[str(item) for item in keywords.get("ai_themes", [])],
        narrative_triggers=[str(item) for item in keywords.get("narrative_triggers", [])],
        scoring=dict(raw.get("scoring", {})),
        notifications=dict(raw.get("notifications", {})),
    )


def _resolve(base_dir: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else base_dir / path


def _normalize_tickers(values: list[Any]) -> list[str]:
    return sorted({str(value).upper().strip("$ ") for value in values if str(value).strip()})


def _normalize_aliases(values: dict[str, Any]) -> dict[str, list[str]]:
    aliases: dict[str, list[str]] = {}
    for ticker, raw_aliases in values.items():
        normalized = str(ticker).upper().strip("$ ")
        if not normalized:
            continue
        aliases[normalized] = [str(alias).strip() for alias in raw_aliases or [] if str(alias).strip()]
    return aliases
