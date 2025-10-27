Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Analysis Buddy V2 Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "You are in the wrong directory." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Found package.json - starting dev server..." -ForegroundColor Green
Write-Host ""
Write-Host "The server will start at: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server when you're done." -ForegroundColor Yellow
Write-Host ""

npm run dev

