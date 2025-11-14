/**
 * Approval Workflows
 * Proposal approval, deal stage gates, commission approval
 */

import { nanoid } from "nanoid";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ApprovalType = "proposal" | "deal_stage" | "commission";

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  resourceId: string; // deal ID or proposal ID
  resourceType: "deal" | "proposal";
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approvers: Array<{
    userId: string;
    userName: string;
    status: ApprovalStatus;
    comments?: string;
    respondedAt?: string;
  }>;
  requiredApprovals: number;
  currentApprovals: number;
  comments?: string;
  metadata?: Record<string, unknown>;
}

const APPROVALS_STORAGE_KEY = "approval-requests";

/**
 * Create approval request
 */
export function createApprovalRequest(
  type: ApprovalType,
  resourceId: string,
  resourceType: "deal" | "proposal",
  requestedBy: string,
  approvers: Array<{ userId: string; userName: string }>,
  comments?: string,
  metadata?: Record<string, unknown>
): ApprovalRequest {
  const request: ApprovalRequest = {
    id: nanoid(),
    type,
    resourceId,
    resourceType,
    requestedBy,
    requestedAt: new Date().toISOString(),
    status: "pending",
    approvers: approvers.map(a => ({
      ...a,
      status: "pending" as ApprovalStatus,
    })),
    requiredApprovals: approvers.length,
    currentApprovals: 0,
    comments,
    metadata,
  };

  const requests = getAllApprovalRequests();
  requests.push(request);
  localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(requests));

  return request;
}

/**
 * Approve or reject an approval request
 */
export function respondToApprovalRequest(
  requestId: string,
  userId: string,
  status: "approved" | "rejected",
  comments?: string
): ApprovalRequest {
  const requests = getAllApprovalRequests();
  const request = requests.find(r => r.id === requestId);
  
  if (!request) {
    throw new Error(`Approval request ${requestId} not found`);
  }

  const approver = request.approvers.find(a => a.userId === userId);
  if (!approver) {
    throw new Error(`User ${userId} is not an approver for this request`);
  }

  approver.status = status;
  approver.comments = comments;
  approver.respondedAt = new Date().toISOString();

  // Update approval counts
  const approvedCount = request.approvers.filter(a => a.status === "approved").length;
  request.currentApprovals = approvedCount;

  // Update overall status
  if (status === "rejected") {
    request.status = "rejected";
  } else if (approvedCount >= request.requiredApprovals) {
    request.status = "approved";
  }

  localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(requests));

  return request;
}

/**
 * Get all approval requests
 */
export function getAllApprovalRequests(): ApprovalRequest[] {
  try {
    const stored = localStorage.getItem(APPROVALS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get approval requests for a resource
 */
export function getApprovalRequestsForResource(
  resourceId: string,
  resourceType?: "deal" | "proposal"
): ApprovalRequest[] {
  const requests = getAllApprovalRequests();
  return requests.filter(r => {
    if (r.resourceId !== resourceId) return false;
    if (resourceType && r.resourceType !== resourceType) return false;
    return true;
  });
}

/**
 * Get pending approval requests for a user
 */
export function getPendingApprovalsForUser(userId: string): ApprovalRequest[] {
  const requests = getAllApprovalRequests();
  return requests.filter(r => {
    if (r.status !== "pending") return false;
    return r.approvers.some(a => a.userId === userId && a.status === "pending");
  });
}

/**
 * Check if a resource requires approval before stage change
 */
export function requiresStageApproval(
  dealId: string,
  newStage: string,
  approvalRules?: Array<{
    stage: string;
    requiredApproval: boolean;
    approvers?: string[];
  }>
): boolean {
  if (!approvalRules) return false;

  const rule = approvalRules.find(r => r.stage === newStage);
  return rule?.requiredApproval || false;
}

/**
 * Check if a proposal requires approval
 */
export function requiresProposalApproval(
  proposalId: string,
  approvalRules?: {
    requiredForAll: boolean;
    requiredAboveValue?: number;
    approvers?: string[];
  }
): boolean {
  if (!approvalRules) return false;
  return approvalRules.requiredForAll || false;
}

