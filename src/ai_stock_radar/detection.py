from __future__ import annotations

import re

from .config import AppConfig
from .models import Evidence, SourceItem


TICKER_PATTERN = re.compile(r"(?<![A-Z0-9])\$?([A-Z]{2,5})(?![A-Z0-9])")
COMMON_FALSE_POSITIVES = {
    "AI",
    "API",
    "CEO",
    "CFO",
    "CPU",
    "GPU",
    "HPC",
    "IPO",
    "LLM",
    "SEC",
    "USA",
    "USD",
}


def detect_evidence(item: SourceItem, config: AppConfig) -> list[Evidence]:
    all_tickers = set(config.watchlist) | set(config.candidate_tickers)
    text = f"{item.title}\n{item.text}"
    if item.source_type == "sec" and item.metadata.get("ticker"):
        matched_tickers = [item.metadata["ticker"].upper()]
    else:
        matched_tickers = sorted(set(_extract_tickers(text, all_tickers)) | set(_extract_alias_tickers(text, config.company_aliases)))
    if not matched_tickers:
        return []

    themes = _keyword_hits(text, config.ai_themes)
    triggers = _keyword_hits(text, config.narrative_triggers)
    if not themes and not triggers:
        return []

    output: list[Evidence] = []
    for ticker in matched_tickers:
        score = score_evidence(
            source_type=item.source_type,
            ticker=ticker,
            themes=themes,
            triggers=triggers,
            watchlist=config.watchlist,
            scoring=config.scoring,
        )
        output.append(
            Evidence(
                ticker=ticker,
                company_name=item.metadata.get("company_name"),
                source_type=item.source_type,
                source_name=item.source_name,
                title=item.title,
                url=item.url,
                published_at=item.published_at,
                excerpt=_excerpt(text, themes + triggers),
                themes=themes,
                triggers=triggers,
                score=score,
                classification=classify_score(score, item.source_type),
                metadata=item.metadata,
            )
        )
    return output


def score_evidence(
    source_type: str,
    ticker: str,
    themes: list[str],
    triggers: list[str],
    watchlist: list[str],
    scoring: dict,
) -> int:
    source_quality = scoring.get("source_quality", {})
    score = int(source_quality.get(source_type, source_quality.get("rss", 15)))
    score += len(themes) * int(scoring.get("theme_hit", 8))
    score += len(triggers) * int(scoring.get("trigger_hit", 7))
    if ticker in watchlist:
        score += int(scoring.get("watchlist_bonus", 5))
    return min(score, int(scoring.get("max_score", 100)))


def classify_score(score: int, source_type: str) -> str:
    if score >= 80:
        return "Confirmed Beneficiary"
    if score >= 62:
        return "Emerging Beneficiary"
    if score >= 45:
        return "Early Signal" if source_type != "sec" else "Business Evidence"
    if score >= 30:
        return "Speculative"
    return "Weak Evidence"


def _extract_tickers(text: str, configured_tickers: set[str]) -> list[str]:
    candidates = {match.upper() for match in TICKER_PATTERN.findall(text)}
    candidates -= COMMON_FALSE_POSITIVES
    if configured_tickers:
        candidates &= configured_tickers
    return sorted(candidates)


def _extract_alias_tickers(text: str, company_aliases: dict[str, list[str]]) -> list[str]:
    lower = text.lower()
    matches = []
    for ticker, aliases in company_aliases.items():
        for alias in aliases:
            if re.search(rf"(?<![a-z0-9]){re.escape(alias.lower())}(?![a-z0-9])", lower):
                matches.append(ticker)
                break
    return sorted(set(matches))


def _keyword_hits(text: str, keywords: list[str]) -> list[str]:
    lower = text.lower()
    return [keyword for keyword in keywords if keyword.lower() in lower]


def _excerpt(text: str, keywords: list[str], radius: int = 220) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    lower = clean.lower()
    positions = [lower.find(keyword.lower()) for keyword in keywords if lower.find(keyword.lower()) >= 0]
    if not positions:
        return clean[: radius * 2]
    center = min(positions)
    start = max(0, center - radius)
    end = min(len(clean), center + radius)
    prefix = "..." if start else ""
    suffix = "..." if end < len(clean) else ""
    return f"{prefix}{clean[start:end]}{suffix}"
