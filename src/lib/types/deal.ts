/**
 * Deal Pipeline Data Model
 * Wraps multiple analyses into a deal with stage tracking
 */

import type { AnalysisMeta } from "@/types";
import type { CommissionStructure } from "@/lib/commission";

export type DealStage = 
  | "Lead" 
  | "Touring" 
  | "Proposal" 
  | "Lease Execution" 
  | "Closed Won" 
  | "Closed Lost";

export type DealPriority = "High" | "Medium" | "Low";

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  category?: 'general' | 'financial' | 'legal' | 'property';
}

export interface Comment {
  id: string;
  content: string;
  timestamp: string;
  userId: string;
  userName?: string;
  parentId?: string; // for threading
}

export interface DealContact {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  role?: string; // e.g., "Tenant Rep", "Decision Maker"
}

export interface PropertyInfo {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  building?: string;
  floor?: string;
  suite?: string;
}

export interface DealActivity {
  id: string;
  timestamp: string; // ISO date
  type: "note" | "stage_change" | "analysis_added" | "analysis_updated" | "contact_added" | "email";
  description: string;
  userId?: string;
  userName?: string;
}

export interface Deal {
  id: string;
  
  // Basic Info
  clientName: string;
  clientCompany?: string;
  property: PropertyInfo;
  propertyAddress?: string; // legacy convenience field for templates/integrations
  propertyCity?: string;
  propertyState?: string;
  
  // Deal Details
  stage: DealStage;
  priority: DealPriority;
  rsf: number; // Rentable Square Feet
  leaseTerm: number; // months
  expectedCloseDate?: string; // ISO date
  
  // Financial Summary
  estimatedValue?: number; // estimated commission or deal value
  
  // Broker/Team Info
  broker: string;
  brokerEmail?: string;
  teamMembers?: string[]; // Array of broker names/emails
  assignedTo?: string;
  
  // Related Analyses
  analysisIds: string[]; // References to AnalysisMeta IDs
  
  // Status & Tracking
  status: "Active" | "On Hold" | "Dead" | "Won";
  confidenceLevel?: number; // 0-100 percentage
  lostReason?: string; // If status = "Dead"
  
  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  createdBy?: string;
  tags?: string[]; // e.g., ["Renewal", "Expansion", "Cold Call"]
  
  // Activity & Notes
  activities: DealActivity[];
  notes?: string;
  detailedNotes?: Note[]; // New structured notes
  comments?: Comment[]; // New comment threads
  
  // Commission
  commissionStructure?: CommissionStructure;
  
  // Reminders & Tasks
  nextFollowUp?: string; // ISO date
  tasks?: Array<{
    id: string;
    description: string;
    completed: boolean;
    dueDate?: string;
  }>;
  
  // Files
  files?: string[]; // Array of file IDs (metadata stored separately)
  lastDailyUpdate?: string; // ISO date for daily tracking
}

export interface DealStats {
  totalDeals: number;
  activeDeals: number;
  dealsByStage: Record<DealStage, number>;
  totalValue: number;
  avgDealSize: number;
  avgDaysInStage: Record<DealStage, number>;
  conversionRate?: number; // Percentage of deals closed won
}

export interface DealFilters {
  stage?: DealStage[];
  priority?: DealPriority[];
  broker?: string[];
  status?: Deal["status"][];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  tags?: string[];
}

export type DealView = "kanban" | "list";

// Helper function to get stage color
export function getStageColor(stage: DealStage): string {
  const colors: Record<DealStage, string> = {
    "Lead": "bg-gray-200 text-gray-800",
    "Touring": "bg-blue-200 text-blue-800",
    "Proposal": "bg-purple-200 text-purple-800",
    "Lease Execution": "bg-indigo-200 text-indigo-800",
    "Closed Won": "bg-green-200 text-green-800",
    "Closed Lost": "bg-red-200 text-red-800",
  };
  return colors[stage];
}

// Helper function to get priority color
export function getPriorityColor(priority: DealPriority): string {
  const colors: Record<DealPriority, string> = {
    "High": "bg-red-100 text-red-800 border-red-300",
    "Medium": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "Low": "bg-gray-100 text-gray-600 border-gray-300",
  };
  return colors[priority];
}

// Helper function to get stage order for sorting
export function getStageOrder(stage: DealStage): number {
  const order: Record<DealStage, number> = {
    "Lead": 1,
    "Touring": 2,
    "Proposal": 3,
    "Lease Execution": 4,
    "Closed Won": 5,
    "Closed Lost": 6,
  };
  return order[stage];
}

// Helper function to calculate days since last update
export function daysSinceUpdate(deal: Deal): number {
  const now = new Date();
  const updated = new Date(deal.updatedAt);
  const diffTime = Math.abs(now.getTime() - updated.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper to format deal summary
export function getDealSummary(deal: Deal): string {
  return `${deal.rsf.toLocaleString()} RSF | ${deal.leaseTerm} months | ${deal.property.city}, ${deal.property.state}`;
}

// All stages for UI rendering
export const ALL_STAGES: DealStage[] = [
  "Lead",
  "Touring",
  "Proposal",
  "Lease Execution",
  "Closed Won",
  "Closed Lost",
];

// Active stages (exclude closed)
export const ACTIVE_STAGES: DealStage[] = [
  "Lead",
  "Touring",
  "Proposal",
  "Lease Execution",
];

