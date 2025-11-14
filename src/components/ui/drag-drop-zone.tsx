"use client";

/**
 * Drag Drop Zone Component
 * Reusable drop zone for file uploads and drag operations
 */

import React, { useState, useCallback } from "react";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DragDropZoneProps {
  onDrop: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function DragDropZone({
  onDrop,
  accept,
  multiple = false,
  maxSize,
  className,
  children,
  disabled = false,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragging(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    
    // Filter by accept type
    let filteredFiles = files;
    if (accept) {
      const acceptTypes = accept.split(",").map(t => t.trim());
      filteredFiles = files.filter(file => {
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        return acceptTypes.some(type => 
          type === file.type || 
          file.type.startsWith(type) ||
          fileExtension === type
        );
      });
    }
    
    // Filter by max size
    if (maxSize) {
      filteredFiles = filteredFiles.filter(file => file.size <= maxSize);
    }
    
    // Limit to single file if not multiple
    if (!multiple && filteredFiles.length > 0) {
      filteredFiles = [filteredFiles[0]];
    }
    
    if (filteredFiles.length > 0) {
      onDrop(filteredFiles);
    }
  }, [onDrop, accept, multiple, maxSize, disabled]);

  return (
    <div
      className={cn(
        "relative",
        isDragging && "border-2 border-dashed border-primary bg-primary/5",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">Drop files here</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * File Drop Zone
 * Specialized component for file uploads
 */
export interface FileDropZoneProps extends Omit<DragDropZoneProps, "children"> {
  label?: string;
  description?: string;
}

export function FileDropZone({
  label = "Drop files here or click to upload",
  description,
  ...props
}: FileDropZoneProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      props.onDrop(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <DragDropZone {...props}>
      <div
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer",
          "hover:border-primary hover:bg-primary/5 transition-colors",
          props.disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleClick}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={props.accept}
          multiple={props.multiple}
          onChange={handleFileSelect}
          disabled={props.disabled}
        />
      </div>
    </DragDropZone>
  );
}

