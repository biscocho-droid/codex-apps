# NVIDIA Deal Monitor

Static GitHub Pages app for monitoring official NVIDIA announcements and turning deal language into ticker research leads.

## Features

- Pulls NVIDIA Newsroom RSS feeds when browser access is available.
- Highlights partnership, investment, strategic agreement, AI cloud, AI factory, data center, and infrastructure terms.
- Detects common public-company tickers from official NVIDIA announcement text.
- Supports manual ticker additions inside the live monitor.
- Includes an editable historical performance tracker with local browser storage.
- Refreshes performance windows from Yahoo Finance adjusted close data when browser access is available.
- Shows a simple average-return chart from tracked performance data.

## Deploy

This app is self-contained in `index.html`. Copy the folder to the `gh-pages` worktree or serve it directly from GitHub Pages.

## Notes

Live RSS access can be blocked by browser CORS on static hosting. The app attempts direct NVIDIA fetches first, then a read-only CORS transport fallback, then built-in sample data.

This is an informational research tool, not a buy or sell signal.
