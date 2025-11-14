/**
 * File storage types for deal attachments
 */

export type FileCategory = 
  | 'presentation' 
  | 'proposal' 
  | 'contract' 
  | 'notes' 
  | 'floorplan' 
  | 'photo' 
  | 'other';

export interface DealFile {
  id: string;
  dealId: string;
  name: string;
  description?: string; // e.g., "Presented to IATA on 10/2"
  category: FileCategory;
  mimeType: string;
  size: number; // bytes
  uploadedAt: string; // ISO date
  uploadedBy: string; // user name
  fileData?: string; // base64 for small files (<1MB), or IndexedDB key for large files
  thumbnail?: string; // base64 for image previews
  storageType: 'localStorage' | 'indexedDB'; // How the file is stored
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface FileStorageStats {
  totalFiles: number;
  totalSize: number; // bytes
  filesByCategory: Record<FileCategory, number>;
  indexedDBFiles: number;
  localStorageFiles: number;
}

