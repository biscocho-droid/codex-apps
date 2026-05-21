param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$lockPath = Join-Path $repoRoot ".git\autosync.lock"
$lock = $null

try {
    $lock = [System.IO.File]::Open($lockPath, "CreateNew", "Write", "None")

    git fetch origin

    $changes = git status --porcelain
    if ($changes) {
        if (-not $Message) {
            $Message = "Auto sync $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }

        git add -A
        git commit -m $Message
    } else {
        Write-Host "No local changes to commit."
    }

    git pull --rebase
    git push
} catch [System.IO.IOException] {
    Write-Host "Another sync is already running."
} finally {
    if ($lock) {
        $lock.Dispose()
        Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
    }
}
