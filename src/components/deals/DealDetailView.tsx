"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotesPanel } from "@/components/ui/notes-panel";
import type { Deal, DealStage, Note } from "@/lib/types/deal";
import type { AnalysisMeta } from "@/types";
import { 
  getStageColor, 
  getPriorityColor, 
  daysSinceUpdate 
} from "@/lib/types/deal";
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Building2, 
  Calendar, 
  DollarSign,
  FileText,
  Plus,
  ChevronRight,
  Clock,
  User,
  Mail,
  StickyNote,
  Link,
} from "lucide-react";
import { LinkAnalysisDialog } from "@/components/ui/link-analysis-dialog";
import { FileManager } from "./FileManager";
import { formatDateOnlyDisplay } from "@/lib/dateOnly";

interface DealDetailViewProps {
  deal: Deal;
  analyses: AnalysisMeta[]; // Analyses associated with this deal
  onBack: () => void;
  onEdit: (deal: Deal) => void;
  onUpdateDeal: (deal: Deal) => void; // For updating notes and comments
  onViewAnalysis: (analysisId: string) => void;
  onCreateAnalysis: (dealId: string) => void;
  onLinkAnalysis: (dealId: string, analysisId: string) => void;
}

export function DealDetailView({
  deal,
  analyses,
  onBack,
  onEdit,
  onUpdateDeal,
  onViewAnalysis,
  onCreateAnalysis,
  onLinkAnalysis,
}: DealDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "analyses" | "notes" | "files">("overview");
  const [showLinkAnalysisDialog, setShowLinkAnalysisDialog] = useState(false);
  const daysStale = daysSinceUpdate(deal);

  // Handler for notes
  const handleNotesChange = (notes: Note[]) => {
    onUpdateDeal({ ...deal, detailedNotes: notes });
  };


  const handleLinkAnalysis = (analysisId: string) => {
    onLinkAnalysis(deal.id, analysisId);
    setShowLinkAnalysisDialog(false);
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
              <h1 className="text-2xl font-bold">{deal.clientName}</h1>
              <Badge className={getStageColor(deal.stage)} variant="secondary">
                {deal.stage}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(deal.priority)}>
                {deal.priority} Priority
              </Badge>
            </div>
            {deal.clientCompany && (
              <p className="text-sm text-gray-600">{deal.clientCompany}</p>
            )}
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
            onClick={() => setActiveTab("analyses")}
            className={`pb-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "analyses"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Analyses ({analyses.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-4 px-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === "notes"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <StickyNote className="h-4 w-4" />
            Notes ({deal.detailedNotes?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`pb-4 px-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === "files"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            Files
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                  <div>
                    <div className="font-medium">{deal.property.address}</div>
                    <div className="text-sm text-gray-600">
                      {deal.property.city}, {deal.property.state} {deal.property.zipCode}
                    </div>
                    {(deal.property.building || deal.property.floor || deal.property.suite) && (
                      <div className="text-sm text-gray-500 mt-1">
                        {[deal.property.building, deal.property.floor, deal.property.suite]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <div className="text-xs text-gray-500">Rentable Square Feet</div>
                    <div className="text-lg font-semibold">{deal.rsf.toLocaleString()} RSF</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Lease Term</div>
                    <div className="text-lg font-semibold">{deal.leaseTerm} months</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Deal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {deal.estimatedValue && (
                    <div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Estimated Value
                      </div>
                      <div className="text-lg font-semibold">
                        ${deal.estimatedValue.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {deal.expectedCloseDate && (
                    <div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expected Close Date
                      </div>
                      <div className="text-lg font-semibold">
                        {formatDateOnlyDisplay(deal.expectedCloseDate)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t">
                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <Clock className="h-3 w-3" />
                    Last Updated
                  </div>
                  <div className="text-sm">
                    {daysStale === 0 ? 'Today' : daysStale === 1 ? '1 day ago' : `${daysStale} days ago`}
                  </div>
                  {daysStale > 7 && (
                    <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded inline-block">
                      ⚠️ No updates in {daysStale} days
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Broker Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Broker Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500">Broker</div>
                  <div className="font-medium">{deal.broker}</div>
                </div>
                {deal.brokerEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <a href={`mailto:${deal.brokerEmail}`} className="text-blue-600 hover:underline">
                      {deal.brokerEmail}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Notes */}
            {deal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Prominent Edit Button at Bottom */}
            <div className="flex justify-center pt-6">
              <Button onClick={() => onEdit(deal)} size="lg" variant="default" className="gap-2 font-semibold shadow-md min-w-[200px]">
                <Edit className="h-5 w-5" />
                Edit Deal
              </Button>
            </div>
          </div>
        )}

        {activeTab === "analyses" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lease Analyses</h2>
            </div>

            {analyses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No analyses yet</h3>
                  <p className="text-gray-500 mb-6">
                    Create your first lease analysis for this deal
                  </p>
                  <div className="space-y-3">
                    <Button onClick={() => onCreateAnalysis(deal.id)} className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4" />
                      Create Analysis
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowLinkAnalysisDialog(true)}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Link className="h-4 w-4" />
                      Link Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Action buttons when analyses exist */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLinkAnalysisDialog(true)}
                    className="gap-2"
                  >
                    <Link className="h-4 w-4" />
                    Link Analysis
                  </Button>
                  <Button 
                    onClick={() => onCreateAnalysis(deal.id)} 
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Analysis
                  </Button>
                </div>

                {/* Analyses list */}
                <div className="space-y-3">
                  {analyses.map(analysis => (
                  <Card
                    key={analysis.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onViewAnalysis(analysis.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{analysis.name}</h3>
                            <Badge variant="outline">{analysis.status}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {analysis.lease_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>{analysis.tenant_name}</span>
                            <span>•</span>
                            <span>{analysis.market}</span>
                            <span>•</span>
                            <span>{analysis.rsf.toLocaleString()} RSF</span>
                            {analysis.proposals && (
                              <>
                                <span>•</span>
                                <span>{analysis.proposals.length} proposals</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="max-w-4xl">
            <NotesPanel
              notes={deal.detailedNotes || []}
              onChange={handleNotesChange}
              userName={deal.broker || "User"}
            />
          </div>
        )}

        {activeTab === "files" && (
          <div className="max-w-4xl">
            <FileManager
              dealId={deal.id}
              uploadedBy={deal.broker || "User"}
            />
          </div>
        )}

      </div>

      {/* Link Analysis Dialog */}
      {showLinkAnalysisDialog && (
        <LinkAnalysisDialog
          isOpen={showLinkAnalysisDialog}
          onClose={() => setShowLinkAnalysisDialog(false)}
          onLink={handleLinkAnalysis}
          availableAnalyses={analyses}
          linkedAnalysisIds={deal.analysisIds}
        />
      )}
    </div>
  );
}

