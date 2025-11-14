"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload as UploadIcon } from "lucide-react";
import { FileUpload } from "./FileUpload";
import { FileList } from "./FileList";
import { uploadFile, downloadFile, deleteFile, getFilesForDeal } from "@/lib/fileStorage";
import type { DealFile, FileCategory } from "@/lib/types/file";

interface FileManagerProps {
  dealId: string;
  uploadedBy?: string;
}

export function FileManager({ dealId, uploadedBy = "User" }: FileManagerProps) {
  const [files, setFiles] = useState<DealFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [dealId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const dealFiles = await getFilesForDeal(dealId);
      setFiles(dealFiles);
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (
    file: File,
    category: FileCategory,
    description?: string
  ) => {
    try {
      const uploadedFile = await uploadFile(file, dealId, category, description, uploadedBy);
      setFiles((prev) => [uploadedFile, ...prev]);
      setShowUpload(false);
    } catch (error) {
      throw error;
    }
  };

  const handleDownload = async (file: DealFile) => {
    try {
      const blob = await downloadFile(file);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to download file");
    }
  };

  const handleDelete = async (file: DealFile) => {
    try {
      await deleteFile(file);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">Loading files...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Files</h2>
          <p className="text-sm text-gray-600">
            {files.length} {files.length === 1 ? "file" : "files"} attached
          </p>
        </div>
        {!showUpload && (
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Upload File
          </Button>
        )}
      </div>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Upload File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUpload={handleUpload}
              onCancel={() => setShowUpload(false)}
              uploadedBy={uploadedBy}
            />
          </CardContent>
        </Card>
      )}

      <FileList
        files={files}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </div>
  );
}

