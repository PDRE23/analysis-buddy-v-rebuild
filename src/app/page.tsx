'use client';

import { AppContainer } from "@/components/AppContainer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error for debugging
        console.error('App-level error:', error, errorInfo);
      }}
    >
      <AppContainer />
    </ErrorBoundary>
  );
}
