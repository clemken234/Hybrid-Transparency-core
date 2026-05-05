/**
 * DB abstraction layer.
 * Supabase is current backend. MongoDB slot ready for groupmate.
 *
 * To switch to MongoDB:
 *   1. Set MONGODB_URI in .env.local
 *   2. Implement the functions marked TODO below
 *   3. Flip the USE_MONGO check or remove Supabase entirely
 */

export type Identity = {
  license_id?: string;
  leaf_hash: string;
  public_name: string;
  subject?: any;
  leaf_index?: number;
  merkle_root?: string;
  tx_hash?: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  is_revoked: boolean;
  created_at: string;
};

const USE_MONGO = !!process.env.MONGODB_URI;

// ─── MongoDB impl (groupmate fills this in) ───────────────────────────────────

async function mongoGetAll(): Promise<Identity[]> {
  // TODO: connect via MONGODB_URI, query identities collection
  throw new Error("MongoDB not implemented yet");
}

async function mongoUpsert(doc: Identity): Promise<void> {
  // TODO: upsert by leaf_hash
  throw new Error("MongoDB not implemented yet");
}

async function mongoFindByLeafHash(leafHash: string): Promise<Identity | null> {
  // TODO: find one by leaf_hash
  throw new Error("MongoDB not implemented yet");
}

async function mongoUpdate(leafHash: string, patch: Partial<Identity>): Promise<void> {
  // TODO: update by leaf_hash
  throw new Error("MongoDB not implemented yet");
}

// ─── Supabase impl (current) ──────────────────────────────────────────────────

async function supabaseGetAll(): Promise<Identity[]> {
  const { getSupabase } = await import("./supabase");
  const client = await getSupabase();
  if (!client) return [];
  const { data } = await client.from("identities").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

async function supabaseUpsert(doc: Identity): Promise<void> {
  const { getSupabase } = await import("./supabase");
  const client = await getSupabase();
  if (!client) throw new Error("DB unavailable");
  const { error } = await client.from("identities").upsert(doc, { onConflict: "leaf_hash" });
  if (error) throw new Error(error.message);
}

async function supabaseFindByLeafHash(leafHash: string): Promise<Identity | null> {
  const { getSupabase } = await import("./supabase");
  const client = await getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from("identities")
    .select("*")
    .eq("leaf_hash", leafHash)
    .single();
  if (error || !data) return null;
  return data as Identity;
}

async function supabaseUpdate(leafHash: string, patch: Partial<Identity>): Promise<void> {
  const { getSupabase } = await import("./supabase");
  const client = await getSupabase();
  if (!client) throw new Error("DB unavailable");
  const { error } = await client.from("identities").update(patch).eq("leaf_hash", leafHash);
  if (error) throw new Error(error.message);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const db = {
  getAll: USE_MONGO ? mongoGetAll : supabaseGetAll,
  upsert: USE_MONGO ? mongoUpsert : supabaseUpsert,
  findByLeafHash: USE_MONGO ? mongoFindByLeafHash : supabaseFindByLeafHash,
  update: USE_MONGO ? mongoUpdate : supabaseUpdate,
};
