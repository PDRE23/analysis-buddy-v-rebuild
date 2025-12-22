# ============================================================================
# Analysis Buddy V2 Health Check Script
# ============================================================================
# WARNING: This script is designed for MANUAL EXECUTION ONLY.
# DO NOT configure this script to run automatically via:
#   - Cursor tasks or startup hooks
#   - VSCode tasks.json
#   - File watchers or background processes
#   - Any auto-run mechanism
#
# This script is non-fatal and will never exit with error codes.
# All failures are logged but do not interrupt execution.
# ============================================================================

# Set error action preference to Continue (non-fatal)
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== Analysis Buddy V2 Health Check ===" -ForegroundColor Cyan
Write-Host ""

# Resolve absolute path to script directory
try {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (-not $scriptPath) {
        # Fallback: use current location if script path is not available
        $scriptPath = Get-Location
    }
    # Convert to absolute path
    $scriptPath = (Resolve-Path $scriptPath).Path
    $projectRoot = $scriptPath
} catch {
    Write-Host "[WARN] Could not resolve script path: $($_.Exception.Message)" -ForegroundColor Yellow
    $projectRoot = Get-Location
}

# Check if we're in the right directory, if not, try to find it
try {
    $packageJsonPath = Join-Path $projectRoot "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        # Try parent directory
        try {
            $parentDir = Split-Path -Parent $projectRoot
            $nestedPath = Join-Path $parentDir "analysis-buddy-v2"
            $nestedPackageJson = Join-Path $nestedPath "package.json"
            if (Test-Path $nestedPackageJson) {
                $projectRoot = (Resolve-Path $nestedPath).Path
                Write-Host "[INFO] Auto-detected project root: $projectRoot" -ForegroundColor Yellow
                Set-Location $projectRoot
            } else {
                Write-Host "[WARN] Cannot find project root (package.json)" -ForegroundColor Yellow
                Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Gray
                Write-Host "   Please run this script from the project root directory" -ForegroundColor Gray
                Write-Host ""
            }
        } catch {
            Write-Host "[WARN] Could not locate project root: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Gray
        }
    } else {
        Set-Location $projectRoot
    }
} catch {
    Write-Host "[WARN] Error during directory detection: $($_.Exception.Message)" -ForegroundColor Yellow
}

try {
    Write-Host "[INFO] Project directory: $(Get-Location)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[WARN] Could not display current directory" -ForegroundColor Yellow
}

# Check package.json exists
try {
    $packageJsonPath = Join-Path (Get-Location) "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Write-Host "[WARN] Project structure: Missing package.json" -ForegroundColor Yellow
        Write-Host "   Make sure you're in the project root directory" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "[WARN] Could not check for package.json: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check Node version
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($nodeVersion -match "v22") {
            Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Node.js: $nodeVersion (Expected v22.x)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARN] Node.js: Not found or error" -ForegroundColor Yellow
        Write-Host "   Error: $nodeVersion" -ForegroundColor Gray
        Write-Host "   Please install Node.js v22.x" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARN] Node.js: Not found in PATH" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Gray
    Write-Host "   Please install Node.js v22.x and ensure it's in your PATH" -ForegroundColor Gray
}

# Check dependencies
try {
    $nodeModulesPath = Join-Path (Get-Location) "node_modules"
    if (Test-Path $nodeModulesPath) {
        Write-Host "[OK] Dependencies: Installed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Dependencies: Missing" -ForegroundColor Yellow
        Write-Host "   Run: npm install" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARN] Could not check dependencies: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for Supabase config
try {
    $envLocalPath = Join-Path (Get-Location) ".env.local"
    if (Test-Path $envLocalPath) {
        Write-Host "[WARN] Supabase: Configured (.env.local found)" -ForegroundColor Yellow
        Write-Host "   Note: If Supabase expired, remove .env.local to use local storage" -ForegroundColor Gray
    } else {
        Write-Host "[OK] Supabase: Not configured (using local storage)" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] Could not check for .env.local: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check if server is running
Write-Host ""
try {
    $serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction Continue
    if ($serverRunning) {
        Write-Host "[OK] Server running on port 3000" -ForegroundColor Green
        
        # Test health check API endpoint
        try {
            $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Continue
            if ($healthResponse) {
                Write-Host "[OK] Health API: Responding" -ForegroundColor Green
                Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Gray
                Write-Host "   Service: $($healthResponse.service)" -ForegroundColor Gray
                Write-Host "   Version: $($healthResponse.version)" -ForegroundColor Gray
                Write-Host "   Environment: $($healthResponse.environment)" -ForegroundColor Gray
                Write-Host "   Node: $($healthResponse.checks.node)" -ForegroundColor Gray
                Write-Host "   Platform: $($healthResponse.checks.platform)" -ForegroundColor Gray
                Write-Host "   Memory: $($healthResponse.checks.memory.used)/$($healthResponse.checks.memory.total) $($healthResponse.checks.memory.unit)" -ForegroundColor Gray
                if ($healthResponse.checks.supabase) {
                    Write-Host "   Supabase: $($healthResponse.checks.supabase)" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "[WARN] Health API: Not responding" -ForegroundColor Yellow
            Write-Host "   Endpoint: http://localhost:3000/api/health" -ForegroundColor Gray
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARN] Server not running on port 3000" -ForegroundColor Yellow
        Write-Host "   Run: npm run dev" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARN] Server not running on port 3000" -ForegroundColor Yellow
    Write-Host "   Run: npm run dev" -ForegroundColor Gray
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Health Check Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Open: http://localhost:3000" -ForegroundColor White
Write-Host "3. Test health endpoint: http://localhost:3000/api/health" -ForegroundColor White
Write-Host "4. Check browser console for errors" -ForegroundColor White
Write-Host ""

# Always exit with success code (0) - this script is non-fatal
exit 0
