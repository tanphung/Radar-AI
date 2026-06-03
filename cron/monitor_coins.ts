/**
 * GitHub Actions runs this every 2h. Splits the snapshot top-40 into 4 batches
 * of 10 and calls CryptoOracle.monitor_batch for each. The contract MAX_BATCH_SIZE
 * is 30 (headroom for future scale-up without redeploy).
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

const NETWORK = (process.env.GENLAYER_NETWORK ?? "studionet").toLowerCase();
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined;
const PRIVATE_KEY = process.env.CRON_PRIVATE_KEY as `0x${string}` | undefined;
const BATCH_SIZE = Number(process.env.CRON_BATCH_SIZE ?? "10");
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

const CHAINS = {
  studionet,
  localnet,
  "testnet-bradbury": testnetBradbury,
  "testnet-asimov": testnetAsimov,
  testnetbradbury: testnetBradbury,
  testnetasimov: testnetAsimov,
} as const;

function require(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  require("CONTRACT_ADDRESS", CONTRACT_ADDRESS);
  require("CRON_PRIVATE_KEY", PRIVATE_KEY);

  const chain = CHAINS[NETWORK as keyof typeof CHAINS];
  if (!chain) {
    throw new Error(
      `Unknown GENLAYER_NETWORK="${NETWORK}". Valid: ${Object.keys(CHAINS).join(", ")}`,
    );
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const seedRaw = await readFile(join(here, "coins_top40.json"), "utf8");
  const coins = JSON.parse(seedRaw) as CoinSeed[];
  if (coins.length === 0) {
    throw new Error("coins_top40.json is empty");
  }

  const account = createAccount(PRIVATE_KEY!);
  const client = createClient({ chain, account });

  const runId = `cron_${Date.now()}`;
  const batches = chunk(coins, BATCH_SIZE);
  console.log(
    `[cron] start runId=${runId} network=${NETWORK} coins=${coins.length} batches=${batches.length} operator=${account.address}`,
  );

  let successBatches = 0;
  let failBatches = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const coinIdsPipe = batch.map((c) => c.id).join("|");
    const symbolsPipe = batch.map((c) => c.symbol).join("|");

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        console.log(
          `[cron] batch ${i + 1}/${batches.length} coins=${batch.length} attempt=${attempt}`,
        );
        const hash = await client.writeContract({
          address: CONTRACT_ADDRESS!,
          functionName: "monitor_batch",
          args: [runId, coinIdsPipe, symbolsPipe],
          value: 0n,
        });
        const receipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          interval: 5_000,
          retries: 60,
        });
        const txStatus =
          (receipt as { status?: string } | undefined)?.status ?? "unknown";
        console.log(
          `[cron] batch ${i + 1} ok tx=${hash} status=${txStatus}`,
        );
        successBatches++;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[cron] batch ${i + 1} attempt=${attempt} failed: ${msg}`,
        );
        if (attempt >= MAX_RETRIES) {
          console.error(`[cron] batch ${i + 1} giving up after ${attempt} tries`);
          failBatches++;
          break;
        }
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  // Read run record to surface alert count in the log.
  try {
    const runRecord = (await client.readContract({
      address: CONTRACT_ADDRESS!,
      functionName: "get_run",
      args: [runId],
    })) as {
      run_id?: string;
      batch_count?: number | bigint;
      coin_count?: number | bigint;
      alert_count?: number | bigint;
    };
    console.log(
      `[cron] runId=${runId} done batches=${successBatches}/${batches.length} failed=${failBatches} alertCount=${runRecord.alert_count ?? "?"} coinCount=${runRecord.coin_count ?? "?"}`,
    );
  } catch (err) {
    console.warn(
      `[cron] could not read run record:`,
      err instanceof Error ? err.message : err,
    );
  }

  if (failBatches > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[cron] fatal:", err);
  process.exit(1);
});
