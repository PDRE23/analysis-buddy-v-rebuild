/**
 * Team Notes Storage Utilities
 */

import { nanoid } from "nanoid";
import type { TeamNote, TeamNoteCategory, TeamNotesStorage } from "./types/teamNotes";

const STORAGE_KEY = 'bsquared-team-notes';
const CURRENT_VERSION = '1.0';

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load team notes from storage
 */
export function loadTeamNotes(): TeamNote[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const data: TeamNotesStorage = JSON.parse(stored);
    return data.notes || [];
  } catch (error) {
    console.error('Failed to load team notes:', error);
    return [];
  }
}

/**
 * Save team notes to storage
 */
export function saveTeamNotes(notes: TeamNote[]): { success: boolean; error?: string } {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'LocalStorage not available' };
  }

  try {
    const data: TeamNotesStorage = {
      notes,
      lastUpdated: new Date().toISOString(),
      version: CURRENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save team notes',
    };
  }
}

/**
 * Create a new team note
 */
export function createTeamNote(
  content: string,
  category: TeamNoteCategory,
  createdBy: string,
  title?: string,
  tags?: string[]
): TeamNote {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    title,
    content,
    category,
    tags: tags || [],
    createdAt: now,
    updatedAt: now,
    createdBy,
    isPinned: false,
  };
}

/**
 * Add a new team note
 */
export function addTeamNote(
  content: string,
  category: TeamNoteCategory,
  createdBy: string,
  title?: string,
  tags?: string[]
): { success: boolean; note?: TeamNote; error?: string } {
  const note = createTeamNote(content, category, createdBy, title, tags);
  const notes = loadTeamNotes();
  notes.push(note);
  const result = saveTeamNotes(notes);
  return { ...result, note };
}

/**
 * Update an existing team note
 */
export function updateTeamNote(
  noteId: string,
  updates: Partial<TeamNote>,
  updatedBy: string
): { success: boolean; error?: string } {
  const notes = loadTeamNotes();
  const index = notes.findIndex(n => n.id === noteId);
  
  if (index === -1) {
    return { success: false, error: 'Note not found' };
  }

  notes[index] = {
    ...notes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  return saveTeamNotes(notes);
}

/**
 * Delete a team note
 */
export function deleteTeamNote(noteId: string): { success: boolean; error?: string } {
  const notes = loadTeamNotes();
  const filtered = notes.filter(n => n.id !== noteId);
  
  if (filtered.length === notes.length) {
    return { success: false, error: 'Note not found' };
  }

  return saveTeamNotes(filtered);
}

/**
 * Search team notes
 */
export function searchTeamNotes(
  query: string,
  category?: TeamNoteCategory,
  tags?: string[]
): TeamNote[] {
  const notes = loadTeamNotes();
  const lowerQuery = query.toLowerCase();

  return notes.filter(note => {
    // Text search
    const matchesText = 
      !query ||
      note.content.toLowerCase().includes(lowerQuery) ||
      (note.title && note.title.toLowerCase().includes(lowerQuery)) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)));

    // Category filter
    const matchesCategory = !category || note.category === category;

    // Tag filter
    const matchesTags = !tags || tags.length === 0 || 
      (note.tags && tags.some(tag => note.tags!.includes(tag)));

    return matchesText && matchesCategory && matchesTags;
  });
}

/**
 * Get notes by category
 */
export function getNotesByCategory(category: TeamNoteCategory): TeamNote[] {
  const notes = loadTeamNotes();
  return notes.filter(note => note.category === category);
}

/**
 * Get pinned notes
 */
export function getPinnedNotes(): TeamNote[] {
  const notes = loadTeamNotes();
  return notes.filter(note => note.isPinned);
}

/**
 * Pin/unpin a note
 */
export function togglePinNote(noteId: string): { success: boolean; error?: string } {
  const notes = loadTeamNotes();
  const note = notes.find(n => n.id === noteId);
  
  if (!note) {
    return { success: false, error: 'Note not found' };
  }

  note.isPinned = !note.isPinned;
  note.updatedAt = new Date().toISOString();
  
  return saveTeamNotes(notes);
}

