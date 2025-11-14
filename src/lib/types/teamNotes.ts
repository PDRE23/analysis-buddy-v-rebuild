/**
 * Team Notes and Market Intelligence Types
 */

export type TeamNoteCategory = 
  | 'market_info' 
  | 'property' 
  | 'client_intel' 
  | 'general' 
  | 'meeting_notes';

export interface TeamNote {
  id: string;
  title?: string;
  content: string;
  category: TeamNoteCategory;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string; // user name
  updatedBy?: string;
  author?: string;
  attachments?: string[]; // Array of file IDs (optional file attachments)
  isPinned?: boolean;
  linkedDealId?: string;
  linkedAnalysisId?: string;
}

export interface TeamNotesStorage {
  notes: TeamNote[];
  lastUpdated: string;
  version: string;
}

