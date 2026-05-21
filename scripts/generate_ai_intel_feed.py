#!/usr/bin/env python3
"""Generate a free-source AI intelligence feed for the static GitHub Pages app."""

from __future__ import annotations

import argparse
import email.utils
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "ai-intel-daily" / "data" / "ai-feed.json"
DEFAULT_ARCHIVE_DIR = ROOT / "ai-intel-daily" / "archive"
USER_AGENT = "AIIntelDaily/1.0 (+https://github.com/; personal free RSS reader)"
UTC = timezone.utc


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    group: str
    weight: int = 1


SOURCES = [
    Source("OpenAI News", "https://openai.com/news/rss.xml", "Official labs", 5),
    Source("Google DeepMind", "https://deepmind.google/blog/rss.xml", "Official labs", 5),
    Source("Meta AI", "https://ai.meta.com/blog/rss/", "Official labs", 4),
    Source("Microsoft AI Blog", "https://blogs.microsoft.com/ai/feed/", "Official labs", 4),
    Source("Hugging Face Blog", "https://huggingface.co/blog/feed.xml", "Official labs", 4),
    Source("Mistral AI News", "https://mistral.ai/news/feed.xml", "Official labs", 4),
    Source("NVIDIA Blog", "https://blogs.nvidia.com/feed/", "AI infrastructure", 5),
    Source("NVIDIA Newsroom", "https://nvidianews.nvidia.com/rss", "AI infrastructure", 5),
    Source("AMD Newsroom", "https://www.amd.com/en/newsroom/rss.xml", "AI infrastructure", 3),
    Source("Intel Newsroom", "https://www.intel.com/content/www/us/en/newsroom/rss.xml", "AI infrastructure", 3),
    Source("AWS Machine Learning", "https://aws.amazon.com/blogs/machine-learning/feed/", "Cloud", 3),
    Source("Google Cloud AI", "https://cloud.google.com/blog/topics/ai-machine-learning/rss", "Cloud", 3),
    Source("Azure AI", "https://techcommunity.microsoft.com/t5/azure-ai-services-blog/bg-p/AzureAIBlog/rss", "Cloud", 3),
    Source("arXiv cs.AI", "https://rss.arxiv.org/rss/cs.AI", "Research", 3),
    Source("arXiv cs.LG", "https://rss.arxiv.org/rss/cs.LG", "Research", 3),
    Source("arXiv cs.CL", "https://rss.arxiv.org/rss/cs.CL", "Research", 3),
    Source("arXiv cs.CV", "https://rss.arxiv.org/rss/cs.CV", "Research", 3),
    Source("arXiv stat.ML", "https://rss.arxiv.org/rss/stat.ML", "Research", 3),
    Source("MIT AI News", "https://news.mit.edu/rss/topic/artificial-intelligence2", "Research", 3),
    Source("Stanford HAI", "https://hai.stanford.edu/news/rss.xml", "Research", 3),
    Source("VentureBeat AI", "https://venturebeat.com/category/ai/feed/", "Free tech coverage", 2),
    Source("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", "Free tech coverage", 2),
    Source("InfoQ AI", "https://feed.infoq.com/AI/news", "Free tech coverage", 2),
    Source("Anthropic discovery", "https://news.google.com/rss/search?q=Anthropic%20AI%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("Google DeepMind discovery", "https://news.google.com/rss/search?q=Google%20DeepMind%20AI%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("Meta AI discovery", "https://news.google.com/rss/search?q=Meta%20AI%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("Mistral AI discovery", "https://news.google.com/rss/search?q=Mistral%20AI%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("AI regulation", "https://news.google.com/rss/search?q=AI%20regulation%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("AI startup funding", "https://news.google.com/rss/search?q=AI%20startup%20funding%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("AI chips", "https://news.google.com/rss/search?q=AI%20chip%20OR%20AI%20semiconductor%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
    Source("AI agents", "https://news.google.com/rss/search?q=AI%20agents%20when:2d&hl=en-US&gl=US&ceid=US:en", "Web discovery", 1),
]


THEMES = {
    "models": ["model", "llm", "language model", "reasoning", "multimodal", "frontier", "benchmark"],
    "agents": ["agent", "tool use", "computer use", "workflow", "automation", "autonomous"],
    "chips": ["gpu", "chip", "semiconductor", "accelerator", "cuda", "hbm", "nvidia", "amd", "tsmc"],
    "cloud": ["cloud", "azure", "aws", "google cloud", "datacenter", "data center", "inference"],
    "robotics": ["robot", "robotics", "autonomous", "drone", "industrial automation"],
    "healthcare": ["health", "medical", "drug", "clinical", "biology", "protein", "genomics"],
    "enterprise": ["enterprise", "customer", "copilot", "productivity", "saas", "salesforce", "servicenow"],
    "security": ["security", "cyber", "safety", "jailbreak", "eval", "alignment", "risk"],
    "policy": ["regulation", "policy", "copyright", "law", "governance", "white house", "eu ai act"],
    "funding": ["funding", "raises", "valuation", "ipo", "acquisition", "merger", "startup"],
    "research": ["paper", "research", "arxiv", "dataset", "method", "training", "inference"],
}

THEME_TICKERS = {
    "chips": ["NVDA", "AMD", "TSM", "AVGO", "MU", "SMH"],
    "cloud": ["MSFT", "GOOGL", "AMZN", "ORCL", "CRM"],
    "models": ["MSFT", "GOOGL", "META", "AMZN"],
    "agents": ["MSFT", "GOOGL", "CRM", "NOW", "ADBE"],
    "robotics": ["TSLA", "ISRG", "ROK", "TER", "BOTZ"],
    "healthcare": ["LLY", "NVO", "ISRG", "TMO", "XLV"],
    "enterprise": ["MSFT", "CRM", "NOW", "ADBE", "ORCL"],
    "security": ["CRWD", "PANW", "ZS", "NET"],
    "policy": ["QQQ", "SMH", "XLK"],
    "funding": ["QQQ", "ARKK", "IGV"],
    "research": ["NVDA", "MSFT", "GOOGL", "META"],
}

HIGH_SIGNAL_WORDS = [
    "launch",
    "release",
    "announces",
    "raises",
    "funding",
    "acquires",
    "partnership",
    "breakthrough",
    "benchmark",
    "chip",
    "gpu",
    "agent",
    "regulation",
    "safety",
    "enterprise",
    "revenue",
]


def fetch_text(url: str, timeout: int) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        if exc.code in {301, 302, 303, 307, 308} and exc.headers.get("Location"):
            redirected = urllib.parse.urljoin(url, exc.headers["Location"])
            redirected_request = urllib.request.Request(redirected, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(redirected_request, timeout=timeout) as response:
                return response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        raise


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def child_text(node: ET.Element, names: tuple[str, ...]) -> str:
    for child in list(node):
        if local_name(child.tag) in names and child.text:
            return html.unescape(child.text.strip())
    return ""


def child_attr(node: ET.Element, name: str, attr: str) -> str:
    for child in list(node):
        if local_name(child.tag) == name:
            value = child.attrib.get(attr)
            if value:
                return html.unescape(value.strip())
    return ""


def parse_date(value: str) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except (TypeError, ValueError):
        pass
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except ValueError:
        return None


def clean_text(value: str, limit: int = 260) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) <= limit:
        return value
    return value[: limit - 1].rsplit(" ", 1)[0] + "..."


def canonical_url(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        query = [(k, v) for k, v in query if not k.lower().startswith("utm_")]
        return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query), fragment=""))
    except ValueError:
        return url


def parse_feed(source: Source, xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    if local_name(root.tag) == "feed":
        nodes = [node for node in list(root) if local_name(node.tag) == "entry"]
    else:
        nodes = root.findall(".//item")

    items = []
    for node in nodes:
        title = clean_text(child_text(node, ("title",)), 180)
        link = child_text(node, ("link",)) or child_attr(node, "link", "href")
        link = canonical_url(link)
        published_raw = child_text(node, ("pubdate", "published", "updated", "date", "dc:date"))
        published_at = parse_date(published_raw)
        description = clean_text(child_text(node, ("description", "summary", "content", "encoded")), 360)
        if not title or not link:
            continue
        items.append(
            {
                "id": hashlib.sha1(f"{source.name}:{link or title}".encode("utf-8")).hexdigest()[:16],
                "title": title,
                "url": link,
                "source": source.name,
                "sourceGroup": source.group,
                "publishedAt": (published_at or datetime.now(UTC)).isoformat(),
                "summary": description or "No feed summary provided. Open the source for details.",
                "sourceWeight": source.weight,
            }
        )
    return items


def tag_item(item: dict, now: datetime) -> dict:
    text = f"{item['title']} {item['summary']} {item['source']}".lower()
    tags = [theme for theme, words in THEMES.items() if any(word in text for word in words)]
    if not tags and "ai" in text:
        tags = ["models"]
    published_at = parse_date(item["publishedAt"]) or now
    age_hours = max(0.0, (now - published_at).total_seconds() / 3600)
    recency = max(0, 30 - int(age_hours // 12))
    keyword_score = sum(3 for word in HIGH_SIGNAL_WORDS if word in text)
    group_bonus = 6 if item["sourceGroup"] in {"Official labs", "AI infrastructure", "Research"} else 2
    item["tags"] = tags[:4]
    item["watchlist"] = sorted({ticker for tag in tags for ticker in THEME_TICKERS.get(tag, [])})[:8]
    item["signalScore"] = min(100, 35 + recency + keyword_score + item["sourceWeight"] * 4 + group_bonus + len(tags) * 2)
    item["angle"] = investment_angle(tags)
    item["publishedAt"] = published_at.isoformat()
    return item


def investment_angle(tags: list[str]) -> str:
    if not tags:
        return "Monitor for follow-up coverage before mapping this into a market theme."
    primary = tags[0]
    angles = {
        "chips": "AI compute demand signal; watch accelerator, memory, foundry, and networking exposure.",
        "cloud": "Cloud AI demand signal; watch hyperscaler capex, inference margins, and platform lock-in.",
        "models": "Model capability signal; watch platform distribution, developer adoption, and monetization.",
        "agents": "Automation adoption signal; watch enterprise software and workflow platform beneficiaries.",
        "robotics": "Embodied AI signal; watch autonomy, industrial automation, and edge compute names.",
        "healthcare": "AI life-sciences signal; watch drug discovery, medtech, and healthcare data platforms.",
        "enterprise": "AI software monetization signal; watch SaaS attach rates and seat expansion.",
        "security": "AI risk/security signal; watch cybersecurity demand and governance tooling.",
        "policy": "Regulatory signal; watch compliance costs and platform concentration effects.",
        "funding": "Private-market signal; watch categories attracting capital and possible public comps.",
        "research": "Capability frontier signal; watch whether research converts into products or infra demand.",
    }
    return angles.get(primary, angles["models"])


def dedupe(items: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for item in items:
        key = canonical_url(item["url"]) or re.sub(r"\W+", "", item["title"].lower())
        title_key = re.sub(r"\W+", "", item["title"].lower())[:80]
        if key in seen or title_key in seen:
            continue
        seen.add(key)
        seen.add(title_key)
        result.append(item)
    return result


def build_digest(items: list[dict], now: datetime) -> dict:
    tagged = [tag_item(item, now) for item in dedupe(items)]
    tagged.sort(key=lambda item: (item["signalScore"], item["publishedAt"]), reverse=True)
    recent_cutoff = now - timedelta(days=3)
    recent = [item for item in tagged if (parse_date(item["publishedAt"]) or now) >= recent_cutoff]
    source_counts: dict[str, int] = {}
    selected = []
    for item in recent or tagged:
        if source_counts.get(item["source"], 0) >= 12:
            continue
        selected.append(item)
        source_counts[item["source"]] = source_counts.get(item["source"], 0) + 1
        if len(selected) >= 80:
            break
    tag_counts: dict[str, int] = {}
    group_counts: dict[str, int] = {}
    for item in selected:
        group_counts[item["sourceGroup"]] = group_counts.get(item["sourceGroup"], 0) + 1
        for tag in item["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    leaders = sorted(tag_counts.items(), key=lambda pair: pair[1], reverse=True)[:6]
    return {
        "generatedAt": now.isoformat(),
        "sourcePolicy": "Free public RSS/Atom/news feeds only. No paid feeds and no API keys.",
        "itemCount": len(selected),
        "sourceCount": len({item["source"] for item in selected}),
        "topThemes": [{"tag": tag, "count": count, "tickers": THEME_TICKERS.get(tag, [])[:6]} for tag, count in leaders],
        "sourceGroups": [{"group": group, "count": count} for group, count in sorted(group_counts.items())],
        "items": selected,
    }


def load_items(timeout: int) -> tuple[list[dict], list[dict]]:
    items: list[dict] = []
    failures: list[dict] = []
    for source in SOURCES:
        try:
            items.extend(parse_feed(source, fetch_text(source.url, timeout)))
        except Exception as exc:  # Feed availability changes; failed sources should not break the app.
            failures.append({"source": source.name, "url": source.url, "error": str(exc)[:180]})
    return items, failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--archive-dir", type=Path, default=DEFAULT_ARCHIVE_DIR)
    parser.add_argument("--timeout", type=int, default=8)
    parser.add_argument("--include-failures", action="store_true")
    args = parser.parse_args()

    now = datetime.now(UTC).replace(microsecond=0)
    items, failures = load_items(args.timeout)
    digest = build_digest(items, now)
    if args.include_failures:
        digest["failedSources"] = failures
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(digest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_archive(args.archive_dir, digest)
    print(f"Wrote {digest['itemCount']} items from {digest['sourceCount']} sources to {args.output}")
    if failures:
        print(f"Skipped {len(failures)} unavailable sources", file=sys.stderr)
    return 0 if items else 1


def write_archive(archive_dir: Path, digest: dict) -> None:
    archive_dir.mkdir(parents=True, exist_ok=True)
    generated = parse_date(digest["generatedAt"]) or datetime.now(UTC)
    date_key = generated.date().isoformat()
    archive_file = archive_dir / f"{date_key}.json"
    archive_file.write_text(json.dumps(digest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    entries = []
    for path in sorted(archive_dir.glob("*.json"), reverse=True):
        if path.name == "manifest.json":
            continue
        try:
            archived = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        entries.append(
            {
                "date": path.stem,
                "path": path.name,
                "generatedAt": archived.get("generatedAt"),
                "itemCount": archived.get("itemCount", 0),
                "sourceCount": archived.get("sourceCount", 0),
            }
        )
    (archive_dir / "manifest.json").write_text(json.dumps({"archives": entries[:45]}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
