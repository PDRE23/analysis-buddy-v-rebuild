/**
 * Market Intelligence - Market data storage and retrieval
 * Stores historical deal data per market to provide intelligent suggestions
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";
import { dealStorage } from "./dealStorage";
import { storage } from "./storage";

export interface MarketData {
  market: string;
  deals: Deal[];
  analyses: AnalysisMeta[];
  stats: {
    avgRSF: number;
    minRSF: number;
    maxRSF: number;
    avgRentPSF: number;
    avgLeaseTerm: number;
    avgTIAllowance: number;
    avgMovingAllowance: number;
    commonLeaseTypes: string[];
    commonTerms: number[];
  };
  lastUpdated: string;
}

const MARKET_INTELLIGENCE_KEY = "market-intelligence";
const MARKET_INTELLIGENCE_VERSION = "1.0";

/**
 * Get all deals and analyses for a specific market
 */
function getMarketDealsAndAnalyses(market: string): { deals: Deal[]; analyses: AnalysisMeta[] } {
  const deals = dealStorage.load();
  const analyses = storage.load() as AnalysisMeta[];
  
  // Normalize market names for matching (case-insensitive, trim)
  const normalizeMarket = (m: string) => m.toLowerCase().trim();
  const normalizedMarket = normalizeMarket(market);
  
  const marketDeals = deals.filter(deal => {
    // Check property city/state as market indicator
    const dealLocation = `${deal.property.city}, ${deal.property.state}`.toLowerCase();
    return normalizeMarket(dealLocation).includes(normalizedMarket) ||
           normalizedMarket.includes(dealLocation);
  });
  
  const marketAnalyses = analyses.filter(analysis => 
    normalizeMarket(analysis.market || "").includes(normalizedMarket) ||
    normalizedMarket.includes(normalizeMarket(analysis.market || ""))
  );
  
  return { deals: marketDeals, analyses: marketAnalyses };
}

/**
 * Calculate market statistics from deals and analyses
 */
function calculateMarketStats(
  deals: Deal[],
  analyses: AnalysisMeta[]
): MarketData["stats"] {
  const allRSF = [
    ...deals.map(d => d.rsf),
    ...analyses.map(a => a.rsf).filter(r => r > 0),
  ];
  
  const allRentRates = analyses
    .flatMap(a => a.rent_schedule || [])
    .map(r => r.rent_psf)
    .filter(r => r > 0);
  
  const allTerms = analyses.map(a => {
    const commencement = new Date(a.key_dates.commencement);
    const expiration = new Date(a.key_dates.expiration);
    return (expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }).filter(t => t > 0);
  
  const allTIAllowances = analyses
    .map(a => a.concessions?.ti_allowance_psf)
    .filter(ti => ti !== undefined && ti > 0) as number[];
  
  const allMovingAllowances = analyses
    .map(a => a.concessions?.moving_allowance)
    .filter(m => m !== undefined && m > 0) as number[];
  
  const leaseTypes = analyses.map(a => a.lease_type).filter(Boolean);
  const termYears = allTerms.map(t => Math.round(t));
  
  return {
    avgRSF: allRSF.length > 0 ? allRSF.reduce((a, b) => a + b, 0) / allRSF.length : 0,
    minRSF: allRSF.length > 0 ? Math.min(...allRSF) : 0,
    maxRSF: allRSF.length > 0 ? Math.max(...allRSF) : 0,
    avgRentPSF: allRentRates.length > 0 
      ? allRentRates.reduce((a, b) => a + b, 0) / allRentRates.length 
      : 0,
    avgLeaseTerm: allTerms.length > 0 
      ? allTerms.reduce((a, b) => a + b, 0) / allTerms.length 
      : 5, // Default to 5 years
    avgTIAllowance: allTIAllowances.length > 0
      ? allTIAllowances.reduce((a, b) => a + b, 0) / allTIAllowances.length
      : 0,
    avgMovingAllowance: allMovingAllowances.length > 0
      ? allMovingAllowances.reduce((a, b) => a + b, 0) / allMovingAllowances.length
      : 0,
    commonLeaseTypes: [...new Set(leaseTypes)],
    commonTerms: [...new Set(termYears)],
  };
}

/**
 * Get market intelligence for a specific market
 */
export function getMarketIntelligence(market: string): MarketData | null {
  if (!market || !market.trim()) return null;
  
  try {
    const stored = localStorage.getItem(MARKET_INTELLIGENCE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as Record<string, MarketData>;
      const normalizedMarket = market.toLowerCase().trim();
      
      // Try exact match first
      if (data[normalizedMarket]) {
        return data[normalizedMarket];
      }
      
      // Try partial match
      for (const [key, value] of Object.entries(data)) {
        if (key.includes(normalizedMarket) || normalizedMarket.includes(key)) {
          return value;
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  // Calculate fresh market data
  const { deals, analyses } = getMarketDealsAndAnalyses(market);
  
  if (deals.length === 0 && analyses.length === 0) {
    return null;
  }
  
  const stats = calculateMarketStats(deals, analyses);
  
  return {
    market,
    deals,
    analyses,
    stats,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update market intelligence cache
 */
export function updateMarketIntelligence(market: string): void {
  if (!market || !market.trim()) return;
  
  const normalizedMarket = market.toLowerCase().trim();
  const intelligence = getMarketIntelligence(market);
  
  if (!intelligence) return;
  
  try {
    const stored = localStorage.getItem(MARKET_INTELLIGENCE_KEY);
    const data = stored ? (JSON.parse(stored) as Record<string, MarketData>) : {};
    
    data[normalizedMarket] = intelligence;
    
    localStorage.setItem(
      MARKET_INTELLIGENCE_KEY,
      JSON.stringify({
        ...data,
        version: MARKET_INTELLIGENCE_VERSION,
      })
    );
  } catch {
    // Ignore errors
  }
}

/**
 * Get suggestions for a market
 */
export interface MarketSuggestions {
  rsfRange: { min: number; max: number; avg: number };
  rentRate: number;
  leaseTerm: number;
  tiAllowance: number;
  movingAllowance: number;
  commonLeaseType: string;
  commonTerm: number;
}

export function getMarketSuggestions(market: string): MarketSuggestions | null {
  const intelligence = getMarketIntelligence(market);
  
  if (!intelligence) return null;
  
  const { stats } = intelligence;
  
  return {
    rsfRange: {
      min: stats.minRSF,
      max: stats.maxRSF,
      avg: Math.round(stats.avgRSF),
    },
    rentRate: Math.round(stats.avgRentPSF * 100) / 100,
    leaseTerm: Math.round(stats.avgLeaseTerm),
    tiAllowance: Math.round(stats.avgTIAllowance * 100) / 100,
    movingAllowance: Math.round(stats.avgMovingAllowance),
    commonLeaseType: stats.commonLeaseTypes[0] || "FS",
    commonTerm: stats.commonTerms[0] || 5,
  };
}

/**
 * Get all known markets
 */
export function getAllMarkets(): string[] {
  try {
    const deals = dealStorage.load();
    const analyses = storage.load() as AnalysisMeta[];
    
    const markets = new Set<string>();
    
    deals.forEach(deal => {
      if (deal.property.city && deal.property.state) {
        markets.add(`${deal.property.city}, ${deal.property.state}`);
      }
    });
    
    analyses.forEach(analysis => {
      if (analysis.market) {
        markets.add(analysis.market);
      }
    });
    
    return Array.from(markets).sort();
  } catch {
    return [];
  }
}

