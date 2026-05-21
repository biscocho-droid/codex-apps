from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path

from jinja2 import Template

from .models import Evidence


HTML_TEMPLATE = Template(
    """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AI Beneficiary Stock Radar - {{ generated_at }}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #16202a; background: #f7f8fa; }
    h1 { margin-bottom: 4px; }
    .meta { color: #5c6670; margin-bottom: 24px; }
    .ticker { background: #fff; border: 1px solid #d9dee3; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
    .ticker h2 { margin: 0 0 8px; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #e9eef5; margin-right: 6px; font-size: 12px; }
    .risk-high { background: #ffe7e3; }
    .risk-medium { background: #fff1cd; }
    .risk-low { background: #ddf3e4; }
    .score { font-weight: bold; }
    .evidence { border-top: 1px solid #edf0f2; padding-top: 12px; margin-top: 12px; }
    .small { color: #5c6670; font-size: 13px; }
    a { color: #1557a8; }
  </style>
</head>
<body>
  <h1>AI Beneficiary Stock Radar</h1>
  <div class="meta">Generated {{ generated_at }}. Research alerts only, not buy/sell recommendations.</div>

  {% if grouped %}
    {% for ticker, rows in grouped.items() %}
      <section class="ticker">
        <h2>{{ ticker }} <span class="score">Top score: {{ rows[0].score }}</span></h2>
        <div>
          <span class="pill">{{ rows[0].classification }}</span>
          {% if rows[0].metadata.get("crowd_risk") %}
            <span class="pill risk-{{ rows[0].metadata.get("crowd_risk", "").lower() }}">Crowd risk: {{ rows[0].metadata.get("crowd_risk") }}</span>
          {% endif %}
          {% for theme in rows[0].themes[:5] %}<span class="pill">{{ theme }}</span>{% endfor %}
        </div>
        {% for row in rows[:4] %}
          <div class="evidence">
            <strong>{{ row.title }}</strong>
            <div class="small">{{ row.source_name }} | {{ row.published_at.strftime("%Y-%m-%d") }} | {{ row.classification }} | score {{ row.score }}</div>
            <p>{{ row.excerpt }}</p>
            <div>
              {% if row.triggers %}<span class="small">Triggers: {{ row.triggers|join(", ") }}</span><br>{% endif %}
              {% if row.themes %}<span class="small">Themes: {{ row.themes|join(", ") }}</span><br>{% endif %}
              {% if row.metadata.get("return_30d") %}
                <span class="small">Momentum: 30d {{ row.metadata.get("return_30d") }}%, 90d {{ row.metadata.get("return_90d") }}%, 180d {{ row.metadata.get("return_180d") }}%</span><br>
              {% endif %}
              <a href="{{ row.url }}">Source</a>
            </div>
          </div>
        {% endfor %}
      </section>
    {% endfor %}
  {% else %}
    <p>No evidence matched the current configuration and lookback window.</p>
  {% endif %}
</body>
</html>
"""
)


def write_html_report(evidence: list[Evidence], report_dir: Path) -> Path:
    report_dir.mkdir(parents=True, exist_ok=True)
    grouped = group_by_ticker(evidence)
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    html = HTML_TEMPLATE.render(grouped=grouped, generated_at=generated_at)
    path = report_dir / f"ai_stock_radar_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    path.write_text(html, encoding="utf-8")
    return path


def group_by_ticker(evidence: list[Evidence]) -> dict[str, list[Evidence]]:
    grouped: dict[str, list[Evidence]] = defaultdict(list)
    for row in sorted(evidence, key=lambda item: (item.score, item.published_at), reverse=True):
        grouped[row.ticker].append(row)
    return dict(grouped)


def console_summary(evidence: list[Evidence], max_rows: int = 12) -> str:
    rows = sorted(evidence, key=lambda item: (item.score, item.published_at), reverse=True)[:max_rows]
    if not rows:
        return "No AI beneficiary evidence matched this run."

    lines = ["Top AI beneficiary radar hits:"]
    for row in rows:
        themes = ", ".join(row.themes[:3]) if row.themes else "no theme"
        crowd = row.metadata.get("crowd_risk", "Unknown")
        r30 = row.metadata.get("return_30d", "")
        momentum = f" crowd={crowd}"
        if r30:
            momentum += f" 30d={r30}%"
        lines.append(
            f"- {row.ticker}: {row.classification} score={row.score} "
            f"themes={themes}{momentum} source={row.source_name} title={row.title}"
        )
    return "\n".join(lines)
