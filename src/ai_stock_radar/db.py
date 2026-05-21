from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .models import Evidence


SCHEMA = """
CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    company_name TEXT,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    themes_json TEXT NOT NULL,
    triggers_json TEXT NOT NULL,
    score INTEGER NOT NULL,
    classification TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, url, title)
);

CREATE INDEX IF NOT EXISTS idx_evidence_ticker ON evidence(ticker);
CREATE INDEX IF NOT EXISTS idx_evidence_published_at ON evidence(published_at);
"""


class RadarDatabase:
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

    def insert_evidence(self, evidence: Evidence) -> bool:
        with self.connect() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO evidence (
                    ticker, company_name, source_type, source_name, title, url,
                    published_at, excerpt, themes_json, triggers_json, score,
                    classification, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence.ticker,
                    evidence.company_name,
                    evidence.source_type,
                    evidence.source_name,
                    evidence.title,
                    evidence.url,
                    evidence.published_at.isoformat(),
                    evidence.excerpt,
                    json.dumps(evidence.themes),
                    json.dumps(evidence.triggers),
                    evidence.score,
                    evidence.classification,
                    json.dumps(evidence.metadata),
                ),
            )
            return cursor.rowcount > 0

    def recent_evidence(self, limit: int = 200) -> list[Evidence]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT * FROM evidence
                ORDER BY published_at DESC, score DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [_row_to_evidence(row) for row in rows]


def _row_to_evidence(row: sqlite3.Row) -> Evidence:
    from datetime import datetime

    return Evidence(
        ticker=row["ticker"],
        company_name=row["company_name"],
        source_type=row["source_type"],
        source_name=row["source_name"],
        title=row["title"],
        url=row["url"],
        published_at=datetime.fromisoformat(row["published_at"]),
        excerpt=row["excerpt"],
        themes=json.loads(row["themes_json"]),
        triggers=json.loads(row["triggers_json"]),
        score=int(row["score"]),
        classification=row["classification"],
        metadata=json.loads(row["metadata_json"]),
    )
