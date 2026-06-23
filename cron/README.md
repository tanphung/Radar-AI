# cron - GenLayer monitor_batch driver

Runs every 4 hours through `.github/workflows/monitor-coins.yml`.

## Normal Scheduled Path

1. Load `coins_curated_10.json`.
2. Fetch one bounded CoinGecko market snapshot for exactly 10 curated coins.
3. Submit one `monitor_batch(run_id, coins_snapshot_json)` write transaction.
4. Wait for consensus finalization and reject failed execution results.
5. Read back `get_run(run_id)` and `get_run_result_ids(run_id)` until all 10
   per-coin results are indexed.

The scheduled production flow must not split the list or call one transaction
per coin.

## Environment Variables

| Name | Required | Example |
|------|----------|---------|
| `GENLAYER_NETWORK` | optional, defaults `testnet-bradbury` | `testnet-bradbury` |
| `CONTRACT_ADDRESS` | yes outside dry-run | `0x...` |
| `CRON_PRIVATE_KEY` | yes outside dry-run | `0x...` |
| `CRON_DRY_RUN` | optional | `1` to fetch/build snapshot without signing |

## Local Dry-Run

```bash
cd cron
npm install
CRON_DRY_RUN=1 npm run monitor
```

## Live Run

```bash
cd cron
GENLAYER_NETWORK=testnet-bradbury \
CONTRACT_ADDRESS=0x... \
CRON_PRIVATE_KEY=0x... \
npm run monitor
```

The private key must be the contract owner or an address authorized with
`authorize_cron`.
