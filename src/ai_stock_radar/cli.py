from __future__ import annotations

import argparse
import logging
from pathlib import Path

from .backtesting import backtest_from_evidence, format_backtest
from .collectors import RSSCollector, SECCollector
from .config import load_config
from .db import RadarDatabase
from .detection import detect_evidence
from .enrichment import enrich_with_momentum
from .market_data import YahooChartClient
from .notifications import send_notifications
from .reporting import console_summary, write_html_report


def main() -> None:
    parser = argparse.ArgumentParser(description="AI Beneficiary Stock Radar")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Collect sources and generate report")
    run_parser.add_argument("--config", default="config.yaml", help="Path to YAML config")
    run_parser.add_argument("--log-level", default="INFO", help="Python logging level")
    run_parser.add_argument("--skip-market-data", action="store_true", help="Skip price momentum enrichment")
    run_parser.add_argument("--notify", action="store_true", help="Send configured Discord/Telegram notifications")

    backtest_parser = subparsers.add_parser("backtest", help="Review first stored signal for tickers")
    backtest_parser.add_argument("--config", default="config.yaml", help="Path to YAML config")
    backtest_parser.add_argument("--tickers", nargs="+", required=True, help="Tickers to review")
    backtest_parser.add_argument("--log-level", default="INFO", help="Python logging level")

    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper()), format="%(levelname)s %(message)s")

    if args.command == "run":
        run(Path(args.config), skip_market_data=args.skip_market_data, notify=args.notify)
    elif args.command == "backtest":
        backtest(Path(args.config), args.tickers)


def run(config_path: Path, skip_market_data: bool = False, notify: bool = False) -> None:
    config = load_config(config_path)
    db = RadarDatabase(config.database_path)
    db.initialize()

    collectors = [RSSCollector(config), SECCollector(config)]
    inserted = 0
    seen = 0

    market_client = None if skip_market_data else YahooChartClient(config.user_agent)

    for collector in collectors:
        for item in collector.collect():
            seen += 1
            detected = detect_evidence(item, config)
            if detected and market_client:
                detected = enrich_with_momentum(detected, market_client)
            for evidence in detected:
                if db.insert_evidence(evidence):
                    inserted += 1

    recent = db.recent_evidence(limit=250)
    if recent and market_client:
        recent = enrich_with_momentum(recent, market_client)
    report_path = write_html_report(recent, config.report_dir)
    if notify:
        send_notifications(config.notifications, recent, report_path)

    print(f"Scanned source items: {seen}")
    print(f"New evidence rows: {inserted}")
    print(f"Report: {report_path}")
    print()
    print(console_summary(recent))


def backtest(config_path: Path, tickers: list[str]) -> None:
    config = load_config(config_path)
    db = RadarDatabase(config.database_path)
    db.initialize()
    rows = backtest_from_evidence(db, YahooChartClient(config.user_agent), tickers)
    print(format_backtest(rows))


if __name__ == "__main__":
    main()
