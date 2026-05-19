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
