"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { setDealStorageUser } from "@/lib/dealStorage";
import { setAnalysisStorageUser } from "@/lib/storage";
import {
  authenticateWithPassword,
  registerUser,
  getSession as getLocalSession,
  clearSession,
  type User as LocalUser,
} from "@/lib/auth";

// Compatible user type that works with both Supabase and local auth
type CompatibleUser = User | (LocalUser & { id: string }) | null;

type AuthContextValue = {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: CompatibleUser;
  loading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<unknown>;
  signUp: (params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }) => Promise<unknown>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CompatibleUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not configured, use local auth immediately
    if (!isSupabaseConfigured || !supabaseBrowserClient) {
      getLocalSession().then((localSession) => {
        if (localSession) {
          setUser(localSession.user as CompatibleUser);
          setDealStorageUser(localSession.user.id);
          setAnalysisStorageUser(localSession.user.id);
        } else {
          setDealStorageUser(undefined);
          setAnalysisStorageUser(undefined);
        }
        setLoading(false);
      });
      return;
    }

    // Supabase is configured - try it with timeout
    let isMounted = true;
    let fallbackTimeout: NodeJS.Timeout;

    const fallbackToLocal = () => {
      if (!isMounted) return;
      getLocalSession().then((localSession) => {
        if (!isMounted) return;
        if (localSession) {
          setUser(localSession.user as CompatibleUser);
          setDealStorageUser(localSession.user.id);
          setAnalysisStorageUser(localSession.user.id);
        } else {
          setDealStorageUser(undefined);
          setAnalysisStorageUser(undefined);
        }
        setLoading(false);
      });
    };

    const trySupabase = async () => {
      try {
        // Set a timeout to fall back to local auth if Supabase is slow
        fallbackTimeout = setTimeout(() => {
          if (!isMounted) return;
          console.warn("Supabase session check timeout, falling back to local auth");
          fallbackToLocal();
        }, 2000); // 2 second timeout

        const sessionPromise = supabaseBrowserClient.auth.getSession().catch((err) => {
          // Catch and suppress Supabase fetch errors
          const errorMsg = err?.message?.toLowerCase() || '';
          if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
            console.warn("Supabase session check failed (network error), falling back to local auth");
            return { data: { session: null }, error: err };
          }
          throw err; // Re-throw non-network errors
        });
        
        const { data } = await Promise.race([
          sessionPromise,
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 2000)
          ),
        ]);

        if (fallbackTimeout) clearTimeout(fallbackTimeout);

        if (!isMounted) return;

        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
          setLoading(false);
          setDealStorageUser(data.session.user?.id);
          setAnalysisStorageUser(data.session.user?.id);
        } else {
          // No Supabase session, try local auth
          fallbackToLocal();
        }
      } catch (error: any) {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        const errorMsg = error?.message?.toLowerCase() || '';
        // Only log non-network errors as warnings
        if (!errorMsg.includes('fetch') && !errorMsg.includes('network')) {
          console.warn("Supabase session check failed, falling back to local auth:", error);
        }
        if (!isMounted) return;
        fallbackToLocal();
      }
    };

    trySupabase();

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        setDealStorageUser(newSession?.user?.id);
        setAnalysisStorageUser(newSession?.user?.id);
      } catch (error: any) {
        // Suppress network errors in auth state change handler
        const errorMsg = error?.message?.toLowerCase() || '';
        if (!errorMsg.includes('fetch') && !errorMsg.includes('network')) {
          console.error("Error in auth state change handler:", error);
        }
      }
    });

    return () => {
      isMounted = false;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      // Authentication temporarily disabled - always use local auth
      // TODO: Re-implement authentication later
      try {
        const result = await authenticateWithPassword(email, password);
        setUser(result.user as CompatibleUser);
        setDealStorageUser(result.user.id);
        setAnalysisStorageUser(result.user.id);
        return { user: result.user };
      } catch (error) {
        throw error instanceof Error ? error : new Error("Failed to sign in");
      }
    },
    []
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => {
      // Authentication temporarily disabled - always use local auth
      // TODO: Re-implement authentication later
      try {
        const name = (options?.data?.name as string) || email.split("@")[0];
        const newUser = await registerUser({
          email,
          password,
          name,
        });
        setUser(newUser as CompatibleUser);
        setDealStorageUser(newUser.id);
        setAnalysisStorageUser(newUser.id);
        return { user: newUser };
      } catch (error) {
        throw error instanceof Error ? error : new Error("Failed to sign up");
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabaseBrowserClient) {
      // Use local auth
      await clearSession();
      setUser(null);
      setDealStorageUser(undefined);
      setAnalysisStorageUser(undefined);
      return;
    }
    // Use Supabase auth
    const { error } = await supabaseBrowserClient.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase: supabaseBrowserClient,
      session,
      user,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

