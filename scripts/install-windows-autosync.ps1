$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$syncScript = Join-Path $PSScriptRoot "sync.ps1"
$taskName = "Codex Test 1 Auto Sync"
$logPath = Join-Path $repoRoot ".git\autosync-windows.log"

$taskCommand = "powershell.exe"
$taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`" *> `"$logPath`""

schtasks.exe /Create /F /TN $taskName /SC MINUTE /MO 15 /TR "`"$taskCommand`" $taskArgs" | Out-Host

Write-Host "Installed Windows auto sync task: $taskName"
Write-Host "It runs every 15 minutes."
Write-Host "Log: $logPath"
