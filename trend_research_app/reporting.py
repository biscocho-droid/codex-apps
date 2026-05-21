from __future__ import annotations

from pathlib import Path
from string import Template
from typing import Iterable, Sequence

from .models import AggregateSummary, SignalBacktest, TrendSignal


def write_html_report(
    output_path: Path,
    signals: Sequence[TrendSignal],
    rows: Iterable[SignalBacktest],
    summary: AggregateSummary,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    signals = sorted(signals, key=lambda value: (value.signal_date, value.score), reverse=True)

    html = Template("""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trend Research Backtest</title>
  <style>
    :root {
      --bg: #f4f0e8;
      --panel: rgba(255, 255, 255, 0.78);
      --line: rgba(37, 47, 63, 0.12);
      --ink: #17202a;
      --muted: #5a6572;
      --accent: #c25b3c;
      --accent-soft: rgba(194, 91, 60, 0.12);
      --green: #176542;
      --shadow: 0 24px 60px rgba(32, 30, 24, 0.12);
      --radius: 22px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(194, 91, 60, 0.16), transparent 28%),
        radial-gradient(circle at 88% 10%, rgba(14, 91, 120, 0.12), transparent 22%),
        linear-gradient(180deg, #f8f3ea 0%, #ece6db 100%);
      color: var(--ink);
      font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
    }
    .shell {
      width: min(1280px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
      display: grid;
      gap: 16px;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }
    .hero {
      padding: 24px;
      display: grid;
      gap: 8px;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      color: var(--muted);
    }
    h1, h2 {
      margin: 0;
      font-weight: 600;
    }
    h1 {
      font-size: clamp(32px, 5vw, 56px);
      line-height: 0.95;
      max-width: 760px;
    }
    .lede {
      max-width: 760px;
      color: var(--muted);
      line-height: 1.6;
      font-size: 17px;
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 16px;
    }
    .metric {
      grid-column: span 3;
      padding: 18px;
    }
    .metric strong {
      display: block;
      font-size: 30px;
      margin-top: 8px;
    }
    .panel {
      padding: 18px;
    }
    .wide {
      grid-column: span 7;
    }
    .narrow {
      grid-column: span 5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      font-size: 14px;
    }
    th, td {
      text-align: left;
      padding: 11px 10px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .tag {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-family: "Avenir Next", "Segoe UI", sans-serif;
      font-size: 12px;
      font-weight: 600;
    }
    .positive { color: var(--green); }
    .muted { color: var(--muted); }
    @media (max-width: 960px) {
      .metric, .wide, .narrow { grid-column: span 12; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <span class="eyebrow">Trend-First Research / Event Backtests</span>
      <h1>Emerging search behavior, mapped to listed exposures.</h1>
      <p class="lede">This report scores trend-signal events, then measures forward stock returns versus SPY across fixed windows. It is designed for idea triage, not automated execution.</p>
    </section>
    <section class="grid">
      $metrics
    </section>
    <section class="grid">
      <article class="panel wide">
        <h2>Window Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Window</th>
              <th>Samples</th>
              <th>Avg Stock Return</th>
              <th>Avg SPY Return</th>
              <th>Avg Excess Return</th>
              <th>Hit Rate</th>
              <th>Avg Max Drawdown</th>
            </tr>
          </thead>
          <tbody>
            $summary_rows
          </tbody>
        </table>
      </article>
      <article class="panel narrow">
        <h2>Detected Signals</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Trend</th>
              <th>Category</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            $signal_rows
          </tbody>
        </table>
      </article>
    </section>
    <section class="grid">
      <article class="panel wide">
        <h2>Category Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Window</th>
              <th>Samples</th>
              <th>Avg Excess Return</th>
              <th>Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            $category_rows
          </tbody>
        </table>
      </article>
      <article class="panel narrow">
        <h2>Trend Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Trend</th>
              <th>Window</th>
              <th>Samples</th>
              <th>Avg Excess Return</th>
              <th>Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            $trend_rows
          </tbody>
        </table>
      </article>
    </section>
    <section class="panel">
      <h2>Exposure Backtests</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Trend</th>
            <th>Benchmark</th>
            <th>Ticker</th>
            <th>Role</th>
            <th>5d Excess</th>
            <th>20d Excess</th>
            <th>60d Excess</th>
            <th>120d Excess</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          $backtest_rows
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
""")
    metrics = [
        _metric_card("Trend Families", str(summary.trend_count)),
        _metric_card("Signal Events", str(summary.signal_count)),
        _metric_card("Exposure Tests", str(summary.exposure_count)),
        _metric_card("Report Time", summary.created_at[:16].replace("T", " ")),
    ]
    summary_rows = []
    for trading_days, window in summary.windows.items():
        summary_rows.append(
            "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td class='{}'>{}</td><td>{}</td><td>{}</td></tr>".format(
                "{}d".format(trading_days),
                window.sample_size,
                _fmt_pct(window.avg_stock_return),
                _fmt_pct(window.avg_benchmark_return),
                "positive" if (window.avg_excess_return or 0) > 0 else "",
                _fmt_pct(window.avg_excess_return),
                _fmt_pct(window.hit_rate),
                _fmt_pct(window.avg_max_drawdown),
            )
        )

    signal_rows = [
        "<tr><td>{}</td><td><span class='tag'>{}</span></td><td>{}</td><td>{}</td></tr>".format(
            signal.signal_date.isoformat(),
            signal.keyword,
            signal.category,
            round(signal.score, 1),
        )
        for signal in signals
    ]

    category_rows = []
    for category, windows in summary.category_windows.items():
        for trading_days, window in windows.items():
            category_rows.append(
                "<tr><td>{}</td><td>{}d</td><td>{}</td><td class='{}'>{}</td><td>{}</td></tr>".format(
                    category,
                    trading_days,
                    window.sample_size,
                    "positive" if (window.avg_excess_return or 0) > 0 else "",
                    _fmt_pct(window.avg_excess_return),
                    _fmt_pct(window.hit_rate),
                )
            )

    trend_rows = []
    for trend_slug, windows in summary.trend_windows.items():
        for trading_days, window in windows.items():
            trend_rows.append(
                "<tr><td>{}</td><td>{}d</td><td>{}</td><td class='{}'>{}</td><td>{}</td></tr>".format(
                    trend_slug,
                    trading_days,
                    window.sample_size,
                    "positive" if (window.avg_excess_return or 0) > 0 else "",
                    _fmt_pct(window.avg_excess_return),
                    _fmt_pct(window.hit_rate),
                )
            )

    backtest_rows = []
    for row in rows:
        backtest_rows.append(
            "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td class='{}'>{}</td><td class='{}'>{}</td><td class='{}'>{}</td><td class='{}'>{}</td><td class='muted'>{}</td></tr>".format(
                row.signal_date.isoformat(),
                row.keyword,
                row.benchmark_ticker,
                row.ticker,
                row.role,
                _positive_class(row.windows.get(5)),
                _fmt_pct(_window_value(row.windows, 5)),
                _positive_class(row.windows.get(20)),
                _fmt_pct(_window_value(row.windows, 20)),
                _positive_class(row.windows.get(60)),
                _fmt_pct(_window_value(row.windows, 60)),
                _positive_class(row.windows.get(120)),
                _fmt_pct(_window_value(row.windows, 120)),
                row.rationale,
            )
        )

    output_path.write_text(
        html.substitute(
            metrics="".join(metrics),
            summary_rows="".join(summary_rows),
            signal_rows="".join(signal_rows),
            category_rows="".join(category_rows),
            trend_rows="".join(trend_rows),
            backtest_rows="".join(backtest_rows),
        ),
        encoding="utf-8",
    )


def _metric_card(label: str, value: str) -> str:
    return "<article class='panel metric'><span class='eyebrow'>{}</span><strong>{}</strong></article>".format(
        label, value
    )


def _fmt_pct(value):
    if value is None:
        return "n/a"
    return "{:.1f}%".format(value * 100.0)


def _window_value(window_map, days: int):
    value = window_map.get(days)
    if not value:
        return None
    return value.excess_return


def _positive_class(window):
    if not window or window.excess_return is None:
        return ""
    return "positive" if window.excess_return > 0 else ""
