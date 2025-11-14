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
import { supabaseBrowserClient } from "@/lib/supabase/client";
import { setDealStorageUser } from "@/lib/dealStorage";
import { setAnalysisStorageUser } from "@/lib/storage";

type AuthContextValue = {
  supabase: SupabaseClient | null;
  session: Session | null;
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseBrowserClient) {
      setDealStorageUser(undefined);
      setAnalysisStorageUser(undefined);
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      setDealStorageUser(data.session?.user?.id);
      setAnalysisStorageUser(data.session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      setDealStorageUser(newSession?.user?.id);
      setAnalysisStorageUser(newSession?.user?.id);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!supabaseBrowserClient) {
        throw new Error(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
      }
      const result = await supabaseBrowserClient.auth.signInWithPassword({
        email,
        password,
      });
      if (result.error) {
        throw result.error;
      }
      return result.data;
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
      if (!supabaseBrowserClient) {
        throw new Error(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
      }
      const result = await supabaseBrowserClient.auth.signUp({
        email,
        password,
        options,
      });
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabaseBrowserClient) return;
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

