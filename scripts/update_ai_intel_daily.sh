#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

project_root="/Users/dax/codex-test-1"
pages_worktree="/Users/dax/codex-test-1-pages"
repo_root="/Users/dax/codex-test-1"
pages_url="https://biscocho-droid.github.io/codex-test-1/ai-intel-daily/"
log_dir="$project_root/logs"
today="$(TZ=America/Chicago date '+%Y-%m-%d')"
log_file="$log_dir/ai-intel-daily-$today.log"
lock_dir="$project_root/.ai-intel-daily-update.lock"

mkdir -p "$log_dir"
exec > >(tee -a "$log_file") 2>&1

echo "=== AI Intel Daily update started at $(date) ==="

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Another AI Intel Daily update is already running."
  exit 0
fi
trap 'rmdir "$lock_dir"' EXIT

if ! git -C "$pages_worktree" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$repo_root" fetch origin gh-pages
  git -C "$repo_root" worktree add -B gh-pages "$pages_worktree" origin/gh-pages
fi

if [[ -n "$(git -C "$pages_worktree" status --porcelain -- ai-intel-daily)" ]]; then
  echo "Committing pending generated AI Intel Daily Pages changes before sync."
  git -C "$pages_worktree" add ai-intel-daily
  git -C "$pages_worktree" commit -m "Recover pending AI Intel Daily update $today"
fi

git -C "$pages_worktree" fetch origin gh-pages
git -C "$pages_worktree" pull --rebase origin gh-pages

cd "$project_root"
python3 scripts/generate_ai_intel_feed.py \
  --output "$pages_worktree/ai-intel-daily/data/ai-feed.json" \
  --archive-dir "$pages_worktree/ai-intel-daily/archive" \
  --include-failures

python3 - "$pages_worktree/ai-intel-daily/data/ai-feed.json" "$today" <<'PY'
import json
import sys
from datetime import datetime
from pathlib import Path

feed = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
generated = datetime.fromisoformat(feed["generatedAt"].replace("Z", "+00:00")).date().isoformat()
if generated != sys.argv[2]:
    raise SystemExit(f"generatedAt date {generated} did not match expected {sys.argv[2]}")
if feed.get("itemCount", 0) <= 0:
    raise SystemExit("AI Intel Daily feed has no items")
print(f"Generated feed date verified: {generated}; items={feed.get('itemCount')}; sources={feed.get('sourceCount')}")
PY

cd "$pages_worktree"

if [[ -n "$(git status --porcelain -- ai-intel-daily)" ]]; then
  git add ai-intel-daily/data/ai-feed.json ai-intel-daily/archive
  git commit -m "Update AI Intel Daily feed $today"
  git push origin gh-pages
else
  echo "No AI Intel Daily Pages changes to commit."
fi

for attempt in {1..24}; do
  code="$(curl -L -s -o /tmp/ai-intel-daily-live.json -w '%{http_code}' "$pages_url/data/ai-feed.json?bust=$(date +%s)")"
  if [[ "$code" == "200" ]]; then
    if python3 - "$today" /tmp/ai-intel-daily-live.json <<'PY'
import json
import sys
from datetime import datetime
from pathlib import Path

feed = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
generated = datetime.fromisoformat(feed["generatedAt"].replace("Z", "+00:00")).date().isoformat()
if generated != sys.argv[1]:
    raise SystemExit(1)
if feed.get("itemCount", 0) <= 0:
    raise SystemExit(1)
PY
    then
      echo "Live GitHub Pages verification passed on attempt $attempt."
      echo "$pages_url"
      echo "=== AI Intel Daily update finished at $(date) ==="
      exit 0
    fi
  fi
  echo "Waiting for GitHub Pages refresh, attempt $attempt, HTTP $code."
  sleep 10
done

echo "GitHub Pages did not show today's AI Intel Daily feed before timeout."
exit 1
