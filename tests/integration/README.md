# Integration tests

These touch a live GenLayer environment. Each `request_analysis` call invokes
a real LLM + validator consensus and takes 30–90s to finalize. Keep the suite
small and rerun only when the contract or prompt changes.

## Prerequisites

- `pip install genlayer-test`
- A GenLayer environment: studionet (hosted, gasless, simplest), localnet
  (Docker), or testnet bradbury (needs funded GEN)

## Run against studionet (recommended for solo dev)

```bash
gltest tests/integration/ -v -s --network studionet
```

## Reuse the already-deployed contract

To avoid redeploying on every run, export the address first:

```bash
export CRYPTO_ORACLE_ADDRESS=0x4D10566d1017aaA495f482CCEDF94bcBA21F39e3
gltest tests/integration/ -v -s --network studionet
```

When `CRYPTO_ORACLE_ADDRESS` is set the fixture calls `factory.attach(addr)`
instead of `factory.deploy([])`.

## Run a single test

```bash
gltest tests/integration/test_crypto_oracle_consensus.py::test_request_analysis_runs_consensus -v -s --network studionet
```
