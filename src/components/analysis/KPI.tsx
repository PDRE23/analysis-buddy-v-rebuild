import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground" title={hint}>{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
