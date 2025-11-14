/**
 * File storage utilities using IndexedDB for large files and localStorage for small files
 */

import { nanoid } from "nanoid";
import type { DealFile, FileCategory, FileStorageStats } from "./types/file";

const DB_NAME = 'bsquared-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const MAX_LOCALSTORAGE_SIZE = 1024 * 1024; // 1MB threshold
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max per file

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('dealId', 'dealId', { unique: false });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
    };
  });
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail for image files
 */
async function generateThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) {
    return undefined;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumbnail);
        } else {
          resolve(undefined);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

/**
 * Store file in IndexedDB
 */
async function storeInIndexedDB(file: File, fileMetadata: Omit<DealFile, 'fileData' | 'storageType'>): Promise<DealFile> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const fileData = {
      id: fileMetadata.id,
      dealId: fileMetadata.dealId,
      name: fileMetadata.name,
      description: fileMetadata.description,
      category: fileMetadata.category,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size,
      uploadedAt: fileMetadata.uploadedAt,
      uploadedBy: fileMetadata.uploadedBy,
      thumbnail: fileMetadata.thumbnail,
      blob: file, // Store the File object directly
    };

    const request = store.put(fileData);

    request.onsuccess = () => {
      resolve({
        ...fileMetadata,
        storageType: 'indexedDB',
        fileData: fileMetadata.id, // Use ID as reference
      });
    };

    request.onerror = () => {
      reject(new Error('Failed to store file in IndexedDB'));
    };
  });
}

/**
 * Retrieve file from IndexedDB
 */
async function retrieveFromIndexedDB(fileId: string): Promise<File | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(fileId);

    request.onsuccess = () => {
      const data = request.result;
      if (data && data.blob) {
        resolve(data.blob);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve file from IndexedDB'));
    };
  });
}

/**
 * Upload and store a file
 */
export async function uploadFile(
  file: File,
  dealId: string,
  category: FileCategory,
  description?: string,
  uploadedBy: string = 'User'
): Promise<DealFile> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  const fileId = nanoid();
  const uploadedAt = new Date().toISOString();
  
  // Generate thumbnail for images
  const thumbnail = await generateThumbnail(file);

  const fileMetadata: Omit<DealFile, 'fileData' | 'storageType'> = {
    id: fileId,
    dealId,
    name: file.name,
    description,
    category,
    mimeType: file.type,
    size: file.size,
    uploadedAt,
    uploadedBy,
    thumbnail,
  };

  // Use IndexedDB for files >1MB, localStorage for smaller files
  if (file.size > MAX_LOCALSTORAGE_SIZE) {
    return await storeInIndexedDB(file, fileMetadata);
  } else {
    // Store in localStorage as base64
    const base64 = await fileToBase64(file);
    
    if (!isLocalStorageAvailable()) {
      // Fallback to IndexedDB if localStorage not available
      return await storeInIndexedDB(file, fileMetadata);
    }

    // Store metadata in localStorage
    const metadataKey = `file_metadata_${fileId}`;
    const dataKey = `file_data_${fileId}`;
    
    localStorage.setItem(metadataKey, JSON.stringify(fileMetadata));
    localStorage.setItem(dataKey, base64);

    return {
      ...fileMetadata,
      storageType: 'localStorage',
      fileData: base64,
    };
  }
}

/**
 * Download/retrieve a file
 */
export async function downloadFile(file: DealFile): Promise<Blob> {
  if (file.storageType === 'localStorage') {
    if (!file.fileData) {
      throw new Error('File data not found');
    }
    
    // Convert base64 to blob
    const byteCharacters = atob(file.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: file.mimeType });
  } else {
    // Retrieve from IndexedDB
    const fileBlob = await retrieveFromIndexedDB(file.id);
    if (!fileBlob) {
      throw new Error('File not found in IndexedDB');
    }
    return fileBlob;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(file: DealFile): Promise<void> {
  if (file.storageType === 'localStorage') {
    const metadataKey = `file_metadata_${file.id}`;
    const dataKey = `file_data_${file.id}`;
    localStorage.removeItem(metadataKey);
    localStorage.removeItem(dataKey);
  } else {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(file.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete file'));
    });
  }
}

/**
 * Get all files for a deal
 */
export async function getFilesForDeal(dealId: string): Promise<DealFile[]> {
  const files: DealFile[] = [];

  // Get files from localStorage
  if (isLocalStorageAvailable()) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('file_metadata_')) {
        try {
          const metadata = JSON.parse(localStorage.getItem(key) || '{}');
          if (metadata.dealId === dealId) {
            const fileId = metadata.id;
            const dataKey = `file_data_${fileId}`;
            const fileData = localStorage.getItem(dataKey);
            
            files.push({
              ...metadata,
              storageType: 'localStorage' as const,
              fileData: fileData || undefined,
            });
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  // Get files from IndexedDB
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('dealId');
    const request = index.getAll(dealId);

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result;
        for (const result of results) {
          files.push({
            id: result.id,
            dealId: result.dealId,
            name: result.name,
            description: result.description,
            category: result.category,
            mimeType: result.mimeType,
            size: result.size,
            uploadedAt: result.uploadedAt,
            uploadedBy: result.uploadedBy,
            thumbnail: result.thumbnail,
            storageType: 'indexedDB' as const,
            fileData: result.id,
          });
        }
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to retrieve files from IndexedDB'));
    });
  } catch (error) {
    console.warn('Failed to retrieve files from IndexedDB:', error);
  }

  // Sort by upload date (newest first)
  return files.sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

/**
 * Get file storage statistics
 */
export async function getStorageStats(): Promise<FileStorageStats> {
  const stats: FileStorageStats = {
    totalFiles: 0,
    totalSize: 0,
    filesByCategory: {
      presentation: 0,
      proposal: 0,
      contract: 0,
      notes: 0,
      floorplan: 0,
      photo: 0,
      other: 0,
    },
    indexedDBFiles: 0,
    localStorageFiles: 0,
  };

  // Count localStorage files
  if (isLocalStorageAvailable()) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('file_metadata_')) {
        try {
          const metadata = JSON.parse(localStorage.getItem(key) || '{}') as Partial<DealFile>;
          stats.totalFiles++;
          stats.totalSize += metadata.size || 0;
          stats.localStorageFiles++;
          const category = metadata.category as FileCategory | undefined;
          if (category && Object.prototype.hasOwnProperty.call(stats.filesByCategory, category)) {
            stats.filesByCategory[category]++;
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  // Count IndexedDB files
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result;
        for (const result of results) {
          stats.totalFiles++;
          stats.totalSize += result.size || 0;
          stats.indexedDBFiles++;
          const category = result.category as FileCategory | undefined;
          if (category && Object.prototype.hasOwnProperty.call(stats.filesByCategory, category)) {
            stats.filesByCategory[category]++;
          }
        }
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to get IndexedDB stats'));
    });
  } catch (error) {
    console.warn('Failed to get IndexedDB stats:', error);
  }

  return stats;
}

