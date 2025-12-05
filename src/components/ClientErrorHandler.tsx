"use client";

import { useEffect } from "react";
import { setupSupabaseErrorHandler } from "@/lib/supabase/errorHandler";

/**
 * Client-side component to set up global error handlers
 * This suppresses "Failed to fetch" errors from Supabase when it's unavailable
 */
export function ClientErrorHandler() {
  useEffect(() => {
    // Set up error handler immediately - this must run before any Supabase calls
    const cleanup = setupSupabaseErrorHandler();
    
    return cleanup;
  }, []);

  return null;
}

