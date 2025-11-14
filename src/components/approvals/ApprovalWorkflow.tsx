"use client";

/**
 * Approval Workflow Component
 * Display and manage approval requests
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import {
  getApprovalRequestsForResource,
  respondToApprovalRequest,
  type ApprovalRequest,
  type ApprovalStatus,
} from "@/lib/approvals";
import { cn } from "@/lib/utils";

interface ApprovalWorkflowProps {
  resourceId: string;
  resourceType: "deal" | "proposal";
  currentUserId: string;
  onStatusChange?: (request: ApprovalRequest) => void;
}

export function ApprovalWorkflow({
  resourceId,
  resourceType,
  currentUserId,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const [requests, setRequests] = useState<ApprovalRequest[]>(() =>
    getApprovalRequestsForResource(resourceId, resourceType)
  );
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseComments, setResponseComments] = useState("");
  const [responseStatus, setResponseStatus] = useState<"approved" | "rejected" | null>(null);

  const handleRespond = async (requestId: string, status: "approved" | "rejected") => {
    setRespondingTo(requestId);
    setResponseStatus(status);
  };

  const handleSubmitResponse = () => {
    if (!respondingTo || !responseStatus) return;

    try {
      const updated = respondToApprovalRequest(
        respondingTo,
        currentUserId,
        responseStatus,
        responseComments
      );
      
      setRequests(prev => prev.map(r => r.id === respondingTo ? updated : r));
      setRespondingTo(null);
      setResponseComments("");
      setResponseStatus(null);
      
      if (onStatusChange) {
        onStatusChange(updated);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const config = {
      pending: { icon: Clock, label: "Pending", variant: "secondary" as const },
      approved: { icon: CheckCircle2, label: "Approved", variant: "default" as const },
      rejected: { icon: XCircle, label: "Rejected", variant: "destructive" as const },
      cancelled: { icon: AlertCircle, label: "Cancelled", variant: "outline" as const },
    };

    const { icon: Icon, label, variant } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (requests.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No approval requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Approval Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => {
          const userApproval = request.approvers.find(a => a.userId === currentUserId);
          const canRespond = userApproval && userApproval.status === "pending";

          return (
            <div
              key={request.id}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium capitalize">{request.type.replace("_", " ")}</span>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Requested by {request.requestedBy} • {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                  {request.comments && (
                    <div className="text-sm mt-2">{request.comments}</div>
                  )}
                </div>
              </div>

              {/* Approvers */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Approvers:</div>
                {request.approvers.map((approver) => (
                  <div
                    key={approver.userId}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <span className="text-sm">{approver.userName}</span>
                    {approver.status === "pending" ? (
                      <Badge variant="outline">Pending</Badge>
                    ) : approver.status === "approved" ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Rejected
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Response form */}
              {canRespond && respondingTo === request.id && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <Textarea
                    placeholder="Add comments (optional)"
                    value={responseComments}
                    onChange={(e) => setResponseComments(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSubmitResponse}
                      disabled={responseStatus !== "approved"}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleSubmitResponse}
                      disabled={responseStatus !== "rejected"}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRespondingTo(null);
                        setResponseComments("");
                        setResponseStatus(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {canRespond && respondingTo !== request.id && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleRespond(request.id, "approved")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRespond(request.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {/* Progress */}
              <div className="text-xs text-muted-foreground">
                {request.currentApprovals} of {request.requiredApprovals} approvals received
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

