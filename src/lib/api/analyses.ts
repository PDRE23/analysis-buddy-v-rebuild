import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisMeta } from "@/components/LeaseAnalyzerApp";

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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("analysis")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data?.map((row) => row.analysis) ?? [];
}

export async function upsertAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  analysis: AnalysisMeta
): Promise<void> {
  const payload: AnalysisRow = {
    id: analysis.id,
    user_id: userId,
    analysis,
  };

  const { error } = await supabase.from(TABLE_NAME).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertAnalysesForUser(
  supabase: SupabaseClient,
  userId: string,
  analyses: AnalysisMeta[]
): Promise<void> {
  if (analyses.length === 0) {
    return;
  }

  const rows: AnalysisRow[] = analyses.map((analysis) => ({
    id: analysis.id,
    user_id: userId,
    analysis,
  }));

  const { error } = await supabase.from(TABLE_NAME).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId)
    .eq("id", analysisId);

  if (error) {
    throw new Error(error.message);
  }
}

