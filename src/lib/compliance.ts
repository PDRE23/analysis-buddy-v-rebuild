/**
 * Compliance Utilities
 * GDPR compliance and data protection
 */

import type { User } from "./auth";

/**
 * Export user data (GDPR right to data portability)
 */
export function exportUserData(userId: string): {
  user: User;
  deals: unknown[];
  analyses: unknown[];
  notes: unknown[];
  auditLogs: unknown[];
} {
  // In production, fetch from server
  const user = { id: userId, email: "", name: "", role: "user" as const };
  
  // Get all user data from localStorage
  const deals = JSON.parse(localStorage.getItem("deals") || "[]");
  const analyses = JSON.parse(localStorage.getItem("analyses") || "[]");
  const notes = JSON.parse(localStorage.getItem("teamNotes") || "[]");
  const auditLogs = JSON.parse(localStorage.getItem("audit-logs") || "[]");

  // Filter to user's data
  const userDeals = deals.filter((deal: any) => deal.userId === userId);
  const userAnalyses = analyses.filter((analysis: any) => analysis.userId === userId);
  const userNotes = notes.filter((note: any) => note.userId === userId);
  const userAuditLogs = auditLogs.filter((log: any) => log.userId === userId);

  return {
    user,
    deals: userDeals,
    analyses: userAnalyses,
    notes: userNotes,
    auditLogs: userAuditLogs,
  };
}

/**
 * Delete user data (GDPR right to be forgotten)
 */
export function deleteUserData(userId: string): void {
  // Delete deals
  const deals = JSON.parse(localStorage.getItem("deals") || "[]");
  const remainingDeals = deals.filter((deal: any) => deal.userId !== userId);
  localStorage.setItem("deals", JSON.stringify(remainingDeals));

  // Delete analyses
  const analyses = JSON.parse(localStorage.getItem("analyses") || "[]");
  const remainingAnalyses = analyses.filter((analysis: any) => analysis.userId !== userId);
  localStorage.setItem("analyses", JSON.stringify(remainingAnalyses));

  // Delete notes
  const notes = JSON.parse(localStorage.getItem("teamNotes") || "[]");
  const remainingNotes = notes.filter((note: any) => note.userId !== userId);
  localStorage.setItem("teamNotes", JSON.stringify(remainingNotes));

  // Anonymize audit logs (keep for compliance but remove user info)
  const auditLogs = JSON.parse(localStorage.getItem("audit-logs") || "[]");
  const anonymizedLogs = auditLogs.map((log: any) => {
    if (log.userId === userId) {
      return {
        ...log,
        userId: "deleted-user",
        userName: "Deleted User",
      };
    }
    return log;
  });
  localStorage.setItem("audit-logs", JSON.stringify(anonymizedLogs));
}

/**
 * Data retention policies
 */
export interface RetentionPolicy {
  resourceType: "deal" | "analysis" | "note";
  maxAgeDays: number;
  autoArchive?: boolean;
  autoDelete?: boolean;
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    resourceType: "deal",
    maxAgeDays: 365 * 5, // 5 years
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: "analysis",
    maxAgeDays: 365 * 3, // 3 years
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: "note",
    maxAgeDays: 365 * 2, // 2 years
    autoArchive: false,
    autoDelete: true,
  },
];

/**
 * Apply retention policies
 */
export function applyRetentionPolicies(policies: RetentionPolicy[] = DEFAULT_RETENTION_POLICIES): {
  archived: number;
  deleted: number;
} {
  const now = Date.now();
  let archived = 0;
  let deleted = 0;

  for (const policy of policies) {
    const cutoffDate = now - policy.maxAgeDays * 24 * 60 * 60 * 1000;

    if (policy.resourceType === "deal") {
      const deals = JSON.parse(localStorage.getItem("deals") || "[]");
      const updated = deals.map((deal: any) => {
        const dealDate = new Date(deal.createdAt || deal.updatedAt || 0).getTime();
        if (dealDate < cutoffDate) {
          if (policy.autoArchive) {
            archived++;
            return { ...deal, archived: true };
          }
          if (policy.autoDelete) {
            deleted++;
            return null;
          }
        }
        return deal;
      }).filter((deal: any) => deal !== null);
      localStorage.setItem("deals", JSON.stringify(updated));
    }

    if (policy.resourceType === "analysis") {
      const analyses = JSON.parse(localStorage.getItem("analyses") || "[]");
      const updated = analyses.map((analysis: any) => {
        const analysisDate = new Date(analysis.createdAt || analysis.updatedAt || 0).getTime();
        if (analysisDate < cutoffDate) {
          if (policy.autoArchive) {
            archived++;
            return { ...analysis, archived: true };
          }
          if (policy.autoDelete) {
            deleted++;
            return null;
          }
        }
        return analysis;
      }).filter((analysis: any) => analysis !== null);
      localStorage.setItem("analyses", JSON.stringify(updated));
    }

    if (policy.resourceType === "note") {
      const notes = JSON.parse(localStorage.getItem("teamNotes") || "[]");
      const updated = notes.filter((note: any) => {
        const noteDate = new Date(note.createdAt || note.updatedAt || 0).getTime();
        if (noteDate < cutoffDate) {
          if (policy.autoDelete) {
            deleted++;
            return false;
          }
        }
        return true;
      });
      localStorage.setItem("teamNotes", JSON.stringify(updated));
    }
  }

  return { archived, deleted };
}

/**
 * Get privacy policy URL
 */
export function getPrivacyPolicyUrl(): string {
  return "/privacy-policy";
}

/**
 * Get terms of service URL
 */
export function getTermsOfServiceUrl(): string {
  return "/terms-of-service";
}

