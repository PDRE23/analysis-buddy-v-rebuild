"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Note } from "@/lib/types/deal";
import { nanoid } from "nanoid";
import { StickyNote, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface NotesPanelProps {
  notes: Note[];
  onChange: (notes: Note[]) => void;
  userName?: string;
  collapsed?: boolean;
}

const categoryColors = {
  general: "bg-gray-100 text-gray-800",
  financial: "bg-green-100 text-green-800",
  legal: "bg-blue-100 text-blue-800",
  property: "bg-purple-100 text-purple-800",
};

const categoryLabels = {
  general: "General",
  financial: "Financial",
  legal: "Legal",
  property: "Property",
};

export function NotesPanel({ notes, onChange, userName = "User", collapsed: initialCollapsed = false }: NotesPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState<Note['category']>('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: nanoid(),
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
      createdBy: userName,
      category: newCategory,
    };

    onChange([...notes, note]);
    setNewNote("");
    setNewCategory('general');
  };

  const deleteNote = (noteId: string) => {
    onChange(notes.filter(n => n.id !== noteId));
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = (noteId: string) => {
    if (!editContent.trim()) {
      setEditingId(null);
      return;
    }

    onChange(notes.map(n => 
      n.id === noteId 
        ? { ...n, content: editContent.trim() }
        : n
    ));
    setEditingId(null);
    setEditContent("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  // Sort notes by date, newest first
  const sortedNotes = [...notes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notes.length}
              </Badge>
            )}
          </div>
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Add New Note */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <Label>New Note</Label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      addNote();
                    }
                  }}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newCategory || 'general'}
                  onChange={(e) => setNewCategory(e.target.value as Note['category'])}
                  options={[
                    { value: 'general', label: 'General' },
                    { value: 'financial', label: 'Financial' },
                    { value: 'legal', label: 'Legal' },
                    { value: 'property', label: 'Property' },
                  ]}
                />
              </div>
            </div>
            <Button onClick={addNote} disabled={!newNote.trim()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl + Enter to quickly add a note
            </p>
          </div>

          {/* Existing Notes */}
          {sortedNotes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-auto">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(note.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p 
                          className="text-sm whitespace-pre-wrap cursor-pointer"
                          onClick={() => startEdit(note)}
                          title="Click to edit"
                        >
                          {note.content}
                        </p>
                      )}
                    </div>
                    {editingId !== note.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {note.category && (
                        <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[note.category]}`}>
                          {categoryLabels[note.category]}
                        </span>
                      )}
                      <span>{note.createdBy}</span>
                    </div>
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notes yet. Add your first note above.</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

