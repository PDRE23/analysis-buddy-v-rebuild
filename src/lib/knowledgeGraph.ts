/**
 * Knowledge Graph
 * Link notes to deals, analyses, and other notes
 */

import type { TeamNote } from "./types/teamNotes";
import { loadTeamNotes } from "./teamNotesStorage";

export interface KnowledgeNode {
  id: string;
  type: "note" | "deal" | "analysis";
  label: string;
  data: unknown;
}

export interface KnowledgeLink {
  source: string;
  target: string;
  type: "mentions" | "related_to" | "references";
  strength: number; // 0-1
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

/**
 * Build knowledge graph from notes
 */
export function buildKnowledgeGraph(
  notes: TeamNote[],
  deals?: Array<{ id: string; clientName: string }>,
  analyses?: Array<{ id: string; tenant_name: string }>
): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [];
  const links: KnowledgeLink[] = [];

  // Add note nodes
  notes.forEach(note => {
    nodes.push({
      id: note.id,
      type: "note",
      label: note.title || note.content.substring(0, 50),
      data: note,
    });

    // Link to deal if linked
    if (note.linkedDealId) {
      links.push({
        source: note.id,
        target: note.linkedDealId,
        type: "related_to",
        strength: 1.0,
      });
    }

    // Link to analysis if linked
    if (note.linkedAnalysisId) {
      links.push({
        source: note.id,
        target: note.linkedAnalysisId,
        type: "related_to",
        strength: 1.0,
      });
    }
  });

  // Add deal nodes
  deals?.forEach(deal => {
    nodes.push({
      id: deal.id,
      type: "deal",
      label: deal.clientName,
      data: deal,
    });
  });

  // Add analysis nodes
  analyses?.forEach(analysis => {
    nodes.push({
      id: analysis.id,
      type: "analysis",
      label: analysis.tenant_name,
      data: analysis,
    });
  });

  // Find mentions in notes
  notes.forEach(note => {
    const content = (note.title || "") + " " + note.content;
    
    // Check for deal mentions
    deals?.forEach(deal => {
      if (content.toLowerCase().includes(deal.clientName.toLowerCase())) {
        links.push({
          source: note.id,
          target: deal.id,
          type: "mentions",
          strength: 0.7,
        });
      }
    });

    // Check for analysis mentions
    analyses?.forEach(analysis => {
      if (content.toLowerCase().includes(analysis.tenant_name.toLowerCase())) {
        links.push({
          source: note.id,
          target: analysis.id,
          type: "mentions",
          strength: 0.7,
        });
      }
    });

    // Check for note mentions (by title or tag)
    notes.forEach(otherNote => {
      if (otherNote.id !== note.id && otherNote.title) {
        if (content.includes(otherNote.title)) {
          links.push({
            source: note.id,
            target: otherNote.id,
            type: "references",
            strength: 0.5,
          });
        }
      }
    });
  });

  return { nodes, links };
}

/**
 * Get related notes for a resource
 */
export function getRelatedNotes(
  resourceId: string,
  resourceType: "deal" | "analysis",
  notes: TeamNote[]
): TeamNote[] {
  return notes.filter(note => {
    if (resourceType === "deal" && note.linkedDealId === resourceId) {
      return true;
    }
    if (resourceType === "analysis" && note.linkedAnalysisId === resourceId) {
      return true;
    }
    return false;
  });
}

/**
 * Auto-link notes based on content
 */
export function autoLinkNotes(
  note: TeamNote,
  deals: Array<{ id: string; clientName: string }>,
  analyses: Array<{ id: string; tenant_name: string }>
): { linkedDealId?: string; linkedAnalysisId?: string } {
  const content = (note.title || "") + " " + note.content;
  const contentLower = content.toLowerCase();

  // Try to find matching deal
  const matchingDeal = deals.find(deal =>
    contentLower.includes(deal.clientName.toLowerCase())
  );

  // Try to find matching analysis
  const matchingAnalysis = analyses.find(analysis =>
    contentLower.includes(analysis.tenant_name.toLowerCase())
  );

  return {
    linkedDealId: matchingDeal?.id,
    linkedAnalysisId: matchingAnalysis?.id,
  };
}

