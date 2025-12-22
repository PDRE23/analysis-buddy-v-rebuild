# 🚀 Analysis Buddy V2 - Startup & Debugging Protocol

## 📋 Pre-Startup Checklist (Every Time You Start Working)

### 1. **Environment Check**
```powershell
# Check Node.js version (should be 22.x)
node --version

# Check npm version
npm --version

# Navigate to project directory
cd "C:\Users\peyto\Projects\Analysis Buddy V2\analysis-buddy-v2"
```

### 2. **Dependencies Check**
```powershell
# Check if node_modules exists and is up to date
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}
```

### 3. **Environment Variables Check**
```powershell
# Check if .env.local exists (optional - only if using Supabase)
if (Test-Path ".env.local") {
    Write-Host "Found .env.local - Supabase may be configured" -ForegroundColor Green
} else {
    Write-Host "No .env.local - Using local storage (OK)" -ForegroundColor Yellow
}
```

---

## 🏃 Startup Procedure

### Step 1: Start the Dev Server
```powershell
# Option A: Use the PowerShell script (recommended)
.\START-SERVER.ps1

# Option B: Use npm directly
npm run dev

# Option C: Use webpack if Turbopack has issues
npm run dev:webpack
```

### Step 2: Verify Server Started
- ✅ Terminal shows: `▲ Next.js 15.5.4`
- ✅ Terminal shows: `- Local: http://localhost:3000`
- ✅ Terminal shows: `✓ Ready in X.Xs`
- ✅ No error messages in terminal

### Step 3: Open Browser
- Navigate to: `http://localhost:3000`
- Should see the B² landing page

---

## 🧪 Testing & Debugging Steps

### 1. **Run Linter**
```powershell
npm run lint
```
**Expected:** No errors (warnings are OK)

### 2. **Run Tests**
```powershell
# Run all tests once
npm test

# Run tests in watch mode (auto-reruns on changes)
npm run test:watch
```
**Expected:** All tests pass ✅

### 3. **Browser Console Check**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Check for:
   - ❌ Red errors
   - ⚠️ Yellow warnings (usually OK)
   - ✅ Info messages about Supabase/local storage

### 4. **Network Tab Check**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Refresh page (F5)
4. Check for:
   - ❌ Failed requests (red)
   - ✅ Successful requests (green)
   - ⚠️ Supabase calls failing (OK if Supabase not configured)

### 5. **Application Flow Test**

#### A. **Landing Page**
- [ ] Page loads without errors
- [ ] "Get Started" button works
- [ ] "Log In" button works
- [ ] Footer shows "Created by Peyton Dowd"

#### B. **Authentication**
- [ ] Can create new account (Sign Up)
- [ ] Can sign in with created account
- [ ] Redirects to `/app` after login
- [ ] Can sign out

#### C. **Main Application**
- [ ] Pipeline tab loads
- [ ] Can see deals (demo data or empty state)
- [ ] Can create new deal
- [ ] Can edit deal
- [ ] Analyses tab loads
- [ ] Can create new analysis
- [ ] Can navigate between tabs

#### D. **Data Persistence**
- [ ] Create a deal → refresh page → deal still exists
- [ ] Create an analysis → refresh page → analysis still exists
- [ ] Sign out → sign in → data persists

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch" Error
**Cause:** Supabase configured but expired/invalid
**Solution:**
1. Check browser console for exact error
2. Remove/comment out `.env.local` if exists
3. Restart dev server
4. App will use local storage instead

### Issue: "Invalid credentials"
**Cause:** Trying to sign in without creating account
**Solution:**
1. Go to Sign Up page (`/signup`)
2. Create account first
3. Then sign in

### Issue: Port 3000 already in use
**Solution:**
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Or use different port
npm run dev -- -p 3001
# Then open http://localhost:3001
```

### Issue: Module not found errors
**Solution:**
```powershell
# Clear cache and reinstall
rm -r node_modules
rm package-lock.json
npm install
```

### Issue: TypeScript errors
**Solution:**
```powershell
# Check TypeScript compilation
npx tsc --noEmit

# Fix auto-fixable issues
npm run lint -- --fix
```

### Issue: Stale data in browser
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Or clear localStorage:
   ```javascript
   // In browser console:
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

---

## 📊 Health Check Script

**IMPORTANT: Manual Execution Only**

The health check script (`.\health-check.ps1`) is designed for **manual execution only**. 
It should NOT be configured to run automatically via:
- Cursor tasks or startup hooks
- VSCode tasks.json
- File watchers or background processes
- Any auto-run mechanism

**To run manually:**
```powershell
.\health-check.ps1
```

The script is non-fatal and will always exit successfully, logging warnings for any issues found.

---

## 📝 Daily Workflow Summary

**Every time you start working:**

1. ✅ Check Node.js version
2. ✅ Navigate to project directory  
3. ✅ Start dev server (`npm run dev`)
4. ✅ Verify server started successfully
5. ✅ Open browser to `http://localhost:3000`
6. ✅ Check browser console for errors
7. ✅ Test basic functionality (sign in, create deal)
8. ✅ Run linter (`npm run lint`)
9. ✅ Run tests (`npm test`)

**Before committing code:**

1. ✅ Run linter
2. ✅ Run tests
3. ✅ Check browser console for errors
4. ✅ Test critical user flows
5. ✅ Verify data persistence

---

## 🎯 Quick Reference Commands

```powershell
# Start dev server
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Start production server
npm start

# Check TypeScript
npx tsc --noEmit

# Clear Next.js cache
rm -r .next
```

---

**Last Updated:** 2025-01-XX

