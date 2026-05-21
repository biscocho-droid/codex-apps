#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

project_root="/Users/dax/codex-test-1"
source_app="$project_root/trend-signal-lab-source"
pages_worktree="/Users/dax/codex-test-1-pages"
repo_root="/Users/dax/codex-test-1"
pages_url="https://biscocho-droid.github.io/codex-test-1/trend-signal-lab/"
log_dir="$project_root/trend_research_app/logs"
today="$(date '+%Y-%m-%d')"
log_file="$log_dir/update-$today.log"
lock_dir="$project_root/trend_research_app/.update.lock"
fetch_timeout_seconds="${TREND_FETCH_TIMEOUT_SECONDS:-420}"

mkdir -p "$log_dir"
exec > >(tee -a "$log_file") 2>&1

echo "=== Trend Signal Lab update started at $(date) ==="

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Another Trend Signal Lab update is already running."
  exit 0
fi
trap 'rmdir "$lock_dir"' EXIT

cd "$project_root"

echo "Fetching Google Trends data with ${fetch_timeout_seconds}s timeout."
set +e
python3 -m trend_research_app.cli fetch --start 2004-01-01 --end "$today" &
fetch_pid="$!"
elapsed=0
fetch_status=0
while kill -0 "$fetch_pid" 2>/dev/null; do
  if (( elapsed >= fetch_timeout_seconds )); then
    echo "Fetch timed out after ${fetch_timeout_seconds}s; continuing with stored trend series."
    kill "$fetch_pid" >/dev/null 2>&1 || true
    wait "$fetch_pid" >/dev/null 2>&1
    fetch_status=124
    break
  fi
  sleep 5
  elapsed=$((elapsed + 5))
done
if (( fetch_status == 0 )); then
  wait "$fetch_pid"
  fetch_status="$?"
fi
set -e
if (( fetch_status != 0 )); then
  echo "Fetch exited with status $fetch_status; continuing with stored trend series."
fi

python3 -m trend_research_app.cli detect
python3 -m trend_research_app.cli backtest \
  --report trend_research_app/output/backtest_report_final.html \
  --summary-json trend_research_app/output/backtest_summary_final.json \
  --basket-json trend_research_app/output/top3_basket_summary_final.json \
  --top-n 3
python3 -m trend_research_app.export_static_app \
  --summary-json trend_research_app/output/backtest_summary_final.json \
  --db trend_research_app/data/trends.sqlite3 \
  --script "$source_app/script.js"

if ! git -C "$pages_worktree" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$repo_root" fetch origin gh-pages
  git -C "$repo_root" worktree add -B gh-pages "$pages_worktree" origin/gh-pages
fi

if [[ -n "$(git -C "$pages_worktree" status --porcelain -- trend-signal-lab)" ]]; then
  echo "Committing pending generated Trend Signal Lab Pages changes before sync."
  git -C "$pages_worktree" add trend-signal-lab
  git -C "$pages_worktree" commit -m "Recover pending Trend Signal Lab update $today"
fi

git -C "$pages_worktree" fetch origin gh-pages
git -C "$pages_worktree" pull --rebase origin gh-pages

mkdir -p "$pages_worktree/trend-signal-lab/icons"
cp "$source_app/index.html" "$pages_worktree/trend-signal-lab/index.html"
cp "$source_app/styles.css" "$pages_worktree/trend-signal-lab/styles.css"
cp "$source_app/script.js" "$pages_worktree/trend-signal-lab/script.js"
cp "$source_app/manifest.json" "$pages_worktree/trend-signal-lab/manifest.json"
cp "$source_app/sw.js" "$pages_worktree/trend-signal-lab/sw.js"
cp "$source_app/icons/apple-touch-icon.png" "$pages_worktree/trend-signal-lab/icons/apple-touch-icon.png"
cp "$source_app/icons/portfolio-icon.svg" "$pages_worktree/trend-signal-lab/icons/portfolio-icon.svg"

python3 - <<'PY'
from pathlib import Path

manifest = Path("/Users/dax/codex-test-1-pages/trend-signal-lab/manifest.json")
text = manifest.read_text(encoding="utf-8")
text = text.replace('"name": "Portfolio Command Center"', '"name": "Trend Signal Lab"')
text = text.replace('"short_name": "Portfolio"', '"short_name": "Trend Lab"')
text = text.replace(
    '"description": "Personal portfolio dashboard for brokerage, 401(k), and combined holdings."',
    '"description": "Trend-first market research dashboard using Google Trends signals and stock exposure backtests."',
)
manifest.write_text(text, encoding="utf-8")

sw = Path("/Users/dax/codex-test-1-pages/trend-signal-lab/sw.js")
sw.write_text(sw.read_text(encoding="utf-8").replace("portfolio-command-center-v2", "trend-signal-lab-v1"), encoding="utf-8")
PY

node --check "$pages_worktree/trend-signal-lab/script.js"

cd "$pages_worktree"

if [[ -n "$(git status --porcelain)" ]]; then
  git add index.html trend-signal-lab
  git commit -m "Update Trend Signal Lab data $today"
  git push origin gh-pages
else
  echo "No Pages changes to commit."
fi

for attempt in {1..24}; do
  code="$(curl -L -s -o /tmp/trend-signal-lab-live.js -w '%{http_code}' "$pages_url/script.js?bust=$(date +%s)")"
  if [[ "$code" == "200" ]] && rg -q "$today|$(date -u '+%Y-%m-%d')" /tmp/trend-signal-lab-live.js; then
    echo "Live GitHub Pages verification passed on attempt $attempt."
    echo "$pages_url"
    echo "=== Trend Signal Lab update finished at $(date) ==="
    exit 0
  fi
  echo "Waiting for GitHub Pages refresh, attempt $attempt, HTTP $code."
  sleep 10
done

echo "GitHub Pages did not show today's timestamp before timeout."
exit 1
