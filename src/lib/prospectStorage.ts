/**
 * Prospect storage utilities for persistence
 * Follows the same pattern as dealStorage.ts
 */

import type { Prospect } from "./types/prospect";

const PROSPECTS_STORAGE_KEY_BASE = 'lease-analyzer-prospects';
const PROSPECTS_BACKUP_KEY_BASE = 'lease-analyzer-prospects-backup';
const PROSPECTS_VERSION = '1.0';

let storageNamespace = "guest";

const getProspectsStorageKey = () => `${PROSPECTS_STORAGE_KEY_BASE}:${storageNamespace}`;
const getProspectsBackupKey = () => `${PROSPECTS_BACKUP_KEY_BASE}:${storageNamespace}`;

export function setProspectStorageUser(userId: string | null | undefined) {
  storageNamespace = userId ?? "guest";
}

export interface ProspectsStoredData {
  prospects: Prospect[];
  lastSaved: string;
  version: string;
  deviceId: string;
}

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
 * Migrate prospect data if needed
 */
const migrateProspectData = (prospects: Prospect[]): Prospect[] => {
  // Future migrations can be added here
  return prospects;
};

/**
 * Validate prospect data before saving
 */
const validateProspectData = (prospects: Prospect[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!Array.isArray(prospects)) {
    errors.push('Prospects must be an array');
    return { valid: false, errors };
  }

  prospects.forEach((prospect, index) => {
    if (!prospect.id) {
      errors.push(`Prospect ${index + 1} missing required ID`);
    }
    if (!prospect.contact || !prospect.contact.name) {
      errors.push(`Prospect ${index + 1} missing required contact name`);
    }
    if (!prospect.status) {
      errors.push(`Prospect ${index + 1} missing required status`);
    }
    if (!prospect.priority) {
      errors.push(`Prospect ${index + 1} missing required priority`);
    }
    if (!prospect.contact.email && !prospect.contact.phone) {
      errors.push(`Prospect ${index + 1} must have at least email or phone`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Create backup of current prospect data
 */
const createProspectsBackup = (): boolean => {
  try {
    if (!isLocalStorageAvailable()) {
      return false;
    }
    
    const currentData = localStorage.getItem(getProspectsStorageKey());
    if (currentData) {
      localStorage.setItem(getProspectsBackupKey(), currentData);
      console.log('💾 Prospects backup created successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to create prospects backup:', error);
    return false;
  }
};

/**
 * Get device ID
 */
const getDeviceId = (): string => {
  if (!isLocalStorageAvailable()) {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  let deviceId = localStorage.getItem(`device-id-prospects:${storageNamespace}`);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(`device-id-prospects:${storageNamespace}`, deviceId);
  }
  return deviceId;
};

export const prospectStorage = {
  /**
   * Save prospects to localStorage
   */
  save: (prospects: Prospect[]): { success: boolean; error?: string } => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, data will not persist');
        return { success: false, error: 'LocalStorage not available' };
      }

      // Validate data before saving
      const validation = validateProspectData(prospects);
      if (!validation.valid) {
        console.error('❌ Prospect validation failed:', validation.errors);
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.join(', ')}` 
        };
      }

      // Create backup before saving
      createProspectsBackup();
      
      const data: ProspectsStoredData = {
        prospects,
        lastSaved: new Date().toISOString(),
        version: PROSPECTS_VERSION,
        deviceId: getDeviceId(),
      };
      
      localStorage.setItem(getProspectsStorageKey(), JSON.stringify(data));
      console.log('📁 Prospects saved successfully:', prospects.length, 'prospects');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save prospects:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Save failed' 
      };
    }
  },

  /**
   * Load prospects from localStorage
   */
  load: (): Prospect[] => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, using empty data');
        return [];
      }

      const stored = localStorage.getItem(getProspectsStorageKey());
      if (!stored) {
        console.log('📁 No stored prospects found, using defaults');
        return [];
      }

      const data: ProspectsStoredData = JSON.parse(stored);
      
      // Apply migrations to fix deprecated data
      let prospects = migrateProspectData(data.prospects || []);
      
      // Validate loaded data
      const validation = validateProspectData(prospects);
      if (!validation.valid) {
        console.warn('⚠️ Loaded prospect data has validation issues:', validation.errors);
        // Try to restore from backup
        const backup = localStorage.getItem(getProspectsBackupKey());
        if (backup) {
          try {
            const backupData: ProspectsStoredData = JSON.parse(backup);
            console.log('✅ Prospects restored from backup');
            prospects = migrateProspectData(backupData.prospects || []);
          } catch {
            console.error('Failed to restore from backup');
          }
        }
      }

      // If migrations were applied, save the migrated data
      if (prospects !== data.prospects) {
        setTimeout(() => {
          prospectStorage.save(prospects);
          console.log('💾 Migrated prospects saved to storage');
        }, 100);
      }

      console.log('📁 Prospects loaded successfully:', prospects.length, 'prospects');
      return prospects;
    } catch (error) {
      console.error('❌ Failed to load prospects from localStorage:', error);
      
      // Try to restore from backup
      try {
        const backup = localStorage.getItem(getProspectsBackupKey());
        if (backup) {
          const backupData: ProspectsStoredData = JSON.parse(backup);
          console.log('✅ Prospects restored from backup after error');
          const prospects = migrateProspectData(backupData.prospects || []);
          return prospects;
        }
      } catch {
        console.error('Failed to restore from backup');
      }
      
      return [];
    }
  },

  /**
   * Get single prospect by ID
   */
  getById: (prospectId: string): Prospect | null => {
    const prospects = prospectStorage.load();
    return prospects.find(p => p.id === prospectId) || null;
  },

  /**
   * Add a new prospect
   */
  add: (prospect: Prospect): { success: boolean; error?: string } => {
    const prospects = prospectStorage.load();
    prospects.push(prospect);
    return prospectStorage.save(prospects);
  },

  /**
   * Update an existing prospect
   */
  update: (prospectId: string, updates: Partial<Prospect>): { success: boolean; error?: string } => {
    const prospects = prospectStorage.load();
    const index = prospects.findIndex(p => p.id === prospectId);
    
    if (index === -1) {
      return { success: false, error: 'Prospect not found' };
    }

    prospects[index] = {
      ...prospects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return prospectStorage.save(prospects);
  },

  /**
   * Delete a prospect
   */
  delete: (prospectId: string): { success: boolean; error?: string } => {
    const prospects = prospectStorage.load();
    const filtered = prospects.filter(p => p.id !== prospectId);
    
    if (filtered.length === prospects.length) {
      return { success: false, error: 'Prospect not found' };
    }

    return prospectStorage.save(filtered);
  },

  /**
   * Get prospects statistics
   */
  getStats: () => {
    const prospects = prospectStorage.load();
    const activeProspects = prospects.filter(p => 
      p.status !== "Lost" && p.status !== "Not Interested" && p.status !== "Converted to Deal"
    );
    
    const upcomingFollowUps = prospects.filter(p => {
      if (!p.nextFollowUpDate) return false;
      const followUpDate = new Date(p.nextFollowUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return followUpDate >= today;
    });

    const convertedCount = prospects.filter(p => p.status === "Converted to Deal").length;
    
    return {
      totalProspects: prospects.length,
      activeProspects: activeProspects.length,
      upcomingFollowUps: upcomingFollowUps.length,
      conversionRate: prospects.length > 0 
        ? (convertedCount / prospects.length) * 100 
        : 0,
    };
  },

  /**
   * Export prospects as JSON
   */
  export: (): string => {
    const prospects = prospectStorage.load();
    return JSON.stringify({ prospects, exportedAt: new Date().toISOString() }, null, 2);
  },

  /**
   * Import prospects from JSON
   */
  import: (jsonData: string): { success: boolean; count: number; error?: string } => {
    try {
      const parsed = JSON.parse(jsonData);
      let prospects = parsed.prospects || parsed;
      
      if (!Array.isArray(prospects)) {
        return { success: false, count: 0, error: 'Invalid data format' };
      }

      // Apply migrations to imported data
      prospects = migrateProspectData(prospects);

      // Validate imported data
      const validation = validateProspectData(prospects);
      if (!validation.valid) {
        return { 
          success: false, 
          count: 0, 
          error: `Import validation failed: ${validation.errors.join(', ')}` 
        };
      }

      // Create backup before import
      createProspectsBackup();
      
      // Save imported data
      const saveResult = prospectStorage.save(prospects);
      if (!saveResult.success) {
        return { 
          success: false, 
          count: 0, 
          error: saveResult.error || 'Failed to save imported data' 
        };
      }

      return { success: true, count: prospects.length };
    } catch (error) {
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Clear all prospects
   */
  clear: (): void => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, cannot clear data');
        return;
      }
      localStorage.removeItem(getProspectsStorageKey());
      console.log('🗑️ Prospects cleared');
    } catch (error) {
      console.error('❌ Failed to clear prospects:', error);
    }
  },

  /**
   * Add activity to a prospect
   */
  addActivity: (prospectId: string, activity: Prospect["activities"][0]): { success: boolean; error?: string } => {
    const prospects = prospectStorage.load();
    const index = prospects.findIndex(p => p.id === prospectId);
    
    if (index === -1) {
      return { success: false, error: 'Prospect not found' };
    }

    prospects[index].activities.push(activity);
    prospects[index].updatedAt = new Date().toISOString();

    return prospectStorage.save(prospects);
  },
};

