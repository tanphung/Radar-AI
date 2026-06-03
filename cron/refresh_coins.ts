/**
 * Manual maintenance script — pull the current CoinGecko top 40 and overwrite
 * coins_top40.json. Run when the snapshot drifts from market reality:
 *   cd cron && npm run refresh-coins
 *
 * Not part of the scheduled workflow — fetching from a third-party API every
 * cron tick would be wasteful and add a moving target to monitor runs.
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&sparkline=false";

interface RawCoin {
  id: string;
  symbol: string;
}

async function main(): Promise<void> {
  const res = await fetch(URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko refresh failed: ${res.status}`);
  const data = (await res.json()) as RawCoin[];
  const out = data.map((c) => ({
    id: c.id,
    symbol: String(c.symbol ?? "").toLowerCase(),
  }));

  const here = dirname(fileURLToPath(import.meta.url));
  const target = join(here, "coins_top40.json");
  await writeFile(target, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`[refresh-coins] wrote ${out.length} coins to ${target}`);
}

main().catch((err) => {
  console.error("[refresh-coins] fatal:", err);
  process.exit(1);
});
