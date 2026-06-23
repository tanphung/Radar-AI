/**
 * Manual maintenance script for the curated MVP monitoring set.
 *
 * This intentionally does not fetch a live top-N list. CryptoLens monitoring is
 * a fixed 10-coin MVP batch so every scheduled run submits one transaction with
 * the same expected coin count.
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CURATED = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "binancecoin", symbol: "BNB" },
  { id: "ripple", symbol: "XRP" },
  { id: "solana", symbol: "SOL" },
  { id: "dogecoin", symbol: "DOGE" },
  { id: "cardano", symbol: "ADA" },
  { id: "chainlink", symbol: "LINK" },
  { id: "avalanche-2", symbol: "AVAX" },
  { id: "sui", symbol: "SUI" },
];

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const target = join(here, "coins_curated_10.json");
  await writeFile(target, JSON.stringify(CURATED, null, 2) + "\n", "utf8");
  console.log(`[refresh-coins] wrote ${CURATED.length} curated coins to ${target}`);
}

main().catch((err) => {
  console.error("[refresh-coins] fatal:", err);
  process.exit(1);
});
