"use client";

import { useEffect } from "react";
import { AppContainer } from "@/components/AppContainer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { registerServiceWorker } from "@/lib/serviceWorker";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AppPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      registerServiceWorker();
    }
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("App-level error:", error, errorInfo);
      }}
    >
      <OfflineIndicator />
      <RequireAuth>
        <AppContainer />
      </RequireAuth>
    </ErrorBoundary>
  );
}

