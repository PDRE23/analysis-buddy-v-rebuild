"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import type { DealFile } from "@/lib/types/file";

interface FilePreviewProps {
  file: DealFile;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePreview({ file, onClose, onDownload }: FilePreviewProps) {
  const isImage = file.mimeType.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold truncate flex-1">{file.name}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isImage && file.thumbnail ? (
            <div className="flex items-center justify-center">
              <img
                src={file.thumbnail}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          ) : isPDF ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                PDF preview is not available. Please download the file to view it.
              </p>
              <Button onClick={onDownload}>Download PDF</Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Preview is not available for this file type.
              </p>
              <Button onClick={onDownload}>Download File</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

