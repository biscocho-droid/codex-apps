param(
    [switch]$Notify,
    [switch]$SkipMarketData
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

$env:PYTHONPATH = Join-Path $ProjectRoot "src"

$ArgsList = @("-m", "ai_stock_radar.cli", "run", "--config", "config.yaml")
if ($Notify) {
    $ArgsList += "--notify"
}
if ($SkipMarketData) {
    $ArgsList += "--skip-market-data"
}

python @ArgsList
