# Polygon Options Backtest

Static GitHub Pages app for Polygon-based options credit-spread backtest results.

This is separate from the Yahoo Finance options scanner. The current data file is
generated from Polygon option aggregate bars and lives at:

```text
data/polygon_backtest.json
```

Current limitations:

- Historical bid/ask quotes are not included.
- Historical open interest is not included.
- Fills use option close prices plus a conservative haircut.

