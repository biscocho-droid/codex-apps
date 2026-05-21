from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(frozen=True)
class SourceItem:
    source_type: str
    source_name: str
    title: str
    url: str
    published_at: datetime
    text: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Evidence:
    ticker: str
    company_name: str | None
    source_type: str
    source_name: str
    title: str
    url: str
    published_at: datetime
    excerpt: str
    themes: list[str]
    triggers: list[str]
    score: int
    classification: str
    metadata: dict[str, str] = field(default_factory=dict)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
