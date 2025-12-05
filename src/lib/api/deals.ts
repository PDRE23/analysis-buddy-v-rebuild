import type { SupabaseClient } from "@supabase/supabase-js";
import type { Deal } from "@/lib/types/deal";
import { withTimeout, isNetworkError } from "@/lib/supabase/timeout";

const TABLE_NAME = "user_deals";

interface DealRow {
  id: string;
  user_id: string;
  deal: Deal;
  created_at?: string;
  updated_at?: string;
}

export async function listDealsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Deal[]> {
  try {
    const query = supabase
      .from(TABLE_NAME)
      .select("deal")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const { data, error } = await withTimeout(query);

    if (error) {
      throw new Error(error.message);
    }

    return data?.map((row) => row.deal) ?? [];
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("Supabase unavailable for listDealsForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

export async function upsertDealForUser(
  supabase: SupabaseClient,
  userId: string,
  deal: Deal
): Promise<void> {
  try {
    const payload: DealRow = {
      id: deal.id,
      user_id: userId,
      deal,
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
      console.warn("Supabase unavailable for upsertDealForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

export async function upsertDealsForUser(
  supabase: SupabaseClient,
  userId: string,
  deals: Deal[]
): Promise<void> {
  if (deals.length === 0) {
    return;
  }

  try {
    const rows: DealRow[] = deals.map((deal) => ({
      id: deal.id,
      user_id: userId,
      deal,
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
      console.warn("Supabase unavailable for upsertDealsForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

export async function deleteDealForUser(
  supabase: SupabaseClient,
  userId: string,
  dealId: string
): Promise<void> {
  try {
    const query = supabase
      .from(TABLE_NAME)
      .delete()
      .eq("user_id", userId)
      .eq("id", dealId);

    const { error } = await withTimeout(query);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn("Supabase unavailable for deleteDealForUser, using local storage");
      throw error; // Let caller handle fallback
    }
    throw error;
  }
}

