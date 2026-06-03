# cron — GenLayer monitor_batch driver

Runs every 2 hours via GitHub Actions (`.github/workflows/monitor-coins.yml`).

## What it does

1. Loads `coins_top40.json` (40 coin id/symbol pairs)
2. Splits into 4 batches of 10
3. Calls `CryptoOracle.monitor_batch(run_id, coin_ids_pipe, symbols_pipe)` for
   each batch via genlayer-js
4. Waits for FINALIZED status on each tx, retries up to 3x with 5s delay on
   transient failures
5. Reads back `get_run(run_id)` to log final coin/alert counts

## Environment variables

| Name | Required | Example |
|------|----------|---------|
| `GENLAYER_NETWORK` | optional, defaults `studionet` | `studionet` / `testnet-bradbury` / `testnet-asimov` / `localnet` |
| `CONTRACT_ADDRESS` | yes | `0x4D10566d1017aaA495f482CCEDF94bcBA21F39e3` |
| `CRON_PRIVATE_KEY` | yes | `0x...` (operator that is owner OR authorized via `authorize_cron`) |
| `CRON_BATCH_SIZE` | optional, defaults 10 | `10` |

## Local dry-run

```bash
cd cron
npm install
GENLAYER_NETWORK=studionet \
CONTRACT_ADDRESS=0x... \
CRON_PRIVATE_KEY=0x... \
npm run monitor
```

## Refresh the coin list

```bash
npm run refresh-coins
git commit -am "chore(cron): refresh top-40 snapshot"
```
