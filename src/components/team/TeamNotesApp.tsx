"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pin } from "lucide-react";
import { loadTeamNotes } from "@/lib/teamNotesStorage";
import type { TeamNote, TeamNoteCategory } from "@/lib/types/teamNotes";
import { NoteList } from "./NoteList";
import { NoteEditor } from "./NoteEditor";
import { QuickAddNote } from "./QuickAddNote";

const categoryLabels: Record<TeamNoteCategory, string> = {
  market_info: 'Market Information',
  property: 'Property',
  client_intel: 'Client Intelligence',
  general: 'General',
  meeting_notes: 'Meeting Notes',
};

export function TeamNotesApp({ userName = "User" }: { userName?: string }) {
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TeamNoteCategory | "all">("all");
  const [editingNote, setEditingNote] = useState<TeamNote | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    const loadedNotes = loadTeamNotes();
    setNotes(loadedNotes);
  };

  const handleNoteSaved = () => {
    loadNotes();
    setEditingNote(null);
    setShowQuickAdd(false);
  };

  const handleEditNote = (note: TeamNote) => {
    setEditingNote(note);
  };

  const handleDeleteNote = () => {
    loadNotes();
    setEditingNote(null);
  };

  // Filter and sort notes
  const filteredNotes = React.useMemo(() => {
    let filtered = notes;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.content.toLowerCase().includes(query) ||
          (note.title && note.title.toLowerCase().includes(query)) ||
          (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      // Pinned notes first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then by date
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [notes, searchQuery, selectedCategory, sortBy]);

  if (editingNote) {
    return (
      <NoteEditor
        note={editingNote}
        onSave={handleNoteSaved}
        onCancel={() => setEditingNote(null)}
        onDelete={handleDeleteNote}
        userName={userName}
      />
    );
  }

  if (showQuickAdd) {
    return (
      <QuickAddNote
        onSave={handleNoteSaved}
        onCancel={() => setShowQuickAdd(false)}
        userName={userName}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Team Notes</h1>
            <p className="text-sm text-gray-600">Market intelligence and team knowledge base</p>
          </div>
          <Button onClick={() => setShowQuickAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TeamNoteCategory | "all")}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {(Object.keys(categoryLabels) as TeamNoteCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <NoteList
          notes={filteredNotes}
          onEdit={handleEditNote}
          onRefresh={loadNotes}
          userName={userName}
        />
      </div>
    </div>
  );
}

