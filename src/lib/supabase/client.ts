"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.length > 0 &&
  // Check if URL looks valid (starts with http/https)
  (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"));

if (!isSupabaseConfigured) {
  if (supabaseUrl || supabaseAnonKey) {
    console.warn(
      "Supabase environment variables are incomplete or invalid. Using local storage instead."
    );
  } else {
    console.info(
      "Supabase not configured. Using local storage. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable cloud sync."
    );
  }
}

// Helper function to clear Supabase sessions from localStorage
const clearSupabaseSessions = () => {
  if (typeof window === 'undefined') return;
  try {
    const supabaseKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.startsWith('sb-'))) {
        supabaseKeys.push(key);
      }
    }
    supabaseKeys.forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore cleanup errors
  }
};

// Custom storage adapter that prevents session persistence when Supabase is unavailable
const createSafeStorage = () => {
  if (typeof window === 'undefined') return undefined;
  
  return {
    getItem: (key: string) => {
      try {
        // Don't return Supabase auth tokens if Supabase is unavailable
        if (key.includes('auth-token') && window.__supabaseUnavailable) {
          return null;
        }
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        // Don't persist Supabase auth tokens if we detect network issues
        if (key.includes('auth-token') && window.__supabaseUnavailable) {
          return;
        }
        localStorage.setItem(key, value);
      } catch {
        // Ignore storage errors
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage errors
      }
    },
  };
};

// Create Supabase client with auto-refresh disabled and safe error handling
export const supabaseBrowserClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false, // Disable session persistence to prevent auto-refresh
        autoRefreshToken: false, // Disabled to prevent errors when Supabase is unavailable
        detectSessionInUrl: false, // Disabled to prevent URL detection errors
        storage: createSafeStorage(),
      },
      global: {
        fetch: async (url, options = {}) => {
          // Check if this is a Supabase auth URL
          const urlString = typeof url === 'string' ? url : url.toString();
          const isAuthRequest = urlString.includes('/auth/v1/');
          
          // If Supabase is already marked as unavailable, skip the request
          if (typeof window !== 'undefined' && window.__supabaseUnavailable && isAuthRequest) {
            return new Response(
              JSON.stringify({ 
                error: 'Network error: Supabase unavailable',
                error_description: 'Supabase service is currently unavailable'
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
          
          try {
            const response = await fetch(url, options);
            // If we get a network error response, mark Supabase as unavailable
            if (!response.ok && response.status === 0) {
              if (typeof window !== 'undefined' && isAuthRequest) {
                window.__supabaseUnavailable = true;
                clearSupabaseSessions();
              }
            }
            return response;
          } catch (error: any) {
            // If it's a network error, mark Supabase as unavailable
            const errorMessage = error?.message?.toLowerCase() || '';
            const isNetworkError = 
              errorMessage.includes('failed to fetch') ||
              errorMessage.includes('networkerror') ||
              errorMessage.includes('name_not_resolved') ||
              errorMessage.includes('err_name_not_resolved') ||
              error?.code === 'ERR_NAME_NOT_RESOLVED' ||
              error?.name === 'TypeError';
            
            if (isNetworkError) {
              // Mark Supabase as unavailable
              if (typeof window !== 'undefined') {
                window.__supabaseUnavailable = true;
                // Clear Supabase sessions to prevent retry attempts
                if (isAuthRequest) {
                  clearSupabaseSessions();
                }
              }
              // Return a failed response instead of throwing
              // Use 503 to indicate service unavailable (Supabase will not retry)
              return new Response(
                JSON.stringify({ 
                  error: 'network_error',
                  error_description: 'Network error: Supabase unavailable'
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
            throw error;
          }
        },
      },
    })
  : null;

