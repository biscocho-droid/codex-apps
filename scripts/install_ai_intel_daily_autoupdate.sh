#!/usr/bin/env bash
set -euo pipefail

project_root="/Users/dax/codex-test-1"
update_script="$project_root/scripts/update_ai_intel_daily.sh"
label="com.biscocho-droid.ai-intel-daily.autoupdate"
plist="$HOME/Library/LaunchAgents/$label.plist"
log="$project_root/logs/ai-intel-daily-launchd.log"

mkdir -p "$HOME/Library/LaunchAgents" "$project_root/logs"
chmod +x "$update_script"

cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$update_script</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$project_root</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>4</integer>
    <key>Minute</key>
    <integer>20</integer>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$log</string>
  <key>StandardErrorPath</key>
  <string>$log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$plist"
launchctl enable "gui/$(id -u)/$label"

echo "Installed AI Intel Daily auto-update agent: $label"
echo "It runs at 4:20 AM local time and on load."
echo "Log: $log"
