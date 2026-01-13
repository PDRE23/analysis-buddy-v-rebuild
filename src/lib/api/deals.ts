import type { SupabaseClient } from "@supabase/supabase-js";
import type { Deal } from "@/lib/types/deal";
// import { withTimeout, isNetworkError } from "@/lib/supabase/timeout";

// Supabase disabled - all functions return empty/void to force local storage fallback
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
  // Supabase disabled - return empty array to trigger local storage fallback
  return [];
}

export async function upsertDealForUser(
  supabase: SupabaseClient,
  userId: string,
  deal: Deal
): Promise<void> {
  // Supabase disabled - do nothing, local storage will handle it
  return;
}

export async function upsertDealsForUser(
  supabase: SupabaseClient,
  userId: string,
  deals: Deal[]
): Promise<void> {
  // Supabase disabled - do nothing, local storage will handle it
  return;
}

export async function deleteDealForUser(
  supabase: SupabaseClient,
  userId: string,
  dealId: string
): Promise<void> {
  // Supabase disabled - do nothing, local storage will handle it
  return;
}

