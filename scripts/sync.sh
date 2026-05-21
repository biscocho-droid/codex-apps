#!/usr/bin/env bash
set -euo pipefail

message="${1:-}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lock_dir="$repo_root/.git/autosync.lock"

cd "$repo_root"

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Another sync is already running."
  exit 0
fi
trap 'rmdir "$lock_dir"' EXIT

git fetch origin

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ -z "$message" ]]; then
    message="Auto sync $(date '+%Y-%m-%d %H:%M:%S')"
  fi

  git add -A
  git commit -m "$message"
else
  echo "No local changes to commit."
fi

git pull --rebase
git push
