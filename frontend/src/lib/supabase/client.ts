import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// In-memory store used when Supabase env vars are missing. Persists for the
// life of the server process, which is acceptable for solo dev. Production
// without Supabase env vars is logged loudly so the operator notices.

const TABLE = "user_watchlists";

const memoryStore = new Map<string, string[]>();

let cachedClient: SupabaseClient | null = null;
let envLogged = false;

function getClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    if (!envLogged) {
      const level =
        process.env.NODE_ENV === "production" ? "error" : "warn";
      console[level](
        "[supabase] SUPABASE_URL/SUPABASE_SERVICE_KEY not set — watchlist falls back to in-memory store",
      );
      envLogged = true;
    }
    return null;
  }
  cachedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

export async function getWatchlistFor(address: string): Promise<string[]> {
  const wallet = address.toLowerCase();
  const client = getClient();
  if (!client) return memoryStore.get(wallet) ?? [];

  const { data, error } = await client
    .from(TABLE)
    .select("coin_ids")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (error) throw new Error(`supabase select failed: ${error.message}`);
  const row = data as { coin_ids?: string[] } | null;
  return row?.coin_ids ?? [];
}

export async function setWatchlistFor(
  address: string,
  coinIds: string[],
): Promise<void> {
  const wallet = address.toLowerCase();
  const client = getClient();
  if (!client) {
    memoryStore.set(wallet, coinIds);
    return;
  }
  const { error } = await client
    .from(TABLE)
    .upsert(
      {
        wallet_address: wallet,
        coin_ids: coinIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" },
    );
  if (error) throw new Error(`supabase upsert failed: ${error.message}`);
}
