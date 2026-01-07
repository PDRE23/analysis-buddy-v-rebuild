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
      <RequireAuth
        loadingFallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        }
      >
        <AppContainer />
      </RequireAuth>
    </ErrorBoundary>
  );
}

