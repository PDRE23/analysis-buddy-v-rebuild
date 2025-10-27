# Phase 1 Integration Review Script (PowerShell)
# Runs automated checks for code quality and build

Write-Host "🔍 Phase 1 Integration Review" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Step 1: TypeScript Type Check" -ForegroundColor Green
Write-Host "--------------------------------"
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript: No errors" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript: Errors found" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "✅ Step 2: ESLint Check" -ForegroundColor Green
Write-Host "----------------------"
npm run lint
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ESLint: No errors" -ForegroundColor Green
} else {
    Write-Host "⚠️  ESLint: Warnings found (review above)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ Step 3: Build Test" -ForegroundColor Green
Write-Host "--------------------"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build: Success" -ForegroundColor Green
} else {
    Write-Host "❌ Build: Failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "✅ Step 4: Bundle Size Check" -ForegroundColor Green
Write-Host "----------------------------"
if (Test-Path ".next\static\chunks") {
    $totalSize = (Get-ChildItem .next\static\chunks -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "📦 Total bundle size: $([math]::Round($totalSize, 2)) MB"
    
    Write-Host "📊 Largest chunks:"
    Get-ChildItem .next\static\chunks\*.js | 
        Sort-Object Length -Descending | 
        Select-Object -First 5 | 
        ForEach-Object { 
            $sizeMB = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  $($_.Name): $sizeMB MB"
        }
} else {
    Write-Host "⚠️  Bundle directory not found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ Step 5: Modified Files Check" -ForegroundColor Green
Write-Host "-------------------------------"
Write-Host "Files modified in Phase 1:"
Write-Host "  - src/components/deals/Dashboard.tsx"
Write-Host "  - src/components/LeaseAnalyzerApp.tsx"
Write-Host "  - src/components/ui/duplicate-dialog.tsx"
Write-Host "  - src/components/deals/DealDetailView.tsx"
Write-Host "  - src/components/deals/PipelineApp.tsx"
Write-Host ""

Write-Host "✅ Step 6: Dependencies Check" -ForegroundColor Green
Write-Host "-----------------------------"
$packageJson = Get-Content package.json | ConvertFrom-Json
$depCount = ($packageJson.dependencies | Get-Member -MemberType NoteProperty).Count
Write-Host "✅ Dependencies declared: $depCount packages"
Write-Host ""

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "🎉 Automated Review Complete!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review AUTOMATED_REVIEW_RESULTS.md for detailed analysis"
Write-Host "2. Go through PHASE_1_REVIEW_CHECKLIST.md manually"
Write-Host "3. Test in browser at http://localhost:3000"
Write-Host "4. Check console for any errors"
Write-Host "5. Decide: Polish or move to Phase 2?"
Write-Host ""

