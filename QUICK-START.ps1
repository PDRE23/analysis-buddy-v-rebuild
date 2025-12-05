# Quick Start Script for Analysis Buddy V2
Write-Host "🚀 Starting Analysis Buddy V2..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project
$projectPath = "C:\Users\peyto\Projects\Analysis Buddy V2\analysis-buddy-v2"
Set-Location $projectPath
Write-Host "📁 Project: $(Get-Location)" -ForegroundColor Green

# Check Node version
$nodeVersion = node --version
Write-Host "📦 Node.js: $nodeVersion" -ForegroundColor Green

# Check dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start dev server
Write-Host ""
Write-Host "🌐 Starting dev server..." -ForegroundColor Cyan
Write-Host "Go to: http://localhost:3000" -ForegroundColor Green
Write-Host ""
npm run dev

