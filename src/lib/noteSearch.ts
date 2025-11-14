/**
 * Enhanced Note Search
 * Full-text and semantic search capabilities
 */

import type { TeamNote } from "./types/teamNotes";

export interface SearchResult {
  note: TeamNote;
  score: number;
  matches: Array<{
    field: string;
    snippet: string;
    highlighted: string;
  }>;
}

/**
 * Full-text search across notes
 */
export function fullTextSearch(
  notes: TeamNote[],
  query: string
): SearchResult[] {
  if (!query.trim()) {
    return notes.map(note => ({
      note,
      score: 1,
      matches: [],
    }));
  }

  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0);
  
  const results: SearchResult[] = [];

  notes.forEach(note => {
    let score = 0;
    const matches: SearchResult["matches"] = [];

    // Search in title
    if (note.title) {
      const titleLower = note.title.toLowerCase();
      const titleMatches = queryTerms.filter(term => titleLower.includes(term));
      if (titleMatches.length > 0) {
        score += titleMatches.length * 10; // Title matches are weighted higher
        matches.push({
          field: "title",
          snippet: note.title,
          highlighted: highlightText(note.title, queryTerms),
        });
      }
    }

    // Search in content
    const contentLower = note.content.toLowerCase();
    const contentMatches = queryTerms.filter(term => contentLower.includes(term));
    if (contentMatches.length > 0) {
      score += contentMatches.length * 5;
      
      // Find snippet around first match
      const firstMatchIndex = contentLower.indexOf(queryTerms[0]);
      const snippetStart = Math.max(0, firstMatchIndex - 50);
      const snippetEnd = Math.min(note.content.length, firstMatchIndex + queryTerms[0].length + 50);
      const snippet = note.content.substring(snippetStart, snippetEnd);
      
      matches.push({
        field: "content",
        snippet: snippet.length < note.content.length ? `...${snippet}...` : snippet,
        highlighted: highlightText(snippet, queryTerms),
      });
    }

    // Search in tags
    if (note.tags) {
      note.tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        const tagMatches = queryTerms.filter(term => tagLower.includes(term));
        if (tagMatches.length > 0) {
          score += tagMatches.length * 3;
          matches.push({
            field: "tags",
            snippet: tag,
            highlighted: highlightText(tag, queryTerms),
          });
        }
      });
    }

    // Search in category
    if (note.category.toLowerCase().includes(queryLower)) {
      score += 2;
      matches.push({
        field: "category",
        snippet: note.category,
        highlighted: note.category,
      });
    }

    if (score > 0) {
      results.push({
        note,
        score,
        matches,
      });
    }
  });

  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Highlight matching text in snippet
 */
function highlightText(text: string, terms: string[]): string {
  let highlighted = text;
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, "gi");
    highlighted = highlighted.replace(regex, "<mark>$1</mark>");
  });
  return highlighted;
}

/**
 * Filter notes by multiple criteria
 */
export interface SearchFilters {
  category?: string;
  author?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  linkedDealId?: string;
  linkedAnalysisId?: string;
}

export function filterNotes(
  notes: TeamNote[],
  filters: SearchFilters
): TeamNote[] {
  return notes.filter(note => {
    if (filters.category && note.category !== filters.category) {
      return false;
    }

    if (filters.author && note.author !== filters.author) {
      return false;
    }

    if (filters.dateFrom) {
      const noteDate = new Date(note.createdAt);
      if (noteDate < filters.dateFrom) {
        return false;
      }
    }

    if (filters.dateTo) {
      const noteDate = new Date(note.createdAt);
      if (noteDate > filters.dateTo) {
        return false;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => note.tags?.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    if (filters.linkedDealId && note.linkedDealId !== filters.linkedDealId) {
      return false;
    }

    if (filters.linkedAnalysisId && note.linkedAnalysisId !== filters.linkedAnalysisId) {
      return false;
    }

    return true;
  });
}

/**
 * Semantic search (simplified - in production would use AI/ML)
 * Matches related concepts and synonyms
 */
const semanticMap: Record<string, string[]> = {
  "office": ["workspace", "commercial", "business"],
  "rent": ["lease", "rental", "cost"],
  "client": ["tenant", "customer", "prospect"],
  "property": ["building", "space", "location"],
};

export function semanticSearch(
  notes: TeamNote[],
  query: string
): SearchResult[] {
  const queryLower = query.toLowerCase();
  const expandedTerms = [queryLower];
  
  // Expand query with semantic terms
  Object.keys(semanticMap).forEach(key => {
    if (queryLower.includes(key)) {
      expandedTerms.push(...semanticMap[key]);
    }
  });

  // Use expanded terms for full-text search
  const expandedQuery = expandedTerms.join(" ");
  return fullTextSearch(notes, expandedQuery);
}

