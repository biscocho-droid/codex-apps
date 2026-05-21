# AI Beneficiary Stock Radar

Python MVP for a daily or weekly AI beneficiary stock early warning report.

It scans configurable public sources, detects AI-related ticker/company mentions,
stores evidence in SQLite, scores candidates, and generates an HTML report.

This is a research tool, not a buy/sell recommendation engine.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item config.example.yaml config.yaml
```

Edit `config.yaml` to change watchlists, tickers, keywords, RSS feeds, and SEC settings.

## Run

```powershell
python -m ai_stock_radar.cli run --config config.yaml
```

The report will be written to `reports/` and a concise console summary will print.

Skip free market-data enrichment if the endpoint is unavailable:

```powershell
python -m ai_stock_radar.cli run --config config.yaml --skip-market-data
```

Review the first stored signal for specific names:

```powershell
python -m ai_stock_radar.cli backtest --config config.yaml --tickers IREN NBIS MRVL AMD
```

On Windows, you can also use the included runner:

```powershell
.\scripts\run_radar.ps1
```

With configured Discord or Telegram webhooks:

```powershell
.\scripts\run_radar.ps1 -Notify
```

## Notifications

Edit `config.yaml`:

```yaml
notifications:
  enabled: true
  discord_webhook_url: "https://discord.com/api/webhooks/..."
  telegram_bot_token: ""
  telegram_chat_id: ""
```

Leave fields blank for services you do not want to use.

## Local Scheduling

The Codex automation already posts reports in this thread. For a local Windows backup,
create a Task Scheduler action that runs:

```text
powershell.exe
```

With arguments:

```text
-ExecutionPolicy Bypass -File "C:\Users\Alan\Documents\Codex\2026-05-11\i-want-to-create-some-sort\scripts\run_radar.ps1"
```

## Current MVP

- Configurable watchlist and candidate ticker list
- RSS/source collection
- SEC company submission collection for configured tickers
- Keyword and ticker detection
- Evidence storage in SQLite
- Basic AI beneficiary scoring
- Price momentum enrichment for early-vs-crowded labeling
- HTML report generation
- First-signal review command for stored evidence
- Optional Discord and Telegram notifications
- PowerShell runner for local scheduling

## Planned Next

- Earnings transcript language-shift analysis
- Financial validation
- Email/Telegram/Discord notifications
- X/Twitter monitoring when API access is available
- Backtesting mode against historical winners
