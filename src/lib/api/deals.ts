import type { SupabaseClient } from "@supabase/supabase-js";
import type { Deal } from "@/lib/types/deal";

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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("deal")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data?.map((row) => row.deal) ?? [];
}

export async function upsertDealForUser(
  supabase: SupabaseClient,
  userId: string,
  deal: Deal
): Promise<void> {
  const payload: DealRow = {
    id: deal.id,
    user_id: userId,
    deal,
  };

  const { error } = await supabase.from(TABLE_NAME).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
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

  const rows: DealRow[] = deals.map((deal) => ({
    id: deal.id,
    user_id: userId,
    deal,
  }));

  const { error } = await supabase.from(TABLE_NAME).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteDealForUser(
  supabase: SupabaseClient,
  userId: string,
  dealId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("user_id", userId)
    .eq("id", dealId);

  if (error) {
    throw new Error(error.message);
  }
}

