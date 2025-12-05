"use client";

import { useAuth } from "@/context/AuthContext";

interface RequireAuthProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export function RequireAuth({
  children,
  loadingFallback = (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
}: RequireAuthProps) {
  const { loading } = useAuth();

  // Show loading while auth is initializing
  if (loading) {
    return loadingFallback;
  }

  // Always allow access - authentication removed for now
  // TODO: Re-implement authentication later
  return <>{children}</>;
}

