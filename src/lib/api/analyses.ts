import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisMeta } from "@/components/LeaseAnalyzerApp";
import { withTimeout, isNetworkError } from "@/lib/supabase/timeout";

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
  try {
    const query = supabase
      .from(TABLE_NAME)
      .select("analysis")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const { data, error } = await withTimeout(query);

    if (error) {
      throw new Error(error.message);
    }

    return data?.map((row) => row.analysis) ?? [];
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("Supabase unavailable for listAnalysesForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

export async function upsertAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  analysis: AnalysisMeta
): Promise<void> {
  try {
    const payload: AnalysisRow = {
      id: analysis.id,
      user_id: userId,
      analysis,
    };

    const query = supabase.from(TABLE_NAME).upsert(payload, {
      onConflict: "id",
    });

    const { error } = await withTimeout(query);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("Supabase unavailable for upsertAnalysisForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
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

  try {
    const rows: AnalysisRow[] = analyses.map((analysis) => ({
      id: analysis.id,
      user_id: userId,
      analysis,
    }));

    const query = supabase.from(TABLE_NAME).upsert(rows, {
      onConflict: "id",
    });

    const { error } = await withTimeout(query);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("Supabase unavailable for upsertAnalysesForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

export async function deleteAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<void> {
  try {
    const query = supabase
      .from(TABLE_NAME)
      .delete()
      .eq("user_id", userId)
      .eq("id", analysisId);

    const { error } = await withTimeout(query);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("Supabase unavailable for deleteAnalysisForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

