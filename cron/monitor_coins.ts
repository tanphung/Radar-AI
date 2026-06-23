/**
 * CryptoLens scheduled monitor.
 *
 * Normal path is intentionally non-ambiguous:
 *   10 curated coins -> one monitor_batch call -> one GenLayer write tx.
 */

import {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} from "genlayer-js/chains";
import { createAccount, createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface CoinSeed {
  id: string;
  symbol: string;
}

interface MarketSnapshot {
  id: string;
  symbol: string;
  price_usd_cents: number;
  change_24h_pct: number;
  volume_usd: number;
  market_cap_usd: number;
  high_24h_cents: number;
  low_24h_cents: number;
  snapshot_timestamp: string;
  source: string;
}

const NETWORK = (process.env.GENLAYER_NETWORK ?? "testnet-bradbury").toLowerCase();
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined;
const PRIVATE_KEY = process.env.CRON_PRIVATE_KEY as `0x${string}` | undefined;
const DRY_RUN = process.env.CRON_DRY_RUN === "1";
const RETRY_DELAY_MS = 5_000;
const STATE_READ_RETRIES = 30;
const STATE_READ_INTERVAL_MS = 3_000;

const FAILED_RESULT_NAMES = new Set([
  "DISAGREE",
  "MAJORITY_DISAGREE",
  "TIMEOUT",
  "DETERMINISTIC_VIOLATION",
  "NO_MAJORITY",
  "ERROR",
  "REVERTED",
  "CANCELED",
  "CANCELLED",
  "UNDETERMINED",
]);

const CHAINS = {
  studionet,
  localnet,
  "testnet-bradbury": testnetBradbury,
  "testnet-asimov": testnetAsimov,
  testnetbradbury: testnetBradbury,
  testnetasimov: testnetAsimov,
} as const;

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCents(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

function executionSucceeded(receipt: unknown): boolean {
  const r = receipt as Record<string, unknown> | undefined;
  const resultNameByNumber: Record<string, string> = {
    "1": "AGREE",
    "2": "DISAGREE",
    "3": "TIMEOUT",
    "4": "DETERMINISTIC_VIOLATION",
    "5": "NO_MAJORITY",
    "6": "MAJORITY_AGREE",
    "7": "MAJORITY_DISAGREE",
  };
  const resultRaw =
    r?.result_name ??
    r?.resultName ??
    resultNameByNumber[String(r?.result)] ??
    (typeof r?.result === "object" && r?.result
      ? (r.result as Record<string, unknown>).name
      : undefined) ??
    r?.result;
  const resultName = String(resultRaw ?? "").toUpperCase();
  if (FAILED_RESULT_NAMES.has(resultName)) return false;
  if (resultName.includes("AGREE") || resultName.includes("SUCCESS")) return true;
  const statusName = String(r?.statusName ?? r?.status_name ?? r?.status ?? "").toUpperCase();
  return statusName === "ACCEPTED" || statusName === "FINALIZED";
}

async function loadCuratedCoins(): Promise<CoinSeed[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = await readFile(join(here, "coins_curated_10.json"), "utf8");
  const coins = JSON.parse(raw) as CoinSeed[];
  if (coins.length !== 10) {
    throw new Error(`coins_curated_10.json must contain exactly 10 coins, got ${coins.length}`);
  }
  return coins.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
  }));
}

async function fetchMarketSnapshots(coins: CoinSeed[]): Promise<MarketSnapshot[]> {
  const ids = coins.map((coin) => coin.id).join(",");
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    `?vs_currency=usd&ids=${encodeURIComponent(ids)}` +
    "&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h";
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`CoinGecko snapshot failed: ${response.status}`);
  }
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const byId = new Map(rows.map((row) => [String(row.id), row]));
  const now = new Date().toISOString();
  return coins.map((coin) => {
    const row = byId.get(coin.id);
    if (!row) {
      return {
        id: coin.id,
        symbol: coin.symbol,
        price_usd_cents: 0,
        change_24h_pct: 0,
        volume_usd: 0,
        market_cap_usd: 0,
        high_24h_cents: 0,
        low_24h_cents: 0,
        snapshot_timestamp: now,
        source: "CoinGecko",
      };
    }
    return {
      id: coin.id,
      symbol: coin.symbol,
      price_usd_cents: toCents(row.current_price),
      change_24h_pct: Number(row.price_change_percentage_24h ?? 0),
      volume_usd: Math.max(0, Math.round(Number(row.total_volume ?? 0))),
      market_cap_usd: Math.max(0, Math.round(Number(row.market_cap ?? 0))),
      high_24h_cents: toCents(row.high_24h),
      low_24h_cents: toCents(row.low_24h),
      snapshot_timestamp: now,
      source: "CoinGecko",
    };
  });
}

async function pollRunRecord(client: ReturnType<typeof createClient>, runId: string) {
  for (let attempt = 1; attempt <= STATE_READ_RETRIES; attempt += 1) {
    try {
      const run = (await client.readContract({
        address: CONTRACT_ADDRESS!,
        functionName: "get_run",
        args: [runId],
      })) as Record<string, unknown>;
      const resultIds = String(
        await client.readContract({
          address: CONTRACT_ADDRESS!,
          functionName: "get_run_result_ids",
          args: [runId],
        }),
      );
      const expected = Number(run.expected_coin_count ?? 0);
      const submitted = Number(run.submitted_tx_count ?? 0);
      const processed = Number(run.processed_coin_count ?? 0);
      const successes = Number(run.successful_coin_count ?? 0);
      const failures = Number(run.failed_coin_count ?? 0);
      const ids = resultIds.length > 0 ? resultIds.split("|") : [];
      if (
        expected === 10 &&
        submitted === 1 &&
        processed + failures === 10 &&
        successes + failures === 10 &&
        ids.length === 10
      ) {
        return { run, resultIds: ids };
      }
      console.log(
        `[cron] read-back pending attempt=${attempt} expected=${expected} submitted=${submitted} processed=${processed} success=${successes} failed=${failures} resultIds=${ids.length}`,
      );
    } catch (err) {
      console.log(
        `[cron] read-back not indexed attempt=${attempt}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await sleep(STATE_READ_INTERVAL_MS);
  }
  throw new Error(`Run ${runId} was not readable with 10 per-coin results after consensus`);
}

async function main(): Promise<void> {
  const coins = await loadCuratedCoins();
  const snapshots = await fetchMarketSnapshots(coins);
  const snapshotJson = JSON.stringify(snapshots);
  const runId = `cron_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12)}`;

  console.log(
    `[cron] prepared runId=${runId} network=${NETWORK} curatedCoins=${coins.length} expectedWriteTx=1`,
  );

  if (DRY_RUN) {
    console.log(`[cron] dry-run snapshot=${snapshotJson}`);
    return;
  }

  requireEnv("CONTRACT_ADDRESS", CONTRACT_ADDRESS);
  requireEnv("CRON_PRIVATE_KEY", PRIVATE_KEY);
  const chain = CHAINS[NETWORK as keyof typeof CHAINS];
  if (!chain) {
    throw new Error(`Unknown GENLAYER_NETWORK="${NETWORK}". Valid: ${Object.keys(CHAINS).join(", ")}`);
  }

  const account = createAccount(PRIVATE_KEY!);
  const client = createClient({ chain, account });
  console.log(`[cron] submit one monitor_batch tx operator=${account.address}`);

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS!,
        functionName: "monitor_batch",
        args: [runId, snapshotJson],
        value: 0n,
      });
      console.log(`[cron] walletHash=${hash}`);
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
        interval: 5_000,
        retries: 120,
      });
      if (!executionSucceeded(receipt)) {
        throw new Error(`Transaction finalized but execution failed: ${JSON.stringify(receipt)}`);
      }
      const verified = await pollRunRecord(client, runId);
      console.log(
        `[cron] success runId=${runId} tx=${hash} expectedTx=1 processedResults=${verified.resultIds.length}`,
      );
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[cron] attempt=${attempt} failed: ${lastError}`);
      if (attempt < 3) await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`monitor_batch failed after retries: ${lastError}`);
}

main().catch((err) => {
  console.error("[cron] fatal:", err);
  process.exit(1);
});
