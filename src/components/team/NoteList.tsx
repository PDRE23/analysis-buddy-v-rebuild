"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Pin, PinOff } from "lucide-react";
import type { TeamNote } from "@/lib/types/teamNotes";
import { deleteTeamNote, togglePinNote } from "@/lib/teamNotesStorage";

const categoryLabels: Record<TeamNote['category'], string> = {
  market_info: 'Market Info',
  property: 'Property',
  client_intel: 'Client Intel',
  general: 'General',
  meeting_notes: 'Meeting',
};

interface NoteListProps {
  notes: TeamNote[];
  onEdit: (note: TeamNote) => void;
  onRefresh: () => void;
  userName?: string;
}

export function NoteList({ notes, onEdit, onRefresh, userName }: NoteListProps) {
  const handleDelete = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteTeamNote(noteId);
      onRefresh();
    }
  };

  const handleTogglePin = (noteId: string) => {
    togglePinNote(noteId);
    onRefresh();
  };

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No notes found. Create your first note!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Card key={note.id} className={note.isPinned ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {note.title && (
                  <h3 className="font-semibold mb-1">{note.title}</h3>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[note.category]}
                  </Badge>
                  {note.isPinned && (
                    <Badge variant="outline" className="text-xs bg-yellow-100 border-yellow-300">
                      <Pin className="h-3 w-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                  {note.tags && note.tags.length > 0 && (
                    <>
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTogglePin(note.id)}
                  title={note.isPinned ? "Unpin" : "Pin"}
                >
                  {note.isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(note)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(note.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{note.content}</p>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <span>
                Created by {note.createdBy} on {new Date(note.createdAt).toLocaleDateString()}
              </span>
              {note.updatedAt !== note.createdAt && (
                <span>
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

