# Credit Spread Scanner

Static mobile dashboard for ranked put credit spread candidates.

This first version scans the configured universe in `scanner.py`:

```text
SPY, QQQ, IWM, AAPL, AMZN, MSFT, NVDA, TSLA
```

That list is configurable; it is not a technical limit.

Open locally:

```bash
python3 -m http.server 8080 --directory options-credit-scanner
```

Then visit `http://localhost:8080`.

The dashboard reads `data/latest.json`. The future scanner/GitHub Actions workflow should overwrite that file after each scheduled scan.

Generate a live scan:

```bash
python3 options-credit-scanner/scanner.py
```

The scanner output includes broker-check fields such as suggested limit credit,
minimum acceptable credit, breakeven, max profit/loss, per-leg bid/ask/mid,
open interest, volume, and the delta source.

Each candidate also includes a nearby spread ladder for comparable $5-wide
spreads with the same ticker and expiration.
