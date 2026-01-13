# Analyses Tab Workflow Review

## Current Workflow

### 1. **HomeList View** (Initial State)
- User sees list of all analyses
- User can:
  - Click "Occupier Rep" or "Landlord Rep" to create new analysis
  - Click "Open" on existing analysis
  - Search by name or tenant
  - Duplicate or delete analyses

### 2. **ProposalsBoard View** (Analysis Selected, No Proposal Selected)
- Shows all proposals for the selected analysis
- User can:
  - Create new proposals: "+Landlord Counter" or "+Tenant Counter"
  - Click "Open" on a proposal to view/edit it
  - Drag to reorder proposals (desktop)
  - Navigate back to list

### 3. **Workspace View** (Analysis + Proposal Selected)
- Shows detailed analysis workspace with tabs:
  - **Proposal Tab**: Edit analysis details (basics, operating, concessions, rent schedule)
  - **Analysis Tab**: View annual cashflow table
  - **Cashflow Tab**: View charts and visualizations
  - **NER Tab**: Net Effective Rent analysis
  - **Commission Tab**: Commission calculations
- User can:
  - Edit all analysis fields
  - Link to deals
  - Export to PDF/Excel
  - Enter presentation mode
  - Navigate back to ProposalsBoard

---

## Issues Identified

### 🔴 Critical Issues

1. **Empty Proposals State**
   - When a new analysis is created, it has `proposals: []`
   - User is taken to ProposalsBoard which shows an empty grid
   - No empty state message or guidance
   - Grid tries to create 0 columns: `repeat(${analysis.proposals.length}, 1fr)` → `repeat(0, 1fr)`
   - **Impact**: Confusing UX - user creates analysis but sees blank screen

2. **Proposal Creation Uses Demo Data**
   - When creating a proposal, `createProposal()` uses `baseScenario()` which has hardcoded demo values
   - Does NOT use the actual analysis data (name, tenant_name, market, rsf, etc.)
   - **Impact**: New proposals don't inherit analysis context

3. **rep_type Not Displayed**
   - `rep_type` field is added to AnalysisMeta but never shown in UI
   - Not displayed in HomeList cards
   - Not shown in ProposalsBoard or Workspace
   - **Impact**: User can't distinguish Occupier vs Landlord analyses

### 🟡 Medium Issues

4. **No Auto-Create First Proposal**
   - User must manually create first proposal after creating analysis
   - Most users probably want to start editing immediately
   - **Impact**: Extra step in workflow

5. **Inconsistent Naming**
   - Analysis name: "Occupier Rep Analysis 1"
   - Proposal uses `baseScenario()` which has name: "Demo — 20k RSF Class A"
   - **Impact**: Confusing - analysis and proposal have different names

6. **Missing Validation**
   - Can create proposals even if analysis has no rent_schedule
   - AnalysisTab will show empty table if no rent schedule
   - **Impact**: User might see confusing empty states

### 🟢 Minor Issues

7. **No Loading States**
   - When creating new analysis, no loading indicator
   - User might click multiple times

8. **No Success Feedback**
   - When analysis is created, no confirmation message
   - User just sees ProposalsBoard appear

---

## Recommendations

### Priority 1: Fix Empty Proposals State

**Option A: Auto-create Base Proposal**
```typescript
// In createNewAnalysis, after creating analysis:
const baseProposal: Proposal = {
  id: nanoid(),
  side: repType === "Occupier" ? "Tenant" : "Landlord",
  label: "Base",
  created_at: new Date().toISOString(),
  meta: { ...newAnalysis }, // Use the actual analysis data
};
newAnalysis.proposals = [baseProposal];
```

**Option B: Show Empty State Message**
```typescript
// In ProposalsBoard:
{analysis.proposals.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-muted-foreground mb-4">No proposals yet</p>
    <Button onClick={() => onNewProposal(repType === "Occupier" ? "Tenant" : "Landlord")}>
      Create First Proposal
    </Button>
  </div>
) : (
  // ... existing grid
)}
```

### Priority 2: Fix Proposal Creation

**Use Analysis Data Instead of baseScenario()**
```typescript
const createProposal = (side: ProposalSide) => {
  if (!selectedAnalysis) return;
  
  const p: Proposal = {
    id: nanoid(),
    side,
    label: `${side} v${(selectedAnalysis.proposals.filter(p => p.side === side).length) + 1}`,
    created_at: new Date().toISOString(),
    meta: {
      ...selectedAnalysis, // Use actual analysis data
      name: `${selectedAnalysis.name} - ${side} ${selectedAnalysis.proposals.filter(p => p.side === side).length + 1}`,
    },
  };
  // ...
};
```

### Priority 3: Display rep_type

**Add Badge to HomeList Cards**
```typescript
<Badge variant={a.rep_type === "Occupier" ? "default" : "outline"}>
  {a.rep_type || "Unknown"}
</Badge>
```

**Add to ProposalsBoard Header**
```typescript
<h2 className="text-lg sm:text-xl font-semibold truncate">
  {analysis.name}
  {analysis.rep_type && (
    <Badge variant="secondary" className="ml-2">
      {analysis.rep_type} Rep
    </Badge>
  )}
</h2>
```

### Priority 4: Improve Workflow

1. **Auto-create base proposal** when analysis is created
2. **Show rep_type** in UI consistently
3. **Add loading states** for async operations
4. **Add success feedback** when analysis is created
5. **Validate before creating proposals** (ensure analysis has basic data)

---

## Testing Checklist

- [ ] Create new "Occupier Rep" analysis → Should auto-create base proposal
- [ ] Create new "Landlord Rep" analysis → Should auto-create base proposal
- [ ] Open analysis with no proposals → Should show empty state or auto-create
- [ ] Create new proposal → Should use analysis data, not demo data
- [ ] View analysis list → Should show rep_type badge
- [ ] Navigate: List → ProposalsBoard → Workspace → Back
- [ ] Edit analysis in Workspace → Changes should persist
- [ ] Create multiple proposals → Should number correctly (v1, v2, etc.)
- [ ] Delete analysis → Should remove from list
- [ ] Duplicate analysis → Should copy rep_type

---

## Code Changes Needed

1. **createNewAnalysis**: Auto-create base proposal
2. **createProposal**: Use analysis data instead of baseScenario()
3. **HomeList**: Display rep_type badge
4. **ProposalsBoard**: Handle empty proposals state, show rep_type
5. **Workspace**: Show rep_type in header

---

## Questions for User

1. Should we auto-create a base proposal when a new analysis is created?
2. Should the base proposal use "Tenant" or "Landlord" side based on rep_type?
3. Do you want to keep the proposals concept, or simplify to single analysis editing?
4. Should rep_type be editable after creation?

