from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from .seed import default_trends


WHY_BY_TREND = {
    "chatgpt": "The best outcomes are showing up after the market has time to reprice infrastructure and platform beneficiaries, not in the first few weeks.",
    "ozempic": "This family compounds well over longer holds, which makes it more useful as a medium- and long-horizon healthcare signal than a fast trade.",
    "protein-soda": "The theme is still too new and too noisy. It stays in the app as an emerging watchlist signal, not a promoted high-confidence family.",
    "robotaxi": "The payoff is lumpy because the theme is narrative-driven, but when it hits the mapped winner can outrun the benchmark hard.",
    "weight-loss-drugs": "This is one of the cleanest families in the model. Both the signal and the exposure mapping stay strong as the horizon extends.",
}

CATEGORY_LABELS = {
    "consumer": "Consumer",
    "food": "Food",
    "health": "Health",
    "internet": "Internet",
    "beauty": "Beauty",
}


def build_app_data(summary_path: Path, db_path: Path) -> dict[str, Any]:
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    definitions = {definition.slug: definition for definition in default_trends()}

    app_data: dict[str, Any] = {
        "generatedAt": summary["created_at"],
        "signalCount": summary["signal_count"],
        "exposureCount": summary["exposure_count"],
        "windows": {
            str(window): {
                "sampleSize": data["sample_size"],
                "avgExcessReturn": data["avg_excess_return"],
                "hitRate": data["hit_rate"],
                "avgMaxDrawdown": data["avg_max_drawdown"],
            }
            for window, data in summary["windows"].items()
        },
        "categories": [],
        "trends": [],
        "signals": [],
        "exposures": [],
    }

    for slug, windows in sorted(summary["category_windows"].items()):
        app_data["categories"].append(
            {
                "slug": slug,
                "label": CATEGORY_LABELS.get(slug, slug.replace("-", " ").title()),
                "windows": {
                    str(window): {
                        "excess": data["avg_excess_return"],
                        "hitRate": data["hit_rate"],
                        "samples": data["sample_size"],
                    }
                    for window, data in windows.items()
                },
            }
        )

    for slug, windows in sorted(summary["trend_windows"].items()):
        definition = definitions.get(slug)
        if not definition:
            continue
        app_data["trends"].append(
            {
                "slug": slug,
                "label": definition.keyword.title(),
                "category": definition.category,
                "benchmark": definition.benchmark_ticker,
                "thesis": definition.thesis,
                "why": WHY_BY_TREND.get(slug, "This family is still under review."),
                "windows": {
                    str(window): {
                        "excess": data["avg_excess_return"],
                        "hitRate": data["hit_rate"],
                    }
                    for window, data in windows.items()
                },
            }
        )

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        signal_rows = connection.execute(
            """
            SELECT signal_date, keyword, category, score
            FROM trend_signals
            ORDER BY signal_date DESC, score DESC
            """
        ).fetchall()
        backtest_rows = connection.execute(
            """
            SELECT trend_slug, keyword, category, signal_date, ticker, role, rationale, windows_json
            FROM backtest_results
            ORDER BY signal_date DESC, trend_slug, ticker
            """
        ).fetchall()

    app_data["signals"] = [
        {
            "date": row["signal_date"],
            "trend": row["keyword"],
            "category": row["category"],
            "score": round(float(row["score"]), 1),
        }
        for row in signal_rows
    ]

    for row in backtest_rows:
        windows = json.loads(row["windows_json"])
        benchmark = next(iter(windows.values())).get("benchmark_ticker") if windows else None
        app_data["exposures"].append(
            {
                "date": row["signal_date"],
                "trend": row["keyword"],
                "category": row["category"],
                "benchmark": benchmark,
                "ticker": row["ticker"],
                "role": row["role"],
                "rationale": row["rationale"],
                "windows": {
                    str(window): data["excess_return"]
                    for window, data in windows.items()
                },
            }
        )

    return app_data


def replace_app_data(script_path: Path, app_data: dict[str, Any]) -> None:
    source = script_path.read_text(encoding="utf-8")
    replacement = "const APP_DATA = " + json.dumps(app_data, indent=2) + ";"
    updated = re.sub(
        r"const APP_DATA = \{.*?\};\n\nconst state =",
        replacement + "\n\nconst state =",
        source,
        count=1,
        flags=re.S,
    )
    if updated == source:
        raise RuntimeError(f"Could not find APP_DATA block in {script_path}")
    script_path.write_text(updated, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Trend Signal Lab data into the static app.")
    parser.add_argument("--summary-json", default="trend_research_app/output/backtest_summary_final.json")
    parser.add_argument("--db", default="trend_research_app/data/trends.sqlite3")
    parser.add_argument("--script", default="script.js")
    args = parser.parse_args()

    app_data = build_app_data(Path(args.summary_json), Path(args.db))
    replace_app_data(Path(args.script), app_data)
    print(f"Updated {Path(args.script).resolve()} with generatedAt={app_data['generatedAt']}")


if __name__ == "__main__":
    main()
