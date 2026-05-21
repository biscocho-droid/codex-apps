from pathlib import Path
from datetime import datetime, timezone

from ai_stock_radar.config import AppConfig
from ai_stock_radar.detection import detect_evidence
from ai_stock_radar.models import SourceItem


def test_detect_evidence_finds_configured_ticker_and_ai_theme() -> None:
    config = AppConfig(
        path=Path("config.yaml"),
        database_path=Path("data/test.sqlite3"),
        report_dir=Path("reports"),
        lookback_days=7,
        max_items_per_source=10,
        user_agent="test",
        watchlist=["IREN"],
        candidate_tickers=[],
        company_aliases={},
        rss_sources=[],
        sec_enabled=False,
        sec_forms=[],
        ai_themes=["GPU cloud", "data center"],
        narrative_triggers=["capacity expansion"],
        scoring={
            "source_quality": {"rss": 18},
            "theme_hit": 8,
            "trigger_hit": 7,
            "watchlist_bonus": 5,
            "max_score": 100,
        },
        notifications={},
    )
    item = SourceItem(
        source_type="rss",
        source_name="Example",
        title="IREN announces GPU cloud capacity expansion",
        url="https://example.com",
        published_at=datetime.now(timezone.utc),
        text="The data center operator is expanding GPU cloud capacity.",
    )

    evidence = detect_evidence(item, config)

    assert len(evidence) == 1
    assert evidence[0].ticker == "IREN"
    assert evidence[0].score > 30


def test_detect_evidence_finds_company_alias_without_ticker() -> None:
    config = AppConfig(
        path=Path("config.yaml"),
        database_path=Path("data/test.sqlite3"),
        report_dir=Path("reports"),
        lookback_days=7,
        max_items_per_source=10,
        user_agent="test",
        watchlist=[],
        candidate_tickers=[],
        company_aliases={"VRT": ["Vertiv"]},
        rss_sources=[],
        sec_enabled=False,
        sec_forms=[],
        ai_themes=["data center"],
        narrative_triggers=["capacity expansion"],
        scoring={
            "source_quality": {"rss": 18},
            "theme_hit": 8,
            "trigger_hit": 7,
            "watchlist_bonus": 5,
            "max_score": 100,
        },
        notifications={},
    )
    item = SourceItem(
        source_type="rss",
        source_name="Example",
        title="Vertiv benefits from data center capacity expansion",
        url="https://example.com",
        published_at=datetime.now(timezone.utc),
        text="The company is seeing more demand from AI data center projects.",
    )

    evidence = detect_evidence(item, config)

    assert len(evidence) == 1
    assert evidence[0].ticker == "VRT"
