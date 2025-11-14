/**
 * Market Suggestions
 * Market intelligence and autocomplete suggestions
 */

import { getAllMarkets, getMarketSuggestions } from "./marketIntelligence";
import type { AutocompleteOption } from "../components/ui/autocomplete-input";

/**
 * Get market autocomplete options
 */
export function getMarketAutocompleteOptions(query: string): AutocompleteOption[] {
  const markets = getAllMarkets();
  const queryLower = query.toLowerCase();
  
  return markets
    .filter(market => market.toLowerCase().includes(queryLower))
    .map(market => {
      const suggestions = getMarketSuggestions(market);
      
      return {
        value: market,
        label: market,
        description: suggestions
          ? `Avg: ${suggestions.rsfRange.avg.toLocaleString()} RSF, $${suggestions.rentRate.toFixed(2)}/SF/yr`
          : undefined,
        metadata: suggestions ? {
          avgRSF: suggestions.rsfRange.avg,
          avgRentRate: suggestions.rentRate,
          avgLeaseTerm: suggestions.leaseTerm,
        } : undefined,
      };
    });
}

/**
 * Get client name suggestions from deals
 */
export function getClientNameSuggestions(query: string, deals: Array<{ clientName: string; clientCompany?: string }>): AutocompleteOption[] {
  const queryLower = query.toLowerCase();
  const matches = new Set<string>();
  
  deals.forEach(deal => {
    if (deal.clientName.toLowerCase().includes(queryLower)) {
      matches.add(deal.clientName);
    }
    if (deal.clientCompany && deal.clientCompany.toLowerCase().includes(queryLower)) {
      matches.add(deal.clientCompany);
    }
  });
  
  return Array.from(matches).map(name => ({
    value: name,
    label: name,
    description: "Previous client",
  }));
}

