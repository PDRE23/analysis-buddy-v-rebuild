/**
 * Workflows - Workflow definitions and execution logic
 * Common workflows reduced to single click or keyboard shortcut
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "@/types";
import { nanoid } from "nanoid";

/**
 * Extract structured data from email content
 * Attempts to parse client name, RSF, location, timeline from email text
 */
export interface EmailExtractedData {
  clientName?: string;
  rsf?: number;
  location?: {
    address?: string;
    city?: string;
    state?: string;
  };
  timeline?: string;
  notes?: string;
}

export function extractDataFromEmail(emailContent: string): EmailExtractedData {
  const extracted: EmailExtractedData = {};
  
  // Extract client name (look for patterns like "Client:", "Tenant:", "Company:")
  const clientPatterns = [
    /(?:client|tenant|company|prospect):\s*([A-Z][A-Za-z\s&]+)/i,
    /([A-Z][A-Za-z\s&]+)\s+(?:is|needs|looking|wants)/i,
  ];
  
  for (const pattern of clientPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      extracted.clientName = match[1].trim();
      break;
    }
  }
  
  // Extract RSF (look for patterns like "10,000 SF", "10k sf", "10000 square feet")
  const rsfPatterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:sf|square\s*feet|rsf)/i,
    /(\d+(?:\.\d+)?)\s*(?:k|thousand)\s*(?:sf|square\s*feet)/i,
  ];
  
  for (const pattern of rsfPatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      const value = match[1].replace(/,/g, "");
      const numValue = parseFloat(value);
      if (numValue && !isNaN(numValue)) {
        extracted.rsf = numValue >= 1000 ? numValue : numValue * 1000; // Convert k to thousands
      }
      break;
    }
  }
  
  // Extract location (look for city, state patterns)
  const locationPattern = /([A-Z][A-Za-z\s]+),\s*([A-Z]{2})/;
  const locationMatch = emailContent.match(locationPattern);
  if (locationMatch) {
    extracted.location = {
      city: locationMatch[1].trim(),
      state: locationMatch[2].trim(),
    };
  }
  
  // Extract address (look for street address patterns)
  const addressPattern = /\d+\s+[A-Z][A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)/i;
  const addressMatch = emailContent.match(addressPattern);
  if (addressMatch) {
    if (!extracted.location) extracted.location = {};
    extracted.location.address = addressMatch[0].trim();
  }
  
  // Extract timeline (look for date patterns or "Q1", "next month", etc.)
  const timelinePatterns = [
    /(?:need|required|by|deadline)[:\s]+([A-Za-z\s\d,]+)/i,
    /(Q[1-4]\s+\d{4})/i,
    /(?:in|within)\s+(\d+)\s+(?:weeks?|months?|days?)/i,
  ];
  
  for (const pattern of timelinePatterns) {
    const match = emailContent.match(pattern);
    if (match && match[1]) {
      extracted.timeline = match[1].trim();
      break;
    }
  }
  
  return extracted;
}

/**
 * Create deal from email content
 */
export function createDealFromEmail(
  emailContent: string,
  broker: string = "User"
): Omit<Deal, "id" | "createdAt" | "updatedAt" | "activities"> {
  const extracted = extractDataFromEmail(emailContent);
  
  const deal: Omit<Deal, "id" | "createdAt" | "updatedAt" | "activities"> = {
    clientName: extracted.clientName || "New Client",
    clientCompany: extracted.clientName,
    property: {
      address: extracted.location?.address || "",
      city: extracted.location?.city || "",
      state: extracted.location?.state || "",
    },
    stage: "Lead",
    priority: "Medium",
    rsf: extracted.rsf || 0,
    leaseTerm: 60, // Default 5 years
    broker: broker,
    status: "Active",
    notes: extracted.notes || emailContent.substring(0, 500),
    analysisIds: [],
    tags: [],
  };
  
  return deal;
}

/**
 * Quick proposal creation workflow
 * Creates analysis with deal data pre-filled
 */
export function createQuickProposal(
  deal: Deal
): Partial<AnalysisMeta> {
  const today = new Date().toISOString().split("T")[0];
  const expiration = new Date();
  expiration.setFullYear(expiration.getFullYear() + (deal.leaseTerm / 12 || 5));
  
  const rentStart = new Date(today);
  rentStart.setMonth(rentStart.getMonth() + 1);
  
  return {
    name: `${deal.clientName} - Proposal`,
    tenant_name: deal.clientName,
    market: `${deal.property.city}, ${deal.property.state}`,
    rsf: deal.rsf,
    lease_type: "FS",
    key_dates: {
      commencement: today,
      rent_start: rentStart.toISOString().split("T")[0],
      expiration: expiration.toISOString().split("T")[0],
    },
    operating: {},
    rent_schedule: [],
    concessions: {},
    options: [],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: "annual",
    },
    proposals: [],
    status: "Draft",
  };
}

/**
 * Export and email workflow
 * Creates export and prepares email
 */
export interface ExportEmailData {
  subject: string;
  body: string;
  attachmentName?: string;
}

export function prepareExportEmail(
  deal: Deal,
  analysis?: AnalysisMeta,
  format: "pdf" | "excel" = "pdf"
): ExportEmailData {
  const clientName = deal.clientName;
  const propertyAddress = `${deal.property.address}, ${deal.property.city}, ${deal.property.state}`;
  
  const subject = analysis
    ? `Proposal for ${clientName} - ${propertyAddress}`
    : `Deal Summary for ${clientName} - ${propertyAddress}`;
  
  const body = `Dear ${clientName},

Please find attached the ${analysis ? "proposal" : "deal summary"} for ${propertyAddress}.

${analysis ? "This proposal includes:" : "This deal summary includes:"}
${analysis ? `- Property: ${analysis.rsf.toLocaleString()} RSF` : `- Property: ${deal.rsf.toLocaleString()} RSF`}
${analysis ? `- Lease Type: ${analysis.lease_type}` : `- Lease Term: ${deal.leaseTerm} months`}
${analysis ? `- Market: ${analysis.market}` : ""}

Please let me know if you have any questions.

Best regards,
${deal.broker}`;

  const attachmentName = analysis
    ? `${clientName}_${analysis.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.${format}`
    : `${clientName}_Deal_Summary_${new Date().toISOString().split("T")[0]}.${format}`;

  return {
    subject,
    body,
    attachmentName,
  };
}

/**
 * Open email client with prepared data
 */
export function openEmailClient(data: ExportEmailData): void {
  const subject = encodeURIComponent(data.subject);
  const body = encodeURIComponent(data.body);
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
  
  window.location.href = mailtoLink;
}

/**
 * Duplicate and modify workflow
 */
export function duplicateDeal(deal: Deal): Deal {
  return {
    ...deal,
    id: nanoid(),
    clientName: `Copy of ${deal.clientName}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activities: [
      {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        type: "note",
        description: "Deal duplicated",
      },
    ],
  };
}

export function duplicateAnalysis(analysis: AnalysisMeta): AnalysisMeta {
  return {
    ...analysis,
    id: nanoid(),
    name: `Copy of ${analysis.name}`,
    status: "Draft" as const,
    proposals: [],
  };
}

/**
 * Stage progression shortcuts
 * Map number keys 1-9 to stages
 */
export function getStageFromShortcut(key: string): string | null {
  const stageMap: Record<string, string> = {
    "1": "Lead",
    "2": "Qualification",
    "3": "Proposal",
    "4": "Negotiation",
    "5": "Closing",
    "6": "Closed Won",
    "7": "Closed Lost",
  };
  
  return stageMap[key] || null;
}

