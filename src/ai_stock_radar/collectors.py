from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Iterable

import feedparser
import requests
from bs4 import BeautifulSoup

from .config import AppConfig
from .models import SourceItem, utc_now

LOGGER = logging.getLogger(__name__)


class RSSCollector:
    def __init__(self, config: AppConfig) -> None:
        self.config = config

    def collect(self) -> Iterable[SourceItem]:
        cutoff = utc_now() - timedelta(days=self.config.lookback_days)
        for source in self.config.rss_sources:
            if not source.enabled:
                continue
            try:
                feed = feedparser.parse(source.url)
            except Exception:
                LOGGER.exception("Failed to parse RSS source %s", source.name)
                continue

            for entry in feed.entries[: self.config.max_items_per_source]:
                published_at = _entry_datetime(entry)
                if published_at < cutoff:
                    continue
                title = _text(entry.get("title", "Untitled"))
                summary = _html_to_text(entry.get("summary", ""))
                yield SourceItem(
                    source_type="rss",
                    source_name=source.name,
                    title=title,
                    url=str(entry.get("link", source.url)),
                    published_at=published_at,
                    text=summary,
                )


class SECCollector:
    SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
    TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers.json"

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.user_agent})

    def collect(self) -> Iterable[SourceItem]:
        if not self.config.sec_enabled:
            return []
        try:
            ticker_map = self._ticker_map()
        except Exception:
            LOGGER.exception("Failed to load SEC ticker map")
            return []

        cutoff = utc_now() - timedelta(days=self.config.lookback_days)
        tickers = sorted(set(self.config.watchlist) | set(self.config.candidate_tickers))
        for ticker in tickers:
            record = ticker_map.get(ticker)
            if not record:
                continue
            cik = str(record["cik_str"]).zfill(10)
            company_name = record.get("title")
            try:
                response = self.session.get(self.SUBMISSIONS_URL.format(cik=cik), timeout=20)
                response.raise_for_status()
                data = response.json()
            except Exception:
                LOGGER.exception("Failed SEC submissions request for %s", ticker)
                continue

            recent = data.get("filings", {}).get("recent", {})
            forms = recent.get("form", [])
            dates = recent.get("filingDate", [])
            accession_numbers = recent.get("accessionNumber", [])
            primary_docs = recent.get("primaryDocument", [])

            for form, filing_date, accession, document in zip(forms, dates, accession_numbers, primary_docs):
                if form not in self.config.sec_forms:
                    continue
                published_at = _safe_date(filing_date)
                if published_at < cutoff:
                    continue
                accession_clean = accession.replace("-", "")
                url = (
                    f"https://www.sec.gov/Archives/edgar/data/"
                    f"{int(cik)}/{accession_clean}/{document}"
                )
                filing_text = self._filing_text(url)
                yield SourceItem(
                    source_type="sec",
                    source_name="SEC EDGAR",
                    title=f"{ticker} {form} filed {filing_date}",
                    url=url,
                    published_at=published_at,
                    text=f"{company_name} ({ticker}) {form}\n{filing_text}",
                    metadata={"company_name": company_name or "", "form": form, "ticker": ticker},
                )

    def _ticker_map(self) -> dict[str, dict]:
        response = self.session.get(self.TICKER_MAP_URL, timeout=20)
        response.raise_for_status()
        records = response.json().values()
        return {str(record["ticker"]).upper(): record for record in records}

    def _filing_text(self, url: str) -> str:
        try:
            response = self.session.get(url, timeout=25)
            response.raise_for_status()
        except Exception:
            LOGGER.exception("Failed to fetch SEC filing document %s", url)
            return ""
        text = BeautifulSoup(response.text, "html.parser").get_text(" ", strip=True)
        return text[:200_000]


def _entry_datetime(entry: dict) -> datetime:
    for key in ("published", "updated", "created"):
        value = entry.get(key)
        if value:
            try:
                parsed = parsedate_to_datetime(value)
                if parsed.tzinfo is None:
                    return parsed.replace(tzinfo=timezone.utc)
                return parsed.astimezone(timezone.utc)
            except Exception:
                continue
    return utc_now()


def _safe_date(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    except ValueError:
        return utc_now()


def _html_to_text(value: str) -> str:
    return BeautifulSoup(value or "", "html.parser").get_text(" ", strip=True)


def _text(value: str) -> str:
    return BeautifulSoup(value or "", "html.parser").get_text(" ", strip=True)
