/**
 * Prospect utility functions
 * Helper functions for prospect management
 */

import type { Prospect, ProspectStatus, ProspectPriority, FollowUp } from "./types/prospect";

/**
 * Get color class for prospect status
 */
export function getStatusColor(status: ProspectStatus): string {
  const colorMap: Record<ProspectStatus, string> = {
    "New": "bg-blue-100 text-blue-800 border-blue-200",
    "Contacted": "bg-purple-100 text-purple-800 border-purple-200",
    "Qualified": "bg-green-100 text-green-800 border-green-200",
    "Follow Up Scheduled": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Not Interested": "bg-gray-100 text-gray-800 border-gray-200",
    "Converted to Deal": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Lost": "bg-red-100 text-red-800 border-red-200",
  };
  return colorMap[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

/**
 * Get color class for prospect priority
 */
export function getPriorityColor(priority: ProspectPriority): string {
  const colorMap: Record<ProspectPriority, string> = {
    "High": "text-red-600 font-semibold",
    "Medium": "text-yellow-600 font-medium",
    "Low": "text-gray-600",
  };
  return colorMap[priority] || "text-gray-600";
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return as-is if not standard format
  return phone;
}

/**
 * Filter prospects by status
 */
export function filterByStatus(prospects: Prospect[], status: ProspectStatus): Prospect[] {
  return prospects.filter(p => p.status === status);
}

/**
 * Filter prospects by priority
 */
export function filterByPriority(prospects: Prospect[], priority: ProspectPriority): Prospect[] {
  return prospects.filter(p => p.priority === priority);
}

/**
 * Sort prospects by next follow-up date (soonest first)
 */
export function sortByNextFollowUp(prospects: Prospect[]): Prospect[] {
  return [...prospects].sort((a, b) => {
    if (!a.nextFollowUpDate && !b.nextFollowUpDate) return 0;
    if (!a.nextFollowUpDate) return 1;
    if (!b.nextFollowUpDate) return -1;
    return new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime();
  });
}

/**
 * Get upcoming follow-ups (next 7 days)
 */
export function getUpcomingFollowUps(prospects: Prospect[]): Prospect[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return prospects.filter(prospect => {
    if (!prospect.nextFollowUpDate) return false;
    const followUpDate = new Date(prospect.nextFollowUpDate);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate >= today && followUpDate <= sevenDaysFromNow;
  });
}

/**
 * Check if follow-up is overdue
 */
export function isFollowUpOverdue(prospect: Prospect): boolean {
  if (!prospect.nextFollowUpDate) return false;
  const followUpDate = new Date(prospect.nextFollowUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return followUpDate < today;
}

/**
 * Get overdue follow-ups
 */
export function getOverdueFollowUps(prospects: Prospect[]): Prospect[] {
  return prospects.filter(isFollowUpOverdue);
}

/**
 * Get incomplete follow-ups for a prospect
 */
export function getIncompleteFollowUps(prospect: Prospect): FollowUp[] {
  return prospect.followUps.filter(fu => !fu.completed);
}

/**
 * Get next scheduled follow-up for a prospect
 */
export function getNextFollowUp(prospect: Prospect): FollowUp | null {
  const incomplete = getIncompleteFollowUps(prospect);
  if (incomplete.length === 0) return null;
  
  return incomplete.sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  )[0];
}

/**
 * Calculate days since last contact
 */
export function daysSinceLastContact(prospect: Prospect): number | null {
  if (!prospect.lastContactDate) return null;
  const lastContact = new Date(prospect.lastContactDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastContact.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - lastContact.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Search prospects by query (name, company, email)
 */
export function searchProspects(prospects: Prospect[], query: string): Prospect[] {
  if (!query.trim()) return prospects;
  
  const lowerQuery = query.toLowerCase();
  return prospects.filter(prospect => {
    const nameMatch = prospect.contact.name?.toLowerCase().includes(lowerQuery);
    const companyMatch = prospect.contact.company?.toLowerCase().includes(lowerQuery);
    const emailMatch = prospect.contact.email?.toLowerCase().includes(lowerQuery);
    const phoneMatch = prospect.contact.phone?.includes(query);
    
    return nameMatch || companyMatch || emailMatch || phoneMatch;
  });
}

/**
 * Filter prospects by source
 */
export function filterBySource(prospects: Prospect[], source: string): Prospect[] {
  if (!source) return prospects;
  return prospects.filter(p => p.source === source);
}

/**
 * Get unique sources from prospects
 */
export function getUniqueSources(prospects: Prospect[]): string[] {
  const sources = prospects
    .map(p => p.source)
    .filter((source): source is string => !!source);
  return Array.from(new Set(sources)).sort();
}

