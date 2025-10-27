/**
 * Deal storage utilities for persistence
 * Extends the existing storage system to handle deals
 */

import type { Deal } from "./types/deal";
import { storage } from "./storage";

const DEALS_STORAGE_KEY = 'lease-analyzer-deals';
const DEALS_BACKUP_KEY = 'lease-analyzer-deals-backup';
const DEALS_VERSION = '1.0';

export interface DealsStoredData {
  deals: Deal[];
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
 * Migrate deals to fix deprecated stages
 * Converts "Negotiation" stage to "Proposal" stage
 */
const migrateDealData = (deals: Deal[]): Deal[] => {
  let migrationCount = 0;
  
  const migratedDeals = deals.map(deal => {
    // @ts-ignore - "Negotiation" is no longer a valid stage type, but may exist in old data
    if (deal.stage === 'Negotiation') {
      migrationCount++;
      console.log(`🔄 Migrating deal "${deal.clientName}" from Negotiation to Proposal stage`);
      
      return {
        ...deal,
        stage: 'Proposal' as const,
        updatedAt: new Date().toISOString(),
        activities: [
          ...deal.activities,
          {
            id: `migration_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'stage_change' as const,
            description: 'Stage automatically updated from Negotiation to Proposal (system migration)',
          }
        ]
      };
    }
    return deal;
  });
  
  if (migrationCount > 0) {
    console.log(`✅ Migrated ${migrationCount} deal(s) from deprecated "Negotiation" stage`);
  }
  
  return migratedDeals;
};

/**
 * Validate deal data before saving
 */
const validateDealData = (deals: Deal[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!Array.isArray(deals)) {
    errors.push('Deals must be an array');
    return { valid: false, errors };
  }

  deals.forEach((deal, index) => {
    if (!deal.id) {
      errors.push(`Deal ${index + 1} missing required ID`);
    }
    if (!deal.clientName || typeof deal.clientName !== 'string') {
      errors.push(`Deal ${index + 1} missing required client name`);
    }
    if (!deal.stage) {
      errors.push(`Deal ${index + 1} missing required stage`);
    }
    if (!deal.property || !deal.property.address) {
      errors.push(`Deal ${index + 1} missing required property address`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * Create backup of current deal data
 */
const createDealsBackup = (): boolean => {
  try {
    if (!isLocalStorageAvailable()) {
      return false;
    }
    
    const currentData = localStorage.getItem(DEALS_STORAGE_KEY);
    if (currentData) {
      localStorage.setItem(DEALS_BACKUP_KEY, currentData);
      console.log('💾 Deals backup created successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to create deals backup:', error);
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
  
  let deviceId = localStorage.getItem('device-id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device-id', deviceId);
  }
  return deviceId;
};

export const dealStorage = {
  /**
   * Save deals to localStorage
   */
  save: (deals: Deal[]): { success: boolean; error?: string } => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, data will not persist');
        return { success: false, error: 'LocalStorage not available' };
      }

      // Validate data before saving
      const validation = validateDealData(deals);
      if (!validation.valid) {
        console.error('❌ Deal validation failed:', validation.errors);
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.join(', ')}` 
        };
      }

      // Create backup before saving
      createDealsBackup();
      
      const data: DealsStoredData = {
        deals,
        lastSaved: new Date().toISOString(),
        version: DEALS_VERSION,
        deviceId: getDeviceId(),
      };
      
      localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(data));
      console.log('📁 Deals saved successfully:', deals.length, 'deals');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save deals:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Save failed' 
      };
    }
  },

  /**
   * Load deals from localStorage
   */
  load: (): Deal[] => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, using empty data');
        return [];
      }

      const stored = localStorage.getItem(DEALS_STORAGE_KEY);
      if (!stored) {
        console.log('📁 No stored deals found, using defaults');
        return [];
      }

      const data: DealsStoredData = JSON.parse(stored);
      
      // Apply migrations to fix deprecated data
      let deals = migrateDealData(data.deals || []);
      
      // Validate loaded data
      const validation = validateDealData(deals);
      if (!validation.valid) {
        console.warn('⚠️ Loaded deal data has validation issues:', validation.errors);
        // Try to restore from backup
        const backup = localStorage.getItem(DEALS_BACKUP_KEY);
        if (backup) {
          try {
            const backupData: DealsStoredData = JSON.parse(backup);
            console.log('✅ Deals restored from backup');
            deals = migrateDealData(backupData.deals || []);
          } catch {
            console.error('Failed to restore from backup');
          }
        }
      }

      // If migrations were applied, save the migrated data
      if (deals !== data.deals) {
        setTimeout(() => {
          dealStorage.save(deals);
          console.log('💾 Migrated deals saved to storage');
        }, 100);
      }

      console.log('📁 Deals loaded successfully:', deals.length, 'deals');
      return deals;
    } catch (error) {
      console.error('❌ Failed to load deals from localStorage:', error);
      
      // Try to restore from backup
      try {
        const backup = localStorage.getItem(DEALS_BACKUP_KEY);
        if (backup) {
          const backupData: DealsStoredData = JSON.parse(backup);
          console.log('✅ Deals restored from backup after error');
          const deals = migrateDealData(backupData.deals || []);
          return deals;
        }
      } catch {
        console.error('Failed to restore from backup');
      }
      
      return [];
    }
  },

  /**
   * Get single deal by ID
   */
  getById: (dealId: string): Deal | null => {
    const deals = dealStorage.load();
    return deals.find(d => d.id === dealId) || null;
  },

  /**
   * Add a new deal
   */
  add: (deal: Deal): { success: boolean; error?: string } => {
    const deals = dealStorage.load();
    deals.push(deal);
    return dealStorage.save(deals);
  },

  /**
   * Update an existing deal
   */
  update: (dealId: string, updates: Partial<Deal>): { success: boolean; error?: string } => {
    const deals = dealStorage.load();
    const index = deals.findIndex(d => d.id === dealId);
    
    if (index === -1) {
      return { success: false, error: 'Deal not found' };
    }

    deals[index] = {
      ...deals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return dealStorage.save(deals);
  },

  /**
   * Delete a deal
   */
  delete: (dealId: string): { success: boolean; error?: string } => {
    const deals = dealStorage.load();
    const filtered = deals.filter(d => d.id !== dealId);
    
    if (filtered.length === deals.length) {
      return { success: false, error: 'Deal not found' };
    }

    return dealStorage.save(filtered);
  },

  /**
   * Get deals statistics
   */
  getStats: () => {
    const deals = dealStorage.load();
    const activeDeals = deals.filter(d => d.status === "Active");
    
    return {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      totalValue: activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0),
      avgDealSize: activeDeals.length > 0 
        ? activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0) / activeDeals.length 
        : 0,
    };
  },

  /**
   * Export deals as JSON
   */
  export: (): string => {
    const deals = dealStorage.load();
    return JSON.stringify({ deals, exportedAt: new Date().toISOString() }, null, 2);
  },

  /**
   * Import deals from JSON
   */
  import: (jsonData: string): { success: boolean; count: number; error?: string } => {
    try {
      const parsed = JSON.parse(jsonData);
      let deals = parsed.deals || parsed;
      
      if (!Array.isArray(deals)) {
        return { success: false, count: 0, error: 'Invalid data format' };
      }

      // Apply migrations to imported data
      deals = migrateDealData(deals);

      // Validate imported data
      const validation = validateDealData(deals);
      if (!validation.valid) {
        return { 
          success: false, 
          count: 0, 
          error: `Import validation failed: ${validation.errors.join(', ')}` 
        };
      }

      // Create backup before import
      createDealsBackup();
      
      // Save imported data
      const saveResult = dealStorage.save(deals);
      if (!saveResult.success) {
        return { 
          success: false, 
          count: 0, 
          error: saveResult.error || 'Failed to save imported data' 
        };
      }

      return { success: true, count: deals.length };
    } catch (error) {
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Clear all deals
   */
  clear: (): void => {
    try {
      if (!isLocalStorageAvailable()) {
        console.warn('⚠️ LocalStorage not available, cannot clear data');
        return;
      }
      localStorage.removeItem(DEALS_STORAGE_KEY);
      console.log('🗑️ Deals cleared');
    } catch (error) {
      console.error('❌ Failed to clear deals:', error);
    }
  },

  /**
   * Add activity to a deal
   */
  addActivity: (dealId: string, activity: Deal["activities"][0]): { success: boolean; error?: string } => {
    const deals = dealStorage.load();
    const index = deals.findIndex(d => d.id === dealId);
    
    if (index === -1) {
      return { success: false, error: 'Deal not found' };
    }

    deals[index].activities.push(activity);
    deals[index].updatedAt = new Date().toISOString();

    return dealStorage.save(deals);
  },
};

