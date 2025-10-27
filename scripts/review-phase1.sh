#!/bin/bash

# Phase 1 Integration Review Script
# Runs automated checks for code quality and build

echo "🔍 Phase 1 Integration Review"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in project root directory"
  exit 1
fi

echo "✅ Step 1: TypeScript Type Check"
echo "--------------------------------"
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ TypeScript: No errors"
else
  echo "❌ TypeScript: Errors found"
  exit 1
fi
echo ""

echo "✅ Step 2: ESLint Check"
echo "----------------------"
npm run lint --silent
if [ $? -eq 0 ]; then
  echo "✅ ESLint: No errors"
else
  echo "⚠️  ESLint: Warnings found (review above)"
fi
echo ""

echo "✅ Step 3: Build Test"
echo "--------------------"
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build: Success"
else
  echo "❌ Build: Failed"
  exit 1
fi
echo ""

echo "✅ Step 4: Bundle Size Check"
echo "----------------------------"
if [ -d ".next/static/chunks" ]; then
  TOTAL_SIZE=$(du -sh .next/static/chunks | cut -f1)
  echo "📦 Total bundle size: $TOTAL_SIZE"
  
  # List largest chunks
  echo "📊 Largest chunks:"
  du -h .next/static/chunks/*.js 2>/dev/null | sort -hr | head -5
else
  echo "⚠️  Bundle directory not found"
fi
echo ""

echo "✅ Step 5: Modified Files Check"
echo "-------------------------------"
echo "Files modified in Phase 1:"
echo "  - src/components/deals/Dashboard.tsx"
echo "  - src/components/LeaseAnalyzerApp.tsx"
echo "  - src/components/ui/duplicate-dialog.tsx"
echo "  - src/components/deals/DealDetailView.tsx"
echo "  - src/components/deals/PipelineApp.tsx"
echo ""

echo "✅ Step 6: Dependencies Check"
echo "-----------------------------"
# Check for any new dependencies that might have been added
DEPS_COUNT=$(cat package.json | grep -c '"dependencies"')
if [ $DEPS_COUNT -gt 0 ]; then
  echo "✅ Dependencies declared: $(npm ls --depth=0 2>/dev/null | wc -l) packages"
else
  echo "⚠️  Could not read dependencies"
fi
echo ""

echo "=============================="
echo "🎉 Automated Review Complete!"
echo "=============================="
echo ""
echo "📋 Next Steps:"
echo "1. Review AUTOMATED_REVIEW_RESULTS.md for detailed analysis"
echo "2. Go through PHASE_1_REVIEW_CHECKLIST.md manually"
echo "3. Test in browser at http://localhost:3000"
echo "4. Check console for any errors"
echo "5. Decide: Polish or move to Phase 2?"
echo ""

