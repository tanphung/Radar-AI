# Integration Tests

These touch a live GenLayer environment. They exercise leader execution,
validator consensus, finalization, and state read-back for the upgraded
CryptoLens contract.

## Prerequisites

- `pip install genlayer-test`
- A GenLayer network such as `testnet_bradbury`, `studionet`, or `localnet`
- A funded/authorized account when the selected network requires gas

## Run Against Bradbury

```bash
gltest tests/integration/ -v -s --network testnet_bradbury
```

## Attach To An Existing Deployment

```bash
set CRYPTO_ORACLE_ADDRESS=0x...
gltest tests/integration/ -v -s --network testnet_bradbury
```

When `CRYPTO_ORACLE_ADDRESS` is set, tests attach to that address instead of
deploying a fresh contract.

## Covered Smoke Paths

- owner initialization
- `request_analysis(coin_id, symbol, market_snapshot_json)` creates a thesis
- one `monitor_batch(run_id, coins_snapshot_json)` transaction records 10
  per-coin run results
