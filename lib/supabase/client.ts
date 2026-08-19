/**
 * Supabase client for ONE's cloud sync.
 *
 * SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are the *publishable* client
 * credentials — they ship in every browser bundle by design and grant nothing
 * by themselves: every table is protected by Row Level Security keyed to the
 * signed-in user (see supabase/migrations/). The service-role key is a real
 * secret and must NEVER appear in this repo or any client code.
 *
 * They are inlined (with an env-var override) because the Vercel project's
 * environment variables aren't manageable with current integration access.
 * When that changes, move them fully to NEXT_PUBLIC_* env vars.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dokcrmgajnkjuhhsztmu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_C7iIQ0PKfbEDcf8F8qFlEw_Ah3qf_Dx";

let client: SupabaseClient | null | undefined;

/** Returns the shared client, or null when cloud sync isn't configured in this build. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || typeof window === "undefined") {
    client = null;
    return client;
  }
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export function cloudSyncConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
