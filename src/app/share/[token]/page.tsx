"use client";

/**
 * Shareable Link Route
 * Client-facing view for shareable proposals
 */

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getShareableLink, validateShareableLinkPassword, recordShareableView } from "@/lib/sharing";
import { storage } from "@/lib/storage";
import type { AnalysisMeta } from "@/components/LeaseAnalyzerApp";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [link, setLink] = useState<ReturnType<typeof getShareableLink> | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [proposal, setProposal] = useState<{ proposal: any; analysis: AnalysisMeta } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const shareableLink = getShareableLink(token);
    setLink(shareableLink);

    if (!shareableLink) {
      setLoading(false);
      return;
    }

    // If no password required, authenticate immediately
    if (!shareableLink.password) {
      setIsAuthenticated(true);
      loadProposal(shareableLink);
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadProposal = async (shareableLink: ReturnType<typeof getShareableLink>) => {
    if (!shareableLink) return;

    try {
      const analyses = storage.load() as AnalysisMeta[];
      const analysis = analyses.find(a => a.id === shareableLink.analysisId);
      
      if (analysis) {
        const proposal = analysis.proposals.find(p => p.id === shareableLink.proposalId);
        if (proposal) {
          setProposal({ proposal, analysis });
          recordShareableView(token);
        }
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    const isValid = validateShareableLinkPassword(token, password);
    
    if (isValid) {
      setIsAuthenticated(true);
      setPasswordError("");
      if (link) {
        loadProposal(link);
      }
    } else {
      setPasswordError("Incorrect password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Link Not Found</h1>
            <p className="text-muted-foreground">
              This link may have expired or been revoked.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Link Expired</h1>
            <p className="text-muted-foreground">
              This link has expired.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Password Required</h1>
            <p className="text-muted-foreground">
              This proposal is password protected.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              className={passwordError ? "border-red-500" : ""}
            />
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
            <Button type="submit" className="w-full">
              Access Proposal
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Proposal Not Found</h1>
            <p className="text-muted-foreground">
              The proposal could not be loaded.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <PresentationMode
      proposal={proposal.proposal}
      analysis={proposal.analysis}
      proposals={proposal.analysis.proposals}
      onClose={() => {
        // Redirect to a thank you page or close
        window.location.href = "/";
      }}
    />
  );
}

