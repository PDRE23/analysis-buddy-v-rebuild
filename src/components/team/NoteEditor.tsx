"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { TeamNote, TeamNoteCategory } from "@/lib/types/teamNotes";
import { updateTeamNote, deleteTeamNote } from "@/lib/teamNotesStorage";

const categoryLabels: Record<TeamNoteCategory, string> = {
  market_info: 'Market Information',
  property: 'Property',
  client_intel: 'Client Intelligence',
  general: 'General',
  meeting_notes: 'Meeting Notes',
};

interface NoteEditorProps {
  note: TeamNote;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  userName?: string;
}

export function NoteEditor({ note, onSave, onCancel, onDelete, userName }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState<TeamNoteCategory>(note.category);
  const [tags, setTags] = useState(note.tags?.join(", ") || "");

  const handleSave = () => {
    const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean);
    updateTeamNote(
      note.id,
      {
        title: title || undefined,
        content,
        category,
        tags: tagArray,
      },
      userName || "User"
    );
    onSave();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteTeamNote(note.id);
      onDelete();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Edit Note</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Note Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TeamNoteCategory)}
                options={(Object.keys(categoryLabels) as TeamNoteCategory[]).map(cat => ({
                  value: cat,
                  label: categoryLabels[cat],
                }))}
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                placeholder="Enter your note content..."
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

