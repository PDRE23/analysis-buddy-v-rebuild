/**
 * Note Versioning
 * Track changes and restore previous versions
 */

import type { TeamNote, TeamNoteCategory } from "./types/teamNotes";
import { nanoid } from "nanoid";

export interface NoteVersion {
  id: string;
  noteId: string;
  version: number;
  content: string;
  title?: string;
  tags?: string[];
  category?: string;
  createdAt: string;
  createdBy: string;
  changes: string; // Description of what changed
}

const VERSIONS_STORAGE_KEY = "note-versions";

/**
 * Save a version of a note
 */
export function saveNoteVersion(
  note: TeamNote,
  changes: string,
  userId: string
): NoteVersion {
  const versions = getAllVersions();
  const noteVersions = versions.filter(v => v.noteId === note.id);
  const nextVersion = noteVersions.length > 0 
    ? Math.max(...noteVersions.map(v => v.version)) + 1 
    : 1;

  const version: NoteVersion = {
    id: nanoid(),
    noteId: note.id,
    version: nextVersion,
    content: note.content,
    title: note.title,
    tags: note.tags,
    category: note.category,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    changes,
  };

  versions.push(version);
  localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(versions));

  return version;
}

/**
 * Get all versions for a note
 */
export function getNoteVersions(noteId: string): NoteVersion[] {
  const versions = getAllVersions();
  return versions
    .filter(v => v.noteId === noteId)
    .sort((a, b) => b.version - a.version);
}

/**
 * Get a specific version
 */
export function getNoteVersion(noteId: string, version: number): NoteVersion | null {
  const versions = getAllVersions();
  return versions.find(v => v.noteId === noteId && v.version === version) || null;
}

/**
 * Restore a note to a previous version
 */
export function restoreNoteVersion(
  note: TeamNote,
  version: number,
  userId: string
): TeamNote {
  const versionData = getNoteVersion(note.id, version);
  if (!versionData) {
    throw new Error(`Version ${version} not found for note ${note.id}`);
  }

  // Save current state as a version before restoring
  saveNoteVersion(note, `Restored to version ${version}`, userId);

  // Restore from version
  const restored: TeamNote = {
    ...note,
    content: versionData.content,
    title: versionData.title,
    tags: versionData.tags,
    category:
      (versionData.category as TeamNoteCategory | undefined) || note.category,
    updatedAt: new Date().toISOString(),
  };

  return restored;
}

/**
 * Get all versions
 */
function getAllVersions(): NoteVersion[] {
  try {
    const stored = localStorage.getItem(VERSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get version history summary
 */
export interface VersionHistorySummary {
  totalVersions: number;
  lastModified: Date | null;
  lastModifiedBy: string | null;
  versions: Array<{
    version: number;
    date: Date;
    author: string;
    changes: string;
  }>;
}

export function getVersionHistory(noteId: string): VersionHistorySummary {
  const versions = getNoteVersions(noteId);
  
  return {
    totalVersions: versions.length,
    lastModified: versions.length > 0 ? new Date(versions[0].createdAt) : null,
    lastModifiedBy: versions.length > 0 ? versions[0].createdBy : null,
    versions: versions.map(v => ({
      version: v.version,
      date: new Date(v.createdAt),
      author: v.createdBy,
      changes: v.changes,
    })),
  };
}

