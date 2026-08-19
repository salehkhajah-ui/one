/**
 * Cloud sync (Milestone 2, v1): the whole UserSetup is backed up to the
 * `user_setups` table (one row per user, RLS-guarded, newest-wins).
 * See supabase/migrations/0001_user_setups.sql and docs/DECISIONS.md #8.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSetup } from "./storage";

export interface RemoteSetup {
  setup: UserSetup;
  updatedAtISO: string;
}

export async function pullSetup(supabase: SupabaseClient): Promise<RemoteSetup | null> {
  const { data, error } = await supabase.from("user_setups").select("payload, updated_at").maybeSingle();
  if (error || !data) return null;
  const payload = data.payload as UserSetup;
  if (!payload || payload.version !== 1) return null;
  return { setup: payload, updatedAtISO: new Date(data.updated_at as string).toISOString() };
}

export async function pushSetup(supabase: SupabaseClient, setup: UserSetup): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const { error } = await supabase.from("user_setups").upsert(
    {
      user_id: userId,
      payload: setup,
      updated_at: setup.updatedAtISO ?? new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return !error;
}

/** Privacy: remove the user's cloud copy entirely. Local data is untouched. */
export async function deleteCloudData(supabase: SupabaseClient): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const { error } = await supabase.from("user_setups").delete().eq("user_id", userId);
  return !error;
}

/** Newest-wins reconciliation between a local and a remote setup. */
export function pickNewer(local: UserSetup | null, remote: RemoteSetup | null): "local" | "remote" | "none" {
  if (!local && !remote) return "none";
  if (!local) return "remote";
  if (!remote) return "local";
  const localTime = local.updatedAtISO ?? local.createdAtISO;
  const remoteTime = remote.setup.updatedAtISO ?? remote.updatedAtISO;
  return remoteTime > localTime ? "remote" : "local";
}
