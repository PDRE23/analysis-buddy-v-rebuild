"use client";

/**
 * Offline Indicator Component
 * Shows connection status
 */

import React, { useState, useEffect } from "react";
import { Badge } from "./badge";
import { Wifi, WifiOff } from "lucide-react";
import { isOnline } from "@/lib/offlineMode";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    setOnline(isOnline());

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      className={cn("fixed top-4 right-4 z-50 flex items-center gap-2", className)}
    >
      <WifiOff className="h-3 w-3" />
      Offline Mode
    </Badge>
  );
}

