Write-Host ""
Write-Host "=== Analysis Buddy V2 Health Check ===" -ForegroundColor Cyan
Write-Host ""

# Check Node version
$nodeVersion = node --version
if ($nodeVersion -match "v22") {
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  Node.js: $nodeVersion (Expected v22.x)" -ForegroundColor Yellow
}

# Check if server is running
try {
    $serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($serverRunning) {
        Write-Host "✅ Server running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "❌ Server not running on port 3000" -ForegroundColor Red
        Write-Host "   Run: npm run dev" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Server not running on port 3000" -ForegroundColor Red
    Write-Host "   Run: npm run dev" -ForegroundColor Yellow
}

# Check dependencies
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencies: Installed" -ForegroundColor Green
} else {
    Write-Host "❌ Dependencies: Missing" -ForegroundColor Red
    Write-Host "   Run: npm install" -ForegroundColor Yellow
}

# Check for Supabase config
if (Test-Path ".env.local") {
    Write-Host "⚠️  Supabase: Configured (.env.local found)" -ForegroundColor Yellow
    Write-Host "   Note: If Supabase expired, remove .env.local to use local storage" -ForegroundColor Yellow
} else {
    Write-Host "✅ Supabase: Not configured (using local storage)" -ForegroundColor Green
}

# Check package.json exists
if (Test-Path "package.json") {
    Write-Host "✅ Project structure: OK" -ForegroundColor Green
} else {
    Write-Host "❌ Project structure: Missing package.json" -ForegroundColor Red
    Write-Host "   Make sure you're in the project root directory" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Health Check Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Open: http://localhost:3000" -ForegroundColor White
Write-Host "3. Check browser console for errors" -ForegroundColor White
Write-Host ""

