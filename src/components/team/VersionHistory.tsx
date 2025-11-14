"use client";

/**
 * Version History Component
 * View and restore previous versions of notes
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Eye } from "lucide-react";
import {
  getVersionHistory,
  restoreNoteVersion,
  type VersionHistorySummary,
} from "@/lib/noteVersioning";
import type { TeamNote } from "@/lib/types/teamNotes";

interface VersionHistoryProps {
  note: TeamNote;
  onRestore: (restoredNote: TeamNote) => void;
  currentUserId: string;
}

export function VersionHistory({ note, onRestore, currentUserId }: VersionHistoryProps) {
  const [history, setHistory] = useState<VersionHistorySummary | null>(null);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadHistory = () => {
      const h = getVersionHistory(note.id);
      setHistory(h);
    };
    loadHistory();
  }, [note.id]);

  const handleRestore = async (version: number) => {
    if (!confirm(`Restore this note to version ${version}? Current version will be saved.`)) {
      return;
    }

    setLoading(true);
    try {
      const restored = restoreNoteVersion(note, version, currentUserId);
      onRestore(restored);
      // Reload history
      const h = getVersionHistory(note.id);
      setHistory(h);
    } catch (error) {
      alert(`Error restoring version: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!history || history.totalVersions === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No version history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {history.versions.map((version, index) => (
              <div
                key={version.version}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {version.version}</span>
                      {index === 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {version.date.toLocaleString()} by {version.author}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingVersion(version.version)}
                      className="h-7"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(version.version)}
                        disabled={loading}
                        className="h-7"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
                {version.changes && (
                  <div className="text-sm text-muted-foreground">
                    {version.changes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

