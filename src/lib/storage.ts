/**
 * Enhanced storage utilities for Lease Analyzer data persistence
 * Supports localStorage, cloud backup, and data validation
 */

// Removed unused import

// Using Record<string, unknown> for flexible data storage
type AnalysisData = Record<string, unknown>;

export interface StoredData {
  analyses: AnalysisData[];
  lastSaved: string;
  version: string;
  deviceId: string;
  cloudSync?: {
    enabled: boolean;
    lastSync?: string;
    conflictResolution?: 'local' | 'cloud' | 'manual';
  };
  settings?: {
    autoSave: boolean;
    theme: 'light' | 'dark' | 'system';
    autoBackup: boolean;
    backupFrequency: 'hourly' | 'daily' | 'weekly';
  };
}

export interface StorageResult {
  success: boolean;
  error?: string;
  data?: unknown;
  backupCreated?: boolean;
}

export interface CloudStorageConfig {
  provider: 'firebase' | 'supabase' | 'custom';
  enabled: boolean;
  syncInterval: number; // minutes
}

const STORAGE_KEY = 'lease-analyzer-data';
const BACKUP_KEY = 'lease-analyzer-backup';
const CURRENT_VERSION = '1.1';

/**
 * Check if localStorage is available
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate unique device ID for tracking
 */
const getDeviceId = (): string => {
  if (!isLocalStorageAvailable()) {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  let deviceId = localStorage.getItem('device-id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device-id', deviceId);
  }
  return deviceId;
};

/**
 * Validate analysis data before saving
 */
const validateAnalysisData = (analyses: AnalysisData[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!Array.isArray(analyses)) {
    errors.push('Analyses must be an array');
    return { valid: false, errors };
  }

  analyses.forEach((analysis, index) => {
    if (!analysis.id) {
      errors.push(`Analysis ${index + 1} missing required ID`);
    }
    if (!analysis.name || typeof analysis.name !== 'string') {
      errors.push(`Analysis ${index + 1} missing required name`);
    }
    if (!analysis.tenant_name || typeof analysis.tenant_name !== 'string') {
      errors.push(`Analysis ${index + 1} missing required tenant name`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Create backup of current data
 */
const createBackup = (): StorageResult => {
  try {
    if (!isLocalStorageAvailable()) {
      return { success: false, error: 'LocalStorage not available' };
    }
    
    const currentData = localStorage.getItem(STORAGE_KEY);
    if (currentData) {
      localStorage.setItem(BACKUP_KEY, currentData);
      console.log('💾 Backup created successfully');
      return { success: true, backupCreated: true };
    }
    return { success: false, error: 'No data to backup' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Backup failed' 
    };
  }
};

/**
 * Restore from backup
 */
const restoreFromBackup = (): StorageResult => {
  try {
    if (!isLocalStorageAvailable()) {
      return { success: false, error: 'LocalStorage not available' };
    }
    
    const backupData = localStorage.getItem(BACKUP_KEY);
    if (backupData) {
      localStorage.setItem(STORAGE_KEY, backupData);
      console.log('🔄 Data restored from backup');
      return { success: true, data: JSON.parse(backupData) };
    }
    return { success: false, error: 'No backup found' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Restore failed' 
    };
  }
};

export const storage = {
  /**
   * Enhanced save with validation and backup
   */
  save: (analyses: AnalysisData[]): StorageResult => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, data will not persist');
        return { success: false, error: 'LocalStorage not available' };
      }

      // Validate data before saving
      const validation = validateAnalysisData(analyses);
      if (!validation.valid) {
        console.error('❌ Validation failed:', validation.errors);
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.join(', ')}` 
        };
      }

      // Create backup before saving
      const backupResult = createBackup();
      
      const data: StoredData = {
        analyses,
        lastSaved: new Date().toISOString(),
        version: CURRENT_VERSION,
        deviceId: getDeviceId(),
        cloudSync: {
          enabled: false, // Will be enabled later
          conflictResolution: 'local'
        },
        settings: {
          autoSave: true,
          theme: 'system',
          autoBackup: true,
          backupFrequency: 'daily'
        }
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('📁 Data saved successfully:', analyses.length, 'analyses');
      
      return { 
        success: true, 
        backupCreated: backupResult.success 
      };
    } catch (error) {
      console.error('❌ Failed to save:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Save failed' 
      };
    }
  },

  /**
   * Enhanced load with error recovery and migration
   */
  load: (): AnalysisData[] => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, using empty data');
        return [];
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('📁 No stored data found, using defaults');
        return [];
      }

      const data: StoredData = JSON.parse(stored);
      
      // Handle version migration
      if (data.version !== CURRENT_VERSION) {
        console.log('🔄 Data version mismatch, migrating...');
        return storage.migrateData(data);
      }

      // Validate loaded data
      const validation = validateAnalysisData(data.analyses || []);
      if (!validation.valid) {
        console.warn('⚠️ Loaded data has validation issues:', validation.errors);
        // Try to restore from backup
        const backupResult = restoreFromBackup();
        if (backupResult.success) {
          console.log('✅ Data restored from backup');
          return (backupResult.data as any)?.analyses || [];
        }
      }

      console.log('📁 Data loaded successfully:', data.analyses.length, 'analyses');
      return data.analyses || [];
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      
      // Try to restore from backup
      const backupResult = restoreFromBackup();
      if (backupResult.success) {
        console.log('✅ Data restored from backup after error');
        return (backupResult.data as any)?.analyses || [];
      }
      
      return [];
    }
  },

  /**
   * Migrate data between versions
   */
  migrateData: (data: StoredData): AnalysisData[] => {
    try {
      console.log(`🔄 Migrating from version ${data.version} to ${CURRENT_VERSION}`);
      
      // Add missing fields for version 1.1
      if (!data.deviceId) {
        data.deviceId = getDeviceId();
      }
      
      if (!data.cloudSync) {
        data.cloudSync = {
          enabled: false,
          conflictResolution: 'local'
        };
      }
      
      if (!data.settings) {
        data.settings = {
          autoSave: true,
          theme: 'system',
          autoBackup: true,
          backupFrequency: 'daily'
        };
      }
      
      // Update version and save migrated data
      data.version = CURRENT_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      
      console.log('✅ Data migration completed');
      return data.analyses || [];
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return data.analyses || [];
    }
  },

  /**
   * Clear all stored data
   */
  clear: (): void => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, cannot clear data');
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Stored data cleared');
    } catch (error) {
      console.error('❌ Failed to clear localStorage:', error);
    }
  },

  /**
   * Get storage info for debugging
   */
  getInfo: (): { hasData: boolean; lastSaved?: string; count: number } => {
    try {
      if (!isLocalStorageAvailable()) {
        return { hasData: false, count: 0 };
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { hasData: false, count: 0 };
      }

      const data: StoredData = JSON.parse(stored);
      return {
        hasData: true,
        lastSaved: data.lastSaved,
        count: data.analyses?.length || 0,
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return { hasData: false, count: 0 };
    }
  },

  /**
   * Export data as JSON string
   */
  export: (): string => {
    const data = storage.load();
    return JSON.stringify({ analyses: data, exportedAt: new Date().toISOString() }, null, 2);
  },

  /**
   * Enhanced import with validation and backup
   */
  import: (jsonData: string): { success: boolean; count: number; error?: string } => {
    try {
      const parsed = JSON.parse(jsonData);
      const analyses = parsed.analyses || parsed; // Handle both formats
      
      if (!Array.isArray(analyses)) {
        return { success: false, count: 0, error: 'Invalid data format' };
      }

      // Validate imported data
      const validation = validateAnalysisData(analyses);
      if (!validation.valid) {
        return { 
          success: false, 
          count: 0, 
          error: `Import validation failed: ${validation.errors.join(', ')}` 
        };
      }

      // Create backup before import
      createBackup();
      
      // Save imported data
      const saveResult = storage.save(analyses);
      if (!saveResult.success) {
        return { 
          success: false, 
          count: 0, 
          error: saveResult.error || 'Failed to save imported data' 
        };
      }

      return { success: true, count: analyses.length };
    } catch (error) {
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Create manual backup
   */
  createBackup: (): StorageResult => {
    return createBackup();
  },

  /**
   * Restore from backup
   */
  restoreFromBackup: (): StorageResult => {
    return restoreFromBackup();
  },

  /**
   * Get storage statistics
   */
  getStats: (): {
    totalAnalyses: number;
    totalProposals: number;
    lastSaved?: string;
    deviceId: string;
    version: string;
    hasBackup: boolean;
  } => {
    const info = storage.getInfo();
    const analyses = storage.load();
    const totalProposals = analyses.reduce((count, analysis) => {
      const proposals = (analysis as any).proposals;
      return count + (Array.isArray(proposals) ? proposals.length : 0);
    }, 0);
    
    return {
      totalAnalyses: info.count,
      totalProposals,
      lastSaved: info.lastSaved,
      deviceId: getDeviceId(),
      version: CURRENT_VERSION,
      hasBackup: isLocalStorageAvailable() ? !!localStorage.getItem(BACKUP_KEY) : false
    };
  },

  /**
   * Prepare for cloud sync (placeholder for future implementation)
   */
  prepareCloudSync: (config: CloudStorageConfig): StorageResult => {
    // This will be implemented when we add cloud storage
    console.log('☁️ Cloud sync preparation:', config);
    return { 
      success: true, 
      error: 'Cloud sync not yet implemented' 
    };
  },
};
