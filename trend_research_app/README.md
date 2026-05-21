# Trend Research App

This package is the first working slice of a trend-first market research app.

It uses an event-based backtest loop:

1. Fetch weekly Google Trends series for a curated theme catalog.
2. Detect dated signal events from acceleration, z-score, and persistence thresholds.
3. Map each signal to beneficiary or risk tickers.
4. Measure forward stock returns versus `SPY` at `5d`, `20d`, `60d`, and `120d`.
5. Review aggregate hit rate and excess return in an HTML report.

## Why This Backtest Design

This is intentionally not a portfolio simulation first.

The first job is to answer a cleaner question:

`When a trend signal appears, do the mapped stocks outperform the market afterward?`

That avoids hiding weak signal quality inside position sizing, rebalancing, or portfolio construction choices.

## Commands

Initialize the database:

```bash
python3 -m trend_research_app.cli init
```

Fetch weekly Google Trends data:

```bash
python3 -m trend_research_app.cli fetch --start 2019-01-01
```

Detect trend signals:

```bash
python3 -m trend_research_app.cli detect
```

Run backtests and generate the HTML report:

```bash
python3 -m trend_research_app.cli backtest
```

Run the full pipeline in one command:

```bash
python3 -m trend_research_app.cli run --start 2019-01-01
```

## Notes

- `pytrends` is required for the live Google Trends fetch step.
- Price history is pulled from `yfinance`.
- The seed trend catalog is intentionally small and easy to inspect before scaling.
