import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisMeta } from "@/components/LeaseAnalyzerApp";
// import { withTimeout, isNetworkError } from "@/lib/supabase/timeout";

// Supabase disabled - all functions return empty/void to force local storage fallback
const TABLE_NAME = "user_analyses";

interface AnalysisRow {
  id: string;
  user_id: string;
  analysis: AnalysisMeta;
  created_at?: string;
  updated_at?: string;
}

export async function listAnalysesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<AnalysisMeta[]> {
  // Supabase disabled - return empty array to trigger local storage fallback
  return [];
}

export async function upsertAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  analysis: AnalysisMeta
): Promise<void> {
  // Supabase disabled - do nothing, local storage will handle it
  return;
}

export async function upsertAnalysesForUser(
  supabase: SupabaseClient,
  userId: string,
  analyses: AnalysisMeta[]
): Promise<void> {
  // Supabase disabled - do nothing, local storage will handle it
  return;
}

export async function deleteAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<void> {
  // Supabase disabled - do nothing, local storage will handle it
  return;
}

