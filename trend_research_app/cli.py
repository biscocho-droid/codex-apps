from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import List

from .backtesting import run_backtests, summarize_backtests, summarize_top_basket_backtests
from .collectors import TrendsCollectorError, collect_weekly_points
from .db import TrendResearchDatabase
from .experiments import default_experiment_configs, run_experiments
from .reporting import write_html_report
from .seed import default_trends
from .signals import detect_signals


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Trend-first research app CLI.")
    parser.add_argument("--db", default="trend_research_app/data/trends.sqlite3", help="SQLite path")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize the database")
    init_parser.set_defaults(func=initialize_db)

    fetch_parser = subparsers.add_parser("fetch", help="Fetch Google Trends series for the default trend catalog")
    fetch_parser.add_argument("--start", default="2019-01-01", help="Start date YYYY-MM-DD")
    fetch_parser.add_argument("--end", default=date.today().isoformat(), help="End date YYYY-MM-DD")
    fetch_parser.set_defaults(func=fetch_default_trends)

    signal_parser = subparsers.add_parser("detect", help="Detect trend signals from stored series")
    signal_parser.set_defaults(func=detect_default_signals)

    optimize_parser = subparsers.add_parser("optimize", help="Sweep signal criteria and universe variants over stored trend history")
    optimize_parser.add_argument("--output-json", default="trend_research_app/output/optimization_results.json", help="Optimization results JSON path")
    optimize_parser.add_argument("--top-k", type=int, default=10, help="Number of top experiment results to save")
    optimize_parser.set_defaults(func=optimize_default_signals)

    backtest_parser = subparsers.add_parser("backtest", help="Run event-based backtests for stored signals")
    backtest_parser.add_argument("--report", default="trend_research_app/output/backtest_report.html", help="HTML report path")
    backtest_parser.add_argument("--summary-json", default="trend_research_app/output/backtest_summary.json", help="Summary JSON path")
    backtest_parser.add_argument("--basket-json", default="trend_research_app/output/top3_basket_summary.json", help="Top-N basket summary JSON path")
    backtest_parser.add_argument("--top-n", type=int, default=3, help="Number of beneficiary candidates to include in basket tests")
    backtest_parser.set_defaults(func=run_default_backtests)

    run_parser = subparsers.add_parser("run", help="Run fetch, detect, and backtest in one pass")
    run_parser.add_argument("--start", default="2019-01-01", help="Start date YYYY-MM-DD")
    run_parser.add_argument("--end", default=date.today().isoformat(), help="End date YYYY-MM-DD")
    run_parser.add_argument("--report", default="trend_research_app/output/backtest_report.html", help="HTML report path")
    run_parser.add_argument("--summary-json", default="trend_research_app/output/backtest_summary.json", help="Summary JSON path")
    run_parser.add_argument("--basket-json", default="trend_research_app/output/top3_basket_summary.json", help="Top-N basket summary JSON path")
    run_parser.add_argument("--top-n", type=int, default=3, help="Number of beneficiary candidates to include in basket tests")
    run_parser.set_defaults(func=run_pipeline)
    return parser


def initialize_db(args: argparse.Namespace) -> None:
    db = TrendResearchDatabase(Path(args.db))
    db.initialize()
    print("Initialized database at {}".format(Path(args.db).resolve()))


def fetch_default_trends(args: argparse.Namespace) -> None:
    db = TrendResearchDatabase(Path(args.db))
    db.initialize()
    start_date = date.fromisoformat(args.start)
    end_date = date.fromisoformat(args.end)
    failures = []
    for definition in default_trends():
        try:
            points = collect_weekly_points(definition, start_date=start_date, end_date=end_date)
        except Exception as exc:
            failures.append((definition.keyword, str(exc)))
            print("Fetch failed for '{}': {}".format(definition.keyword, exc))
            continue
        db.replace_trend_points(definition.slug, points)
        print("Fetched {} weekly points for '{}'.".format(len(points), definition.keyword))
    if failures:
        print("Completed with {} fetch failure(s).".format(len(failures)))


def detect_default_signals(args: argparse.Namespace) -> None:
    db = TrendResearchDatabase(Path(args.db))
    db.initialize()
    signals = []
    for definition in default_trends():
        points = db.list_trend_points(definition.slug)
        trend_signals = detect_signals(definition, points)
        signals.extend(trend_signals)
        print("Detected {} signal(s) for '{}'.".format(len(trend_signals), definition.keyword))
    db.replace_signals(signals)
    print("Stored {} total signals.".format(len(signals)))


def optimize_default_signals(args: argparse.Namespace) -> None:
    db = TrendResearchDatabase(Path(args.db))
    db.initialize()
    definitions = default_trends()
    series_map = {definition.slug: db.list_trend_points(definition.slug) for definition in definitions}
    results = run_experiments(definitions, series_map, default_experiment_configs())
    if not results:
        raise SystemExit("No optimization results were produced. Fetch trend data first.")

    top_results = results[: args.top_k]
    output = []
    for result in top_results:
        one_year = result.basket_summary["windows"]["252"]
        two_year = result.basket_summary["windows"]["504"]
        three_year = result.basket_summary["windows"]["756"]
        output.append(
            {
                "name": result.config.name,
                "score": result.score,
                "signal_count": result.signal_count,
                "basket_count": result.basket_count,
                "parameters": {
                    "min_level": result.config.min_level,
                    "min_accel_ratio": result.config.min_accel_ratio,
                    "min_zscore": result.config.min_zscore,
                    "min_persistence": result.config.min_persistence,
                    "baseline_floor": result.config.baseline_floor,
                    "min_score": result.config.min_score,
                    "min_peak_ratio": result.config.min_peak_ratio,
                    "recent_window": result.config.recent_window,
                    "baseline_window": result.config.baseline_window,
                    "prior_peak_window": result.config.prior_peak_window,
                    "cooldown_periods": result.config.cooldown_periods,
                    "excluded_slugs": sorted(result.config.excluded_slugs),
                },
                "one_year": one_year,
                "two_year": two_year,
                "three_year": three_year,
            }
        )

    output_path = Path(args.output_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    best = output[0]
    print("Best experiment: {}".format(best["name"]))
    print("Signals: {}, baskets: {}, score: {:.2f}".format(best["signal_count"], best["basket_count"], best["score"]))
    print("1y avg excess={}, hit_rate={}".format(_fmt(best["one_year"]["avg_excess_return"]), _fmt(best["one_year"]["hit_rate"])))
    print("2y avg excess={}, hit_rate={}".format(_fmt(best["two_year"]["avg_excess_return"]), _fmt(best["two_year"]["hit_rate"])))
    print("3y avg excess={}, hit_rate={}".format(_fmt(best["three_year"]["avg_excess_return"]), _fmt(best["three_year"]["hit_rate"])))
    print("Saved optimization results: {}".format(output_path.resolve()))


def run_default_backtests(args: argparse.Namespace) -> None:
    db = TrendResearchDatabase(Path(args.db))
    db.initialize()
    definitions = default_trends()
    signals = db.list_signals()
    if not signals:
        raise SystemExit("No stored signals exist. Run 'fetch' and 'detect' first.")

    rows = run_backtests(definitions=definitions, signals=signals)
    summary = summarize_backtests(rows)
    basket_summary = summarize_top_basket_backtests(rows, top_n=args.top_n)
    db.replace_backtests(rows)

    report_path = Path(args.report)
    summary_path = Path(args.summary_json)
    basket_path = Path(args.basket_json)
    write_html_report(report_path, signals, rows, summary)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(asdict(summary), indent=2, default=str), encoding="utf-8")
    basket_path.parent.mkdir(parents=True, exist_ok=True)
    basket_path.write_text(json.dumps(basket_summary, indent=2, default=str), encoding="utf-8")

    print("Backtested {} exposure rows across {} signals.".format(len(rows), summary.signal_count))
    for trading_days, window in summary.windows.items():
        print(
            "{}d: samples={}, avg_excess={}, hit_rate={}".format(
                trading_days,
                window.sample_size,
                _fmt(window.avg_excess_return),
                _fmt(window.hit_rate),
            )
        )
    print("Top-{} beneficiary basket:".format(args.top_n))
    for trading_days, window in basket_summary["windows"].items():
        print(
            "{}d: baskets={}, avg_excess={}, hit_rate={}".format(
                trading_days,
                window["sample_size"],
                _fmt(window["avg_excess_return"]),
                _fmt(window["hit_rate"]),
            )
        )
    print("Saved report: {}".format(report_path.resolve()))
    print("Saved summary: {}".format(summary_path.resolve()))
    print("Saved basket summary: {}".format(basket_path.resolve()))


def run_pipeline(args: argparse.Namespace) -> None:
    initialize_db(args)
    fetch_default_trends(args)
    detect_default_signals(args)
    run_default_backtests(args)


def _fmt(value):
    if value is None:
        return "n/a"
    return "{:.2f}%".format(value * 100.0)


def main(argv: List[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except TrendsCollectorError as exc:
        raise SystemExit(str(exc))


if __name__ == "__main__":
    main()
