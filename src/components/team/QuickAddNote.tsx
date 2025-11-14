"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { TeamNoteCategory } from "@/lib/types/teamNotes";
import { addTeamNote } from "@/lib/teamNotesStorage";

const categoryLabels: Record<TeamNoteCategory, string> = {
  market_info: 'Market Information',
  property: 'Property',
  client_intel: 'Client Intelligence',
  general: 'General',
  meeting_notes: 'Meeting Notes',
};

interface QuickAddNoteProps {
  onSave: () => void;
  onCancel: () => void;
  userName?: string;
}

export function QuickAddNote({ onSave, onCancel, userName }: QuickAddNoteProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<TeamNoteCategory>("general");

  const handleSave = () => {
    if (!content.trim()) {
      alert("Please enter note content");
      return;
    }

    addTeamNote(content, category, userName || "User");
    onSave();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Quick Add Note</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Add Team Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                rows={8}
                placeholder="Enter your note here... (e.g., 'Downtown Miami rates trending up')"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
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

