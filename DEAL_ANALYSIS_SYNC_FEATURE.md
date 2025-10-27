# Deal-Analysis Bidirectional Sync Feature

## Overview

This feature enables seamless data synchronization between Deals (in the Pipeline tab) and Lease Analyses (in the Analyses tab). Users can link analyses to deals and keep shared data synchronized.

## ✨ What's New

### 1. Link Analyses to Deals
- **From Analysis:** Click "Link to Deal" button in the analysis workspace
- **From Deal:** Create new analysis from deal detail view - auto-links

### 2. Sync Now Button
- Manual sync button to update data between linked deal and analysis
- Syncs: client name, address, RSF, lease term, and commission values

### 3. Auto-Populated Fields
When you create an analysis from a deal (or vice versa), these fields auto-populate:
- Client/Tenant Name
- Property Address, City, State
- Rentable Square Feet (RSF)
- Lease Term
- Expected/Commencement Dates

### 4. Commission Tracking
- When you add a commission structure to an analysis
- The total commission automatically syncs to the deal's "Estimated Value"
- Multiple analyses on one deal = combined commission total

## 🎯 Usage

### Creating Analysis from Deal

1. Go to **Pipeline Tab**
2. Click on any deal
3. Navigate to **Analyses Tab**
4. Click **"+ New Analysis"**
5. ✅ Analysis is automatically created with deal information pre-filled
6. ✅ Analysis is automatically linked to the deal

### Linking Existing Analysis to Deal

1. Go to **Analyses Tab**
2. Open any analysis
3. Click **"Link to Deal"** button in the toolbar
4. Select an existing deal OR create a new deal
5. ✅ Selected deal is now linked

### Creating Deal from Analysis

1. Go to **Analyses Tab**
2. Open any analysis  
3. Click **"Link to Deal"** dropdown
4. Click **"Create New Deal from Analysis"**
5. ✅ New deal is created in Pipeline with analysis data
6. ✅ Deal and analysis are automatically linked

### Syncing Data

**Manual Sync:**
1. Open a linked analysis
2. Click the **"Sync"** button next to the linked deal badge
3. ✅ Data syncs: Deal → Analysis (or Analysis → Deal based on latest changes)

**What Syncs:**
- **Deal → Analysis:**
  - Client Name → Tenant Name
  - Property Address → Market
  - RSF → RSF
  - Lease Term → Key Dates
  
- **Analysis → Deal:**
  - Tenant Name → Client Name
  - Market → Property Address
  - RSF → RSF
  - Commission Structure → Estimated Value

### Unlinking

1. Open linked analysis
2. Click **X** button next to linked deal badge
3. ✅ Analysis unlinked (data remains in both places)

## 📁 Files Created

| File | Purpose |
|------|---------|
| `src/lib/dealAnalysisSync.ts` | Core sync logic and utilities |
| `src/components/ui/deal-link-dropdown.tsx` | UI component for linking/unlinking |

## 🔧 Files Modified

| File | Changes |
|------|---------|
| `src/components/LeaseAnalyzerApp.tsx` | Added deal state, handlers, and link dropdown |
| *(Deal components already supported linking)* | - |

## 🎨 UI Elements

### In Analysis Workspace:
- **"Link to Deal"** button (when not linked)
- **"Linked: [Deal Name]"** badge (when linked)
- **"Sync"** button (when linked)
- **X button** to unlink

### In Deal Detail View:
- **"+ New Analysis"** button (already existed, now auto-links)
- Shows linked analyses with commission values

## 💡 Example Workflows

### Scenario 1: Broker Working on Multiple Proposals
1. Create deal: "Acme Corp - 10,000 RSF Office"
2. Create 3 analyses from deal:
   - "Landlord Proposal v1"
   - "Tenant Counter v1"
   - "Landlord Final"
3. All analyses auto-linked to deal
4. Add commission structures to each
5. Deal's "Estimated Value" shows combined commission

### Scenario 2: Converting Analysis to Deal
1. Create standalone analysis: "Tech Startup - 5,000 RSF"
2. Click "Link to Deal" → "Create New Deal"
3. Deal appears in Pipeline with analysis data
4. Continue managing deal through pipeline stages

### Scenario 3: Updating Deal Information
1. Client changes requirements: 12,000 RSF instead of 10,000
2. Update RSF in deal
3. Open linked analyses
4. Click "Sync" button
5. All analyses update to 12,000 RSF

## ⚠️ Important Notes

- **Manual Sync Required:** Changes don't auto-sync until you click "Sync" button
- **Commission Direction:** Commission always flows Analysis → Deal (not editable in deal directly)
- **Multiple Analyses:** A deal can have multiple linked analyses
- **One Deal Per Analysis:** Each analysis links to only one deal (for now)
- **Data Persistence:** All sync data saved to localStorage

## 🚀 Future Enhancements

- [ ] Auto-sync option (sync automatically on save)
- [ ] Conflict resolution (when deal and analysis both changed)
- [ ] Sync history/log
- [ ] Selective field sync (choose which fields to sync)
- [ ] Link multiple deals to one analysis (expansion scenarios)

## 🐛 Troubleshooting

**Issue:** "Link to Deal" button not appearing
- **Solution:** Make sure you're in the analysis workspace (opened a proposal)

**Issue:** Sync button does nothing
- **Solution:** Check console for errors, ensure deal still exists

**Issue:** Commission not updating in deal
- **Solution:** Make sure commission structure is saved in analysis, then click "Sync"

**Issue:** Can't unlink
- **Solution:** Refresh the page, data may be stale

## 📝 Testing Checklist

- [ ] Create analysis from deal - auto-populated fields
- [ ] Link existing analysis to existing deal
- [ ] Create new deal from analysis
- [ ] Sync button updates shared fields
- [ ] Commission updates deal estimated value
- [ ] Unlink removes linkage
- [ ] Data persists after refresh
- [ ] Multiple analyses on one deal show combined value


