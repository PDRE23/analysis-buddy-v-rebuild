"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Prospect } from "@/lib/types/prospect";
import { getStatusColor, getPriorityColor, formatPhoneNumber, isFollowUpOverdue } from "@/lib/prospectUtils";
import { ArrowLeft, Edit, Phone, Mail, Calendar, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { FollowUpScheduler } from "./FollowUpScheduler";
import { nanoid } from "nanoid";
import { formatDateOnlyDisplay, parseDateInput } from "@/lib/dateOnly";

interface ProspectDetailViewProps {
  prospect: Prospect;
  onBack: () => void;
  onEdit: (prospect: Prospect) => void;
  onUpdateProspect: (prospect: Prospect) => void;
  onScheduleFollowUp: (prospectId: string, followUp: Prospect["followUps"][0]) => void;
  onConvertToDeal: (prospect: Prospect) => void;
}

type Tab = "overview" | "followups" | "activity";

export function ProspectDetailView({
  prospect,
  onBack,
  onEdit,
  onUpdateProspect,
  onScheduleFollowUp,
  onConvertToDeal,
}: ProspectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showFollowUpScheduler, setShowFollowUpScheduler] = useState(false);

  const handleCompleteFollowUp = (followUpId: string) => {
    const updatedFollowUps = prospect.followUps.map(fu => 
      fu.id === followUpId 
        ? { ...fu, completed: true, completedDate: new Date().toISOString() }
        : fu
    );
    
    const nextFollowUp = updatedFollowUps.find(fu => !fu.completed);
    
    const updatedProspect: Prospect = {
      ...prospect,
      followUps: updatedFollowUps,
      nextFollowUpDate: nextFollowUp?.scheduledDate,
      lastContactDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: [
        ...prospect.activities,
        {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          type: "follow_up",
          description: `Completed follow-up: ${updatedFollowUps.find(fu => fu.id === followUpId)?.type}`,
        },
      ],
    };
    
    onUpdateProspect(updatedProspect);
  };

  const handleScheduleFollowUp = (followUp: Prospect["followUps"][0]) => {
    onScheduleFollowUp(prospect.id, followUp);
    setShowFollowUpScheduler(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{prospect.contact.name}</h1>
              <Badge className={getStatusColor(prospect.status)} variant="secondary">
                {prospect.status}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(prospect.priority)}>
                {prospect.priority} Priority
              </Badge>
            </div>
            {prospect.contact.company && (
              <p className="text-sm text-gray-600">{prospect.contact.company}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {prospect.contact.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${prospect.contact.phone}`)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            {prospect.contact.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`mailto:${prospect.contact.email}`)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFollowUpScheduler(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
            {prospect.status !== "Converted to Deal" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConvertToDeal(prospect)}
              >
                Convert to Deal
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            <Button onClick={() => onEdit(prospect)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b -mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`pb-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "followups"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Follow-ups ({prospect.followUps.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`pb-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "activity"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Activity ({prospect.activities.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-4xl">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prospect.contact.email && (
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{prospect.contact.email}</div>
                    </div>
                  )}
                  {prospect.contact.phone && (
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="font-medium">{formatPhoneNumber(prospect.contact.phone)}</div>
                    </div>
                  )}
                  {prospect.contact.title && (
                    <div>
                      <div className="text-sm text-gray-600">Title</div>
                      <div className="font-medium">{prospect.contact.title}</div>
                    </div>
                  )}
                  {prospect.contact.linkedIn && (
                    <div>
                      <div className="text-sm text-gray-600">LinkedIn</div>
                      <a
                        href={prospect.contact.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status & Details */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <Badge className={getStatusColor(prospect.status)} variant="secondary">
                      {prospect.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Priority</div>
                    <Badge variant="outline" className={getPriorityColor(prospect.priority)}>
                      {prospect.priority}
                    </Badge>
                  </div>
                  {prospect.source && (
                    <div>
                      <div className="text-sm text-gray-600">Source</div>
                      <div className="font-medium">{prospect.source}</div>
                    </div>
                  )}
                  {prospect.nextFollowUpDate && (
                    <div>
                      <div className="text-sm text-gray-600">Next Follow-up</div>
                      <div className={`font-medium ${isFollowUpOverdue(prospect) ? "text-red-600" : ""}`}>
                        {formatDateOnlyDisplay(prospect.nextFollowUpDate)}
                        {isFollowUpOverdue(prospect) && " (Overdue)"}
                      </div>
                    </div>
                  )}
                  {prospect.lastContactDate && (
                    <div>
                      <div className="text-sm text-gray-600">Last Contact</div>
                      <div className="font-medium">
                        {formatDateOnlyDisplay(prospect.lastContactDate)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {prospect.tags && prospect.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prospect.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {prospect.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-700">{prospect.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "followups" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Follow-ups</h2>
              <Button onClick={() => setShowFollowUpScheduler(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
            </div>

            {prospect.followUps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No follow-ups scheduled. Click &quot;Schedule Follow-up&quot; to add one.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prospect.followUps.map((followUp) => {
                  const scheduledDate = parseDateInput(followUp.scheduledDate) ?? new Date(followUp.scheduledDate);
                  const isOverdue = !followUp.completed && scheduledDate < new Date();
                  
                  return (
                    <Card
                      key={followUp.id}
                      className={isOverdue ? "border-red-300 bg-red-50/50" : ""}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {followUp.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className={`h-5 w-5 ${isOverdue ? "text-red-600" : "text-gray-400"}`} />
                              )}
                              <div>
                                <div className="font-semibold capitalize">{followUp.type}</div>
                                <div className="text-sm text-gray-600">
                                  Scheduled: {formatDateOnlyDisplay(followUp.scheduledDate)}
                                </div>
                                {followUp.completed && followUp.completedDate && (
                                  <div className="text-sm text-green-600">
                                    Completed: {formatDateOnlyDisplay(followUp.completedDate)}
                                  </div>
                                )}
                                {isOverdue && !followUp.completed && (
                                  <div className="text-sm text-red-600 font-medium">
                                    Overdue
                                  </div>
                                )}
                              </div>
                            </div>
                            {followUp.notes && (
                              <p className="text-sm text-gray-700 mt-2">{followUp.notes}</p>
                            )}
                          </div>
                          {!followUp.completed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteFollowUp(followUp.id)}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4 max-w-4xl">
            <h2 className="text-xl font-semibold">Activity Timeline</h2>

            {prospect.activities.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No activity recorded yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...prospect.activities]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((activity) => (
                    <Card key={activity.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                          <div className="flex-1">
                            <div className="font-medium">{activity.description}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-up Scheduler Modal */}
      {showFollowUpScheduler && (
        <FollowUpScheduler
          prospect={prospect}
          isOpen={showFollowUpScheduler}
          onClose={() => setShowFollowUpScheduler(false)}
          onSchedule={handleScheduleFollowUp}
        />
      )}
    </div>
  );
}

