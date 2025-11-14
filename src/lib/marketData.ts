/**
 * Market Data Integration
 * Store and retrieve market data for comparison and benchmarking
 */

import { nanoid } from "nanoid";

export interface MarketDataPoint {
  id: string;
  market: string;
  propertyType: "office" | "retail" | "industrial" | "medical" | "warehouse";
  submarket?: string;
  avgRentPSF: number;
  avgLeaseTerm: number;
  avgTIAllowance: number;
  avgFreeRentMonths: number;
  vacancyRate: number;
  absorptionRate: number;
  date: string;
  source?: string;
  notes?: string;
}

export interface ComparableProperty {
  id: string;
  name: string;
  address: string;
  market: string;
  propertyType: "office" | "retail" | "industrial" | "medical" | "warehouse";
  rsf: number;
  rentPSF: number;
  leaseTerm: number;
  tiAllowance: number;
  freeRentMonths: number;
  buildingClass: "A" | "B" | "C" | "N/A";
  yearBuilt?: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

const MARKET_DATA_STORAGE_KEY = "market-data";
const COMP_DATABASE_STORAGE_KEY = "comp-database";

/**
 * Save market data point
 */
export function saveMarketDataPoint(data: Omit<MarketDataPoint, "id">): MarketDataPoint {
  const allData = getAllMarketData();
  const newPoint: MarketDataPoint = {
    ...data,
    id: nanoid(),
  };
  
  allData.push(newPoint);
  localStorage.setItem(MARKET_DATA_STORAGE_KEY, JSON.stringify(allData));
  
  return newPoint;
}

/**
 * Get market data for a market
 */
export function getMarketData(
  market: string,
  propertyType?: string
): MarketDataPoint[] {
  const allData = getAllMarketData();
  return allData.filter(point => {
    if (point.market.toLowerCase() !== market.toLowerCase()) return false;
    if (propertyType && point.propertyType !== propertyType) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get average market metrics
 */
export function getAverageMarketMetrics(
  market: string,
  propertyType?: string
): {
  avgRentPSF: number;
  avgLeaseTerm: number;
  avgTIAllowance: number;
  avgFreeRentMonths: number;
  avgVacancyRate: number;
  avgAbsorptionRate: number;
} | null {
  const data = getMarketData(market, propertyType);
  
  if (data.length === 0) return null;

  const avgRentPSF = data.reduce((sum, d) => sum + d.avgRentPSF, 0) / data.length;
  const avgLeaseTerm = data.reduce((sum, d) => sum + d.avgLeaseTerm, 0) / data.length;
  const avgTIAllowance = data.reduce((sum, d) => sum + d.avgTIAllowance, 0) / data.length;
  const avgFreeRentMonths = data.reduce((sum, d) => sum + d.avgFreeRentMonths, 0) / data.length;
  const avgVacancyRate = data.reduce((sum, d) => sum + d.vacancyRate, 0) / data.length;
  const avgAbsorptionRate = data.reduce((sum, d) => sum + d.absorptionRate, 0) / data.length;

  return {
    avgRentPSF,
    avgLeaseTerm,
    avgTIAllowance,
    avgFreeRentMonths,
    avgVacancyRate,
    avgAbsorptionRate,
  };
}

/**
 * Get all market data
 */
function getAllMarketData(): MarketDataPoint[] {
  try {
    const stored = localStorage.getItem(MARKET_DATA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save comparable property
 */
export function saveComparableProperty(
  comp: Omit<ComparableProperty, "id" | "createdAt">
): ComparableProperty {
  const allComps = getAllComparableProperties();
  const newComp: ComparableProperty = {
    ...comp,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  
  allComps.push(newComp);
  localStorage.setItem(COMP_DATABASE_STORAGE_KEY, JSON.stringify(allComps));
  
  return newComp;
}

/**
 * Get comparable properties
 */
export function getComparableProperties(
  filters?: {
    market?: string;
    propertyType?: string;
    minRSF?: number;
    maxRSF?: number;
    buildingClass?: string;
  }
): ComparableProperty[] {
  const allComps = getAllComparableProperties();
  
  return allComps.filter(comp => {
    if (filters?.market && comp.market.toLowerCase() !== filters.market.toLowerCase()) {
      return false;
    }
    if (filters?.propertyType && comp.propertyType !== filters.propertyType) {
      return false;
    }
    if (filters?.minRSF && comp.rsf < filters.minRSF) {
      return false;
    }
    if (filters?.maxRSF && comp.rsf > filters.maxRSF) {
      return false;
    }
    if (filters?.buildingClass && comp.buildingClass !== filters.buildingClass) {
      return false;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all comparable properties
 */
function getAllComparableProperties(): ComparableProperty[] {
  try {
    const stored = localStorage.getItem(COMP_DATABASE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Calculate competitiveness score
 */
export function calculateCompetitivenessScore(
  dealRentPSF: number,
  dealTIAllowance: number,
  dealFreeRentMonths: number,
  marketData: MarketDataPoint | { avgRentPSF: number; avgTIAllowance: number; avgFreeRentMonths: number }
): {
  score: number; // 0-100
  rentScore: number;
  tiScore: number;
  freeRentScore: number;
  breakdown: {
    rent: { value: number; marketAvg: number; percentDiff: number };
    tiAllowance: { value: number; marketAvg: number; percentDiff: number };
    freeRent: { value: number; marketAvg: number; percentDiff: number };
  };
} {
  const marketAvg = marketData.avgRentPSF;
  const marketTI = marketData.avgTIAllowance;
  const marketFreeRent = marketData.avgFreeRentMonths;

  // Calculate percent differences
  const rentDiff = ((dealRentPSF - marketAvg) / marketAvg) * 100;
  const tiDiff = marketTI > 0 ? ((dealTIAllowance - marketTI) / marketTI) * 100 : 0;
  const freeRentDiff = marketFreeRent > 0 ? ((dealFreeRentMonths - marketFreeRent) / marketFreeRent) * 100 : 0;

  // Score each component (0-100, higher is better)
  // For rent: lower is better (more competitive)
  const rentScore = Math.max(0, Math.min(100, 100 - Math.abs(rentDiff) * 2));
  
  // For TI: higher is better (more generous)
  const tiScore = tiDiff >= 0 ? Math.min(100, 50 + tiDiff * 2) : Math.max(0, 50 + tiDiff * 2);
  
  // For free rent: higher is better (more generous)
  const freeRentScore = freeRentDiff >= 0 ? Math.min(100, 50 + freeRentDiff * 10) : Math.max(0, 50 + freeRentDiff * 10);

  // Weighted average (rent is most important)
  const score = (rentScore * 0.5) + (tiScore * 0.3) + (freeRentScore * 0.2);

  return {
    score: Math.round(score),
    rentScore: Math.round(rentScore),
    tiScore: Math.round(tiScore),
    freeRentScore: Math.round(freeRentScore),
    breakdown: {
      rent: {
        value: dealRentPSF,
        marketAvg,
        percentDiff: rentDiff,
      },
      tiAllowance: {
        value: dealTIAllowance,
        marketAvg: marketTI,
        percentDiff: tiDiff,
      },
      freeRent: {
        value: dealFreeRentMonths,
        marketAvg: marketFreeRent,
        percentDiff: freeRentDiff,
      },
    },
  };
}

