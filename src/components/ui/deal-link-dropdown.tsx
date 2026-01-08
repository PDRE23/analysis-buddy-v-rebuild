"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/types/deal";
import { Link, LinkIcon, RefreshCw, X } from "lucide-react";

interface DealLinkDropdownProps {
  currentDealId?: string | null;
  linkedDeal?: Deal | null;
  availableDeals: Deal[];
  onLinkToDeal: (dealId: string) => void;
  onCreateNewDeal: () => void;
  onUnlink: () => void;
  onSyncNow: () => void;
}

export function DealLinkDropdown({
  currentDealId,
  linkedDeal,
  availableDeals,
  onLinkToDeal,
  onCreateNewDeal,
  onUnlink,
  onSyncNow,
}: DealLinkDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {linkedDeal ? (
        // Show linked deal with actions
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <LinkIcon className="h-3 w-3" />
            Linked: {linkedDeal.clientName}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncNow}
            title="Sync data with deal"
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Sync
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnlink}
            title="Unlink from deal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // Show link button with dropdown
        <div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="gap-2"
          >
            <Link className="h-4 w-4" />
            Link to Deal
          </Button>

          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-2">
                  <div className="text-sm font-medium text-gray-700 px-2 py-1">
                    Select a deal
                  </div>
                  
                  {/* Create New Deal Option */}
                  <button
                    onClick={() => {
                      onCreateNewDeal();
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm flex items-center gap-2 text-blue-600 font-medium"
                  >
                    <Link className="h-4 w-4" />
                    Create New Deal from Analysis
                  </button>

                  <div className="border-t my-2" />

                  {/* Existing Deals List */}
                  {availableDeals.length > 0 ? (
                    availableDeals.map((deal) => (
                      <button
                        key={deal.id}
                        onClick={() => {
                          onLinkToDeal(deal.id);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                      >
                        <div className="font-medium">{deal.clientName}</div>
                        <div className="text-xs text-gray-500">
                          {deal.property.address}, {deal.property.city}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {deal.rsf.toLocaleString()} RSF • {deal.stage}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      No deals available
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

