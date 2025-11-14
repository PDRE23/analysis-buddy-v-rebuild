"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  Trash2,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Search,
  Filter,
} from "lucide-react";
import type { DealFile, FileCategory } from "@/lib/types/file";
import { FilePreview } from "./FilePreview";

interface FileListProps {
  files: DealFile[];
  onDownload: (file: DealFile) => Promise<void>;
  onDelete: (file: DealFile) => Promise<void>;
  onPreview?: (file: DealFile) => void;
}

const categoryLabels: Record<FileCategory, string> = {
  presentation: "Presentation",
  proposal: "Proposal",
  contract: "Contract",
  notes: "Notes",
  floorplan: "Floorplan",
  photo: "Photo",
  other: "Other",
};

export function FileList({ files, onDownload, onDelete, onPreview }: FileListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | "all">("all");
  const [previewFile, setPreviewFile] = useState<DealFile | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (file: DealFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    setDeletingFileId(file.id);
    try {
      await onDelete(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  const handlePreview = (file: DealFile) => {
    if (onPreview) {
      onPreview(file);
    } else {
      setPreviewFile(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return ImageIcon;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  const categories: FileCategory[] = [
    "presentation",
    "proposal",
    "contract",
    "notes",
    "floorplan",
    "photo",
    "other",
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as FileCategory | "all")}
              className="pl-10 pr-8 py-2 border rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Files List */}
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {files.length === 0
                  ? "No files uploaded yet"
                  : "No files match your search"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.mimeType);
              const isDeleting = deletingFileId === file.id;

              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* File Icon/Thumbnail */}
                      <div className="flex-shrink-0">
                        {file.thumbnail ? (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <FileIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{file.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[file.category]}
                          </Badge>
                        </div>
                        {file.description && (
                          <p className="text-sm text-gray-600 mb-2">{file.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>Uploaded by {file.uploadedBy}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {(file.mimeType === "application/pdf" ||
                          file.mimeType.startsWith("image/")) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(file)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDownload(file)}
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file)}
                          disabled={isDeleting}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={() => onDownload(previewFile)}
        />
      )}
    </>
  );
}

