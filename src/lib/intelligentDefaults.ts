/**
 * Intelligent Defaults - Core intelligence engine with pattern recognition
 * Provides smart suggestions based on historical data and patterns
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";
import { dealStorage } from "./dealStorage";
import { storage } from "./storage";
import { getMarketSuggestions, getAllMarkets } from "./marketIntelligence";
export { getAllMarkets } from "./marketIntelligence";

/**
 * Simple fuzzy string matching
 */
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Character sequence match
  let matches = 0;
  let s2Index = 0;
  for (let i = 0; i < s1.length && s2Index < s2.length; i++) {
    if (s1[i] === s2[s2Index]) {
      matches++;
      s2Index++;
    }
  }
  
  return matches / Math.max(s1.length, s2.length);
}

/**
 * Find similar client names
 */
export function findSimilarClients(clientName: string, threshold = 0.6): Deal[] {
  if (!clientName || clientName.trim().length < 2) return [];
  
  const deals = dealStorage.load();
  const matches = deals
    .map(deal => ({
      deal,
      score: Math.max(
        fuzzyMatch(clientName, deal.clientName),
        deal.clientCompany ? fuzzyMatch(clientName, deal.clientCompany) : 0
      ),
    }))
    .filter(m => m.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(m => m.deal);
  
  return matches;
}

/**
 * Get client pattern data (previous deals for similar client names)
 */
export interface ClientPattern {
  clientName: string;
  previousDeals: Deal[];
  avgRSF: number;
  avgLeaseTerm: number;
  typicalConcessions: {
    tiAllowance?: number;
    movingAllowance?: number;
  };
  preferredLeaseType?: string;
}

export function getClientPattern(clientName: string): ClientPattern | null {
  const similarClients = findSimilarClients(clientName, 0.7);
  
  if (similarClients.length === 0) return null;
  
  const rsfValues = similarClients.map(d => d.rsf).filter(r => r > 0);
  const termValues = similarClients.map(d => {
    // Calculate term from leaseTerm field or estimate
    return d.leaseTerm || 5; // Default to 5 years if not specified
  });
  
  // Get typical concessions from analyses
  const analyses = storage.load() as AnalysisMeta[];
  const clientAnalyses = analyses.filter(a => 
    fuzzyMatch(clientName, a.tenant_name) >= 0.7
  );
  
  const tiAllowances = clientAnalyses
    .map(a => a.concessions?.ti_allowance_psf)
    .filter(ti => ti !== undefined && ti > 0) as number[];
  
  const movingAllowances = clientAnalyses
    .map(a => a.concessions?.moving_allowance)
    .filter(m => m !== undefined && m > 0) as number[];
  
  const leaseTypes = clientAnalyses.map(a => a.lease_type).filter(Boolean);
  
  return {
    clientName: similarClients[0].clientName,
    previousDeals: similarClients,
    avgRSF: rsfValues.length > 0 
      ? Math.round(rsfValues.reduce((a, b) => a + b, 0) / rsfValues.length)
      : 0,
    avgLeaseTerm: termValues.length > 0
      ? Math.round(termValues.reduce((a, b) => a + b, 0) / termValues.length)
      : 5,
    typicalConcessions: {
      tiAllowance: tiAllowances.length > 0
        ? Math.round(tiAllowances.reduce((a, b) => a + b, 0) / tiAllowances.length * 100) / 100
        : undefined,
      movingAllowance: movingAllowances.length > 0
        ? Math.round(movingAllowances.reduce((a, b) => a + b, 0) / movingAllowances.length)
        : undefined,
    },
    preferredLeaseType: leaseTypes[0] || undefined,
  };
}

/**
 * Get smart date suggestions
 */
export interface DateSuggestions {
  rentStart: string; // ISO date string
  expiration: string; // ISO date string
  earlyAccess?: string; // ISO date string
}

export function getDateSuggestions(commencement: string): DateSuggestions {
  const commencementDate = new Date(commencement);
  
  // Rent start: 1 month after commencement
  const rentStart = new Date(commencementDate);
  rentStart.setMonth(rentStart.getMonth() + 1);
  
  // Expiration: 5 years from commencement (default)
  const expiration = new Date(commencementDate);
  expiration.setFullYear(expiration.getFullYear() + 5);
  
  // Early access: 30 days before commencement
  const earlyAccess = new Date(commencementDate);
  earlyAccess.setDate(earlyAccess.getDate() - 30);
  
  return {
    rentStart: rentStart.toISOString().split("T")[0],
    expiration: expiration.toISOString().split("T")[0],
    earlyAccess: earlyAccess.toISOString().split("T")[0],
  };
}

/**
 * Get intelligent RSF suggestions based on property type
 */
export interface RSFSuggestion {
  suggested: number;
  range: { min: number; max: number };
  note?: string;
}

export function getRSFSuggestion(
  input: string,
  propertyType?: string
): RSFSuggestion | null {
  // If input looks like "10,000 SF" or "10k sf", extract the number
  const cleaned = input.replace(/[^\d.]/g, "");
  const numericValue = parseFloat(cleaned);
  
  if (isNaN(numericValue)) return null;
  
  // Common RSF multipliers based on property type
  const multipliers: Record<string, number> = {
    office: 1.0, // RSF = USF typically
    retail: 1.0,
    industrial: 1.0,
    medical: 1.1, // Medical often has higher load factor
    warehouse: 1.0,
  };
  
  const multiplier = propertyType 
    ? multipliers[propertyType.toLowerCase()] || 1.0
    : 1.0;
  
  const suggested = Math.round(numericValue * multiplier);
  
  // Suggest range ±20%
  const range = {
    min: Math.round(suggested * 0.8),
    max: Math.round(suggested * 1.2),
  };
  
  return {
    suggested,
    range,
    note: propertyType 
      ? `Based on ${propertyType} property type`
      : undefined,
  };
}

/**
 * Get market-based suggestions
 */
export function getMarketBasedSuggestions(market: string) {
  return getMarketSuggestions(market);
}

/**
 * Get all suggestions for a new deal
 */
export interface DealSuggestions {
  clientPattern?: ClientPattern;
  marketSuggestions?: ReturnType<typeof getMarketSuggestions>;
  dateSuggestions: DateSuggestions;
  rsfSuggestion?: RSFSuggestion;
  suggestedMarkets: string[];
}

export function getDealSuggestions(
  clientName?: string,
  market?: string,
  rsfInput?: string,
  commencement?: string
): DealSuggestions {
  const suggestions: DealSuggestions = {
    dateSuggestions: commencement 
      ? getDateSuggestions(commencement)
      : getDateSuggestions(new Date().toISOString().split("T")[0]),
    suggestedMarkets: getAllMarkets(),
  };
  
  if (clientName) {
    suggestions.clientPattern = getClientPattern(clientName);
  }
  
  if (market) {
    suggestions.marketSuggestions = getMarketBasedSuggestions(market);
  }
  
  if (rsfInput) {
    suggestions.rsfSuggestion = getRSFSuggestion(rsfInput);
  }
  
  return suggestions;
}

/**
 * Get all suggestions for a new analysis
 */
export interface AnalysisSuggestions {
  marketSuggestions?: ReturnType<typeof getMarketSuggestions>;
  dateSuggestions: DateSuggestions;
  rsfSuggestion?: RSFSuggestion;
  suggestedMarkets: string[];
}

export function getAnalysisSuggestions(
  tenantName?: string,
  market?: string,
  rsfInput?: string,
  commencement?: string
): AnalysisSuggestions {
  const suggestions: AnalysisSuggestions = {
    dateSuggestions: commencement
      ? getDateSuggestions(commencement)
      : getDateSuggestions(new Date().toISOString().split("T")[0]),
    suggestedMarkets: getAllMarkets(),
  };
  
  if (market) {
    suggestions.marketSuggestions = getMarketBasedSuggestions(market);
  }
  
  if (rsfInput) {
    suggestions.rsfSuggestion = getRSFSuggestion(rsfInput);
  }
  
  return suggestions;
}

