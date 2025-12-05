/**
 * Prospect Data Model
 * Simplified CRM for cold calling and prospect tracking
 */

export type ProspectStatus = 
  | "New" 
  | "Contacted" 
  | "Qualified" 
  | "Follow Up Scheduled"
  | "Not Interested"
  | "Converted to Deal"
  | "Lost";

export type ProspectPriority = "High" | "Medium" | "Low";

export type FollowUpType = "call" | "email" | "meeting" | "other";

export type ColdCallStage = "Research" | "Attempt 1" | "Attempt 2" | "Attempt 3" | "Attempt 4";

export interface OutreachAttempt {
  id: string;
  timestamp: string; // ISO date
  stage: ColdCallStage;
  type: "call" | "email" | "voicemail" | "linkedin" | "other";
  notes?: string;
  outcome?: "no_answer" | "left_voicemail" | "spoke" | "not_interested" | "interested" | "callback_requested";
}

export interface ProspectContact {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  title?: string;
  linkedIn?: string;
}

export interface FollowUp {
  id: string;
  scheduledDate: string; // ISO date
  completedDate?: string; // ISO date
  type: FollowUpType;
  notes?: string;
  completed: boolean;
  reminderSent?: boolean;
}

export interface ProspectActivity {
  id: string;
  timestamp: string; // ISO date
  type: "call" | "email" | "note" | "follow_up" | "status_change" | "converted";
  description: string;
  userId?: string;
  userName?: string;
}

export interface Prospect {
  id: string;
  
  // Contact Info
  contact: ProspectContact;
  
  // Status & Tracking
  status: ProspectStatus;
  source?: string; // "LinkedIn", "Referral", "Cold Call", etc.
  priority: ProspectPriority;
  
  // Location & Size
  location?: string; // Geographic location (city, state, address, etc.)
  size?: string; // Company size, office size, or deal size
  
  // Cold Call Tracking
  coldCallStage?: ColdCallStage; // Current stage in cold call process
  outreachAttempts?: OutreachAttempt[]; // History of outreach attempts
  
  // Follow-ups
  followUps: FollowUp[];
  lastContactDate?: string; // ISO date
  nextFollowUpDate?: string; // ISO date
  
  // Notes & Activities
  notes: string; // Quick notes field
  activities: ProspectActivity[];
  
  // Conversion
  convertedToDealId?: string; // If converted to a deal
  
  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  tags?: string[];
}

// Status options array for easy iteration
export const ALL_STATUSES: ProspectStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Follow Up Scheduled",
  "Not Interested",
  "Converted to Deal",
  "Lost",
];

// Priority options array
export const ALL_PRIORITIES: ProspectPriority[] = ["High", "Medium", "Low"];

// Follow-up type options
export const ALL_FOLLOWUP_TYPES: FollowUpType[] = ["call", "email", "meeting", "other"];

// Cold call stages
export const COLD_CALL_STAGES: ColdCallStage[] = [
  "Research",
  "Attempt 1",
  "Attempt 2",
  "Attempt 3",
  "Attempt 4",
];

