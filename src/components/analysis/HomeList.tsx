import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2 } from "lucide-react";
import type { LeaseType, Proposal } from "@/types";

export function HomeList({
  list,
  query,
  setQuery,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  list: {
    id: string;
    name: string;
    status: "Draft" | "Active" | "Final";
    tenant_name: string;
    market: string;
    rsf: number;
    lease_type: LeaseType;
    rep_type?: "Occupier" | "Landlord";
    proposals: Proposal[];
  }[];
  query: string;
  setQuery: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Lease Analyses</h1>
          <p className="text-sm text-muted-foreground">Track negotiations and model cash flows for lease transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => onNew()} 
            className="rounded-2xl flex-1 sm:flex-none"
            variant="default"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search by name or tenant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {list.map((a) => (
          <Card key={a.id} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-base font-medium truncate">{a.name}</span>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {a.status}
                    </Badge>
                    {a.rep_type && (
                      <Badge 
                        variant={a.rep_type === "Occupier" ? "default" : "outline"} 
                        className="text-xs w-fit"
                      >
                        {a.rep_type} Rep
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="sm:hidden space-y-1">
                      <div>{a.tenant_name}</div>
                      <div>{a.market || "No market"} • {a.rsf.toLocaleString()} RSF • {a.lease_type}</div>
                    </div>
                    <div className="hidden sm:block">
                      {a.tenant_name} • {a.market || "No market"} • {a.rsf.toLocaleString()} RSF • {a.lease_type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" onClick={() => onOpen(a.id)} className="flex-1 sm:flex-none">
                    Open
                  </Button>
                  <Button variant="ghost" onClick={() => onDuplicate(a.id)} title="Duplicate" className="hidden sm:flex">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(a.id)}
                    title="Delete"
                    className="text-destructive hidden sm:flex"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Mobile action buttons */}
              <div className="flex items-center justify-between gap-2 mt-3 sm:hidden pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(a.id)}
                  title="Duplicate analysis"
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(a.id)}
                  title="Delete analysis"
                  className="text-destructive hover:text-destructive flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
