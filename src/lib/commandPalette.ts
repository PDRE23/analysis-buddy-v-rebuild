/**
 * Command Palette - Search logic, action registry, and fuzzy matching
 * Provides instant access to any feature, deal, or action from anywhere
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";
import type { TeamNote } from "./types/teamNotes";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  keywords: string[];
  category: "action" | "deal" | "analysis" | "note" | "navigation" | "recent";
  icon?: string;
  action: () => void | Promise<void>;
  metadata?: Record<string, unknown>;
}

export interface CommandPaletteSearchResult {
  items: CommandPaletteItem[];
  query: string;
}

/**
 * Simple fuzzy match algorithm
 */
function fuzzyMatch(pattern: string, text: string): boolean {
  const patternLower = pattern.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(patternLower)) return true;
  
  // Character sequence match (e.g., "acme" matches "Acme Corp")
  let patternIndex = 0;
  for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIndex]) {
      patternIndex++;
    }
  }
  
  return patternIndex === patternLower.length;
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(item: CommandPaletteItem, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  // Exact label match gets highest score
  if (item.label.toLowerCase() === queryLower) {
    score += 100;
  } else if (item.label.toLowerCase().startsWith(queryLower)) {
    score += 50;
  } else if (item.label.toLowerCase().includes(queryLower)) {
    score += 25;
  }
  
  // Keyword matches
  const keywordMatches = item.keywords.filter(k => 
    k.toLowerCase().includes(queryLower) || queryLower.includes(k.toLowerCase())
  );
  score += keywordMatches.length * 10;
  
  // Description matches
  if (item.description?.toLowerCase().includes(queryLower)) {
    score += 5;
  }
  
  // Category boost
  if (item.category === "recent") {
    score += 15; // Recent items get slight boost
  }
  
  return score;
}

/**
 * Search command palette items
 */
export function searchCommandPalette(
  items: CommandPaletteItem[],
  query: string
): CommandPaletteItem[] {
  if (!query.trim()) {
    // Return recent items and common actions when query is empty
    return items
      .filter(item => item.category === "recent" || item.category === "action")
      .slice(0, 10);
  }
  
  const queryLower = query.trim().toLowerCase();
  
  // Filter and score items
  const matchedItems = items
    .filter(item => {
      // Check label
      if (fuzzyMatch(queryLower, item.label)) return true;
      
      // Check keywords
      if (item.keywords.some(k => fuzzyMatch(queryLower, k))) return true;
      
      // Check description
      if (item.description && fuzzyMatch(queryLower, item.description)) return true;
      
      // Check metadata (for deals, analyses, etc.)
      if (item.metadata) {
        const metadataStr = JSON.stringify(item.metadata).toLowerCase();
        if (metadataStr.includes(queryLower)) return true;
      }
      
      return false;
    })
    .map(item => ({
      ...item,
      _score: calculateRelevanceScore(item, queryLower),
    }))
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, 20);
  
  return matchedItems.map(({ _score, ...item }) => item);
}

/**
 * Create command palette items from deals
 */
export function createDealItems(
  deals: Deal[],
  onSelect: (deal: Deal) => void
): CommandPaletteItem[] {
  return deals.map(deal => ({
    id: `deal-${deal.id}`,
    label: deal.clientName,
    description: `${deal.property.address}, ${deal.property.city}, ${deal.property.state} • ${deal.rsf.toLocaleString()} RSF`,
    keywords: [
      deal.clientName,
      deal.property.address,
      deal.property.city,
      deal.property.state,
      deal.stage,
      deal.broker,
      deal.rsf.toString(),
      deal.clientCompany || "",
    ].filter(Boolean),
    category: "deal" as const,
    icon: "Building2",
    action: () => onSelect(deal),
    metadata: {
      type: "deal",
      dealId: deal.id,
      stage: deal.stage,
      rsf: deal.rsf,
    },
  }));
}

/**
 * Create command palette items from analyses
 */
export function createAnalysisItems(
  analyses: AnalysisMeta[],
  onSelect: (analysis: AnalysisMeta) => void
): CommandPaletteItem[] {
  return analyses.map(analysis => ({
    id: `analysis-${analysis.id}`,
    label: analysis.name,
    description: `${analysis.tenant_name} • ${analysis.market} • ${analysis.rsf.toLocaleString()} RSF`,
    keywords: [
      analysis.name,
      analysis.tenant_name,
      analysis.market,
      analysis.rsf.toString(),
      analysis.lease_type,
      analysis.status,
    ].filter(Boolean),
    category: "analysis" as const,
    icon: "FileText",
    action: () => onSelect(analysis),
    metadata: {
      type: "analysis",
      analysisId: analysis.id,
      tenantName: analysis.tenant_name,
      market: analysis.market,
    },
  }));
}

/**
 * Create command palette items from team notes
 */
export function createNoteItems(
  notes: TeamNote[],
  onSelect: (note: TeamNote) => void
): CommandPaletteItem[] {
  return notes.map(note => ({
    id: `note-${note.id}`,
    label: note.title || note.content.substring(0, 50),
    description: note.category ? `Category: ${note.category}` : undefined,
    keywords: [
      note.title || "",
      note.content,
      note.category || "",
      ...(note.tags || []),
    ].filter(Boolean),
    category: "note" as const,
    icon: "StickyNote",
    action: () => onSelect(note),
    metadata: {
      type: "note",
      noteId: note.id,
      category: note.category,
    },
  }));
}

/**
 * Create common action items
 */
export function createActionItems(actions: {
  onCreateDeal?: () => void;
  onCreateAnalysis?: () => void;
  onExportAll?: () => void;
  onShowHotLeads?: () => void;
  onNavigateToPipeline?: () => void;
  onNavigateToAnalyses?: () => void;
  onNavigateToTeamNotes?: () => void;
  onNavigateToSettings?: () => void;
}): CommandPaletteItem[] {
  const actionItems: CommandPaletteItem[] = [];
  
  if (actions.onCreateDeal) {
    actionItems.push({
      id: "action-create-deal",
      label: "Create New Deal",
      description: "Add a new deal to the pipeline",
      keywords: ["create", "deal", "new", "add", "pipeline"],
      category: "action",
      icon: "Plus",
      action: actions.onCreateDeal,
    });
  }
  
  if (actions.onCreateAnalysis) {
    actionItems.push({
      id: "action-create-analysis",
      label: "Create New Analysis",
      description: "Start a new lease analysis",
      keywords: ["create", "analysis", "new", "lease", "proposal"],
      category: "action",
      icon: "Plus",
      action: actions.onCreateAnalysis,
    });
  }
  
  if (actions.onExportAll) {
    actionItems.push({
      id: "action-export-all",
      label: "Export All Proposals",
      description: "Export all analyses as PDF/Excel",
      keywords: ["export", "all", "proposals", "pdf", "excel"],
      category: "action",
      icon: "Download",
      action: actions.onExportAll,
    });
  }
  
  if (actions.onShowHotLeads) {
    actionItems.push({
      id: "action-hot-leads",
      label: "Show Hot Leads",
      description: "View all high-priority deals",
      keywords: ["hot", "leads", "priority", "high", "urgent"],
      category: "action",
      icon: "Zap",
      action: actions.onShowHotLeads,
    });
  }
  
  if (actions.onNavigateToPipeline) {
    actionItems.push({
      id: "nav-pipeline",
      label: "Go to Pipeline",
      description: "Navigate to deals pipeline",
      keywords: ["pipeline", "deals", "kanban", "navigate"],
      category: "navigation",
      icon: "Kanban",
      action: actions.onNavigateToPipeline,
    });
  }
  
  if (actions.onNavigateToAnalyses) {
    actionItems.push({
      id: "nav-analyses",
      label: "Go to Analyses",
      description: "Navigate to lease analyses",
      keywords: ["analyses", "proposals", "lease", "navigate"],
      category: "navigation",
      icon: "FileText",
      action: actions.onNavigateToAnalyses,
    });
  }
  
  if (actions.onNavigateToTeamNotes) {
    actionItems.push({
      id: "nav-team-notes",
      label: "Go to Team Notes",
      description: "Navigate to team notes",
      keywords: ["notes", "team", "knowledge", "navigate"],
      category: "navigation",
      icon: "StickyNote",
      action: actions.onNavigateToTeamNotes,
    });
  }

  if (actions.onNavigateToSettings) {
    actionItems.push({
      id: "nav-settings",
      label: "Open Settings",
      description: "Configure integrations, branding, and compliance",
      keywords: ["settings", "preferences", "admin", "configuration"],
      category: "navigation",
      icon: "Settings",
      action: actions.onNavigateToSettings,
    });
  }
  
  return actionItems;
}

/**
 * Get recent items from localStorage
 */
export function getRecentItems(): CommandPaletteItem[] {
  try {
    const recent = localStorage.getItem("command-palette-recent");
    if (!recent) return [];
    
    const items = JSON.parse(recent) as CommandPaletteItem[];
    return items.slice(0, 10); // Last 10 items
  } catch {
    return [];
  }
}

/**
 * Save item to recent items
 */
export function saveToRecent(item: CommandPaletteItem): void {
  try {
    const recent = getRecentItems();
    
    // Remove if already exists
    const filtered = recent.filter(i => i.id !== item.id);
    
    // Add to beginning
    const updated = [item, ...filtered].slice(0, 10);
    
    localStorage.setItem("command-palette-recent", JSON.stringify(updated));
  } catch {
    // Ignore errors
  }
}

/**
 * Clear recent items
 */
export function clearRecentItems(): void {
  try {
    localStorage.removeItem("command-palette-recent");
  } catch {
    // Ignore errors
  }
}

