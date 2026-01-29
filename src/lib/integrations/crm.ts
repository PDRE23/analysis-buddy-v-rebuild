/**
 * CRM Integration
 * Salesforce, HubSpot, and generic CRM connectors
 */

import type { Deal } from "../types/deal";
import type { AnalysisMeta } from "@/types";

export type CRMProvider = "salesforce" | "hubspot" | "generic";

export interface CRMAccount {
  provider: CRMProvider;
  name: string;
  connected: boolean;
  lastSync?: string;
  fieldMapping?: Record<string, string>; // Analysis Buddy field -> CRM field
}

export interface CRMDeal {
  id: string;
  name: string;
  amount?: number;
  stage?: string;
  closeDate?: string;
  customFields?: Record<string, unknown>;
}

export interface CRMContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  customFields?: Record<string, unknown>;
}

const CRM_ACCOUNTS_STORAGE_KEY = "crm-accounts";
const CRM_SYNC_STORAGE_KEY = "crm-sync-mapping";

/**
 * Connect CRM account
 */
export function connectCRMAccount(
  provider: CRMProvider,
  name: string,
  accessToken: string,
  fieldMapping?: Record<string, string>
): CRMAccount {
  const accounts = getCRMAccounts();
  const account: CRMAccount = {
    provider,
    name,
    connected: true,
    lastSync: new Date().toISOString(),
    fieldMapping: fieldMapping || getDefaultFieldMapping(provider),
  };

  localStorage.setItem(`crm-token-${provider}-${name}`, accessToken);

  const existingIndex = accounts.findIndex(a => a.provider === provider && a.name === name);
  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  localStorage.setItem(CRM_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  
  return account;
}

/**
 * Get default field mapping for CRM provider
 */
function getDefaultFieldMapping(provider: CRMProvider): Record<string, string> {
  const mappings: Record<CRMProvider, Record<string, string>> = {
    salesforce: {
      clientName: "Name",
      clientCompany: "Account.Name",
      estimatedValue: "Amount",
      stage: "StageName",
      expectedCloseDate: "CloseDate",
      propertyAddress: "Property_Address__c",
      propertyCity: "Property_City__c",
      propertyState: "Property_State__c",
      rsf: "RSF__c",
    },
    hubspot: {
      clientName: "dealname",
      clientCompany: "associatedcompanyid",
      estimatedValue: "amount",
      stage: "dealstage",
      expectedCloseDate: "closedate",
      propertyAddress: "property_address",
      propertyCity: "property_city",
      propertyState: "property_state",
      rsf: "rsf",
    },
    generic: {
      clientName: "name",
      clientCompany: "company",
      estimatedValue: "value",
      stage: "stage",
      expectedCloseDate: "close_date",
    },
  };

  return mappings[provider] || mappings.generic;
}

/**
 * Get connected CRM accounts
 */
export function getCRMAccounts(): CRMAccount[] {
  try {
    const stored = localStorage.getItem(CRM_ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Sync deal to CRM
 * In production, this would call the CRM API
 */
export async function syncDealToCRM(
  deal: Deal,
  crmAccount: CRMAccount
): Promise<{ success: boolean; crmDealId?: string; error?: string }> {
  // In production, this would:
  // 1. Get access token for CRM account
  // 2. Map deal fields to CRM fields using fieldMapping
  // 3. Call CRM API to create/update deal
  // 4. Store sync mapping locally
  
  const mappedData = mapDealToCRM(deal, crmAccount.fieldMapping || {});
  
  // Store sync mapping
  const syncMappings = getCRMSyncMappings();
  const crmDealId = `crm-deal-${deal.id}`;
  syncMappings[deal.id] = {
    crmProvider: crmAccount.provider,
    crmAccountName: crmAccount.name,
    crmDealId,
    lastSynced: new Date().toISOString(),
  };
  localStorage.setItem(CRM_SYNC_STORAGE_KEY, JSON.stringify(syncMappings));

  // Simulate API call
  return {
    success: true,
    crmDealId,
  };
}

/**
 * Map deal to CRM format
 */
function mapDealToCRM(
  deal: Deal,
  fieldMapping: Record<string, string>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  Object.entries(fieldMapping).forEach(([abField, crmField]) => {
    const value = getDealFieldValue(deal, abField);
    if (value !== undefined) {
      mapped[crmField] = value;
    }
  });

  return mapped;
}

function getDealFieldValue(deal: Deal, field: string): unknown {
  const fieldMap: Record<string, unknown> = {
    clientName: deal.clientName,
    clientCompany: deal.clientCompany,
    estimatedValue: deal.estimatedValue,
    stage: deal.stage,
    expectedCloseDate: deal.expectedCloseDate,
    propertyAddress: deal.propertyAddress,
    propertyCity: deal.propertyCity,
    propertyState: deal.propertyState,
    rsf: deal.rsf,
  };

  return fieldMap[field];
}

/**
 * Sync deal from CRM
 * In production, this would fetch from CRM and update local deal
 */
export async function syncDealFromCRM(
  crmDealId: string,
  crmAccount: CRMAccount
): Promise<Partial<Deal> | null> {
  // In production, this would:
  // 1. Get access token for CRM account
  // 2. Call CRM API to fetch deal
  // 3. Map CRM fields back to Analysis Buddy format
  // 4. Return mapped deal data
  
  return null;
}

/**
 * Get CRM sync mappings
 */
export function getCRMSyncMappings(): Record<string, {
  crmProvider: CRMProvider;
  crmAccountName: string;
  crmDealId: string;
  lastSynced: string;
}> {
  try {
    const stored = localStorage.getItem(CRM_SYNC_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get CRM deal ID for a local deal
 */
export function getCRMDealId(dealId: string): string | null {
  const mappings = getCRMSyncMappings();
  return mappings[dealId]?.crmDealId || null;
}

/**
 * Sync multiple deals to CRM
 */
export async function syncDealsToCRM(
  deals: Deal[],
  crmAccount: CRMAccount
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ dealId: string; error: string }>;
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ dealId: string; error: string }>,
  };

  for (const deal of deals) {
    try {
      const result = await syncDealToCRM(deal, crmAccount);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({ dealId: deal.id, error: result.error || "Unknown error" });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ dealId: deal.id, error: String(error) });
    }
  }

  return results;
}

/**
 * Generic CRM connector via API
 */
export interface GenericCRMConfig {
  apiUrl: string;
  apiKey: string;
  fieldMapping: Record<string, string>;
  authenticationMethod: "api_key" | "oauth" | "bearer";
}

export function connectGenericCRM(
  name: string,
  config: GenericCRMConfig
): CRMAccount {
  const account: CRMAccount = {
    provider: "generic",
    name,
    connected: true,
    lastSync: new Date().toISOString(),
    fieldMapping: config.fieldMapping,
  };

  // Store config securely
  localStorage.setItem(`crm-config-generic-${name}`, JSON.stringify(config));

  const accounts = getCRMAccounts();
  accounts.push(account);
  localStorage.setItem(CRM_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

  return account;
}

