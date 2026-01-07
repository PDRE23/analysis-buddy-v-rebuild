/**
 * Audit Logging System
 * Track all actions for compliance and security
 */

import type { User } from "./auth";

export type AuditAction =
  | "deal:create"
  | "deal:update"
  | "deal:delete"
  | "deal:view"
  | "analysis:create"
  | "analysis:update"
  | "analysis:delete"
  | "analysis:export"
  | "analysis:share"
  | "prospect:create"
  | "prospect:update"
  | "prospect:delete"
  | "prospect:stage_change"
  | "prospect:import"
  | "note:create"
  | "note:update"
  | "note:delete"
  | "user:login"
  | "user:logout"
  | "user:permission_change"
  | "settings:update";

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

const AUDIT_LOG_KEY = "audit-logs";
const MAX_LOGS = 10000; // Keep last 10k logs

/**
 * Log an action
 */
export function logAction(
  user: User,
  action: AuditAction,
  resourceType: string,
  options?: {
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
): void {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    userName: user.name,
    action,
    resourceType,
    resourceId: options?.resourceId,
    details: options?.details,
    timestamp: new Date().toISOString(),
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
  };

  const logs = getAuditLogs();
  logs.push(log);

  // Keep only last MAX_LOGS
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }

  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error("Error saving audit log:", error);
    // In production, send to server
  }
}

/**
 * Get audit logs
 */
export function getAuditLogs(
  filters?: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
  }
): AuditLog[] {
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    if (!stored) return [];

    let logs: AuditLog[] = JSON.parse(stored);

    // Apply filters
    if (filters) {
      if (filters.userId) {
        logs = logs.filter((log) => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }
      if (filters.resourceType) {
        logs = logs.filter((log) => log.resourceType === filters.resourceType);
      }
      if (filters.resourceId) {
        logs = logs.filter((log) => log.resourceId === filters.resourceId);
      }
      if (filters.startDate) {
        logs = logs.filter((log) => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter((log) => log.timestamp <= filters.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

/**
 * Get audit logs for a specific resource
 */
export function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
): AuditLog[] {
  return getAuditLogs({
    resourceType,
    resourceId,
  });
}

/**
 * Get audit logs for a user
 */
export function getUserAuditLogs(userId: string): AuditLog[] {
  return getAuditLogs({ userId });
}

/**
 * Export audit logs
 */
export function exportAuditLogs(
  filters?: Parameters<typeof getAuditLogs>[0]
): string {
  const logs = getAuditLogs(filters);
  return JSON.stringify(logs, null, 2);
}

/**
 * Clear audit logs (admin only)
 */
export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

