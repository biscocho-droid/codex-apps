#!/usr/bin/env bash
set -euo pipefail

project_root="/Users/dax/codex-test-1"
update_script="$project_root/scripts/update_trend_signal_lab.sh"
label="com.biscocho-droid.trend-signal-lab.autoupdate"
plist="$HOME/Library/LaunchAgents/$label.plist"
log="$project_root/trend_research_app/logs/launchd.log"

mkdir -p "$HOME/Library/LaunchAgents" "$project_root/trend_research_app/logs"
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
    <integer>5</integer>
    <key>Minute</key>
    <integer>15</integer>
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

echo "Installed Trend Signal Lab auto-update agent: $label"
echo "It runs at 5:15 AM local time and on load."
echo "Log: $log"
