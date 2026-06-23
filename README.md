# CryptoLens - GenLayer Market Intelligence

CryptoLens is a crypto dashboard plus a GenLayer adjudication layer for
persistent market intelligence. The product is intended to fail without
GenLayer: its core value is decentralized semantic adjudication of live market
evidence, challengeable incident decisions, and persistent on-chain thesis
outcomes.

## What Changed

- Coin pages now support project fundamentals, market intelligence, incidents,
  challenges, and thesis history.
- The Intelligent Contract stores Coin Intelligence Profiles, Market Incidents,
  Evidence Records, Incident Challenges, Signal Theses, Thesis Checkpoints, and
  batch Monitor Runs.
- Scheduled monitoring is exactly 10 curated coins, every 4 hours, in one
  `monitor_batch` write transaction.
- Frontend and cron writes must verify execution success and then read state
  back before treating a transaction as complete.

The old StudioNet address from the previous schema is stale after this storage
migration. Redeploy before using real mode.

## Architecture

```text
frontend/ Next.js
  dashboard, coin tabs, alerts, watchlist, SIWE
        |
        | genlayer-js read/write + read-back verification
        v
contracts/crypto_oracle.py
  profiles, incidents, evidence, challenges, theses, monitor runs
        ^
        |
cron/ monitor_coins.ts
  curated 10 CoinGecko snapshot -> one monitor_batch tx every 4h
```

GenLayer is used for semantic decisions that deterministic code cannot make:
incident transitions, severity, evidence stance, challenge outcome, and thesis
validity. Fast-changing prices are passed as bounded snapshots; the contract
does not ask the LLM to invent current market data.

## Curated Monitoring Set

This is a curated MVP set, not a live top-10 market-cap claim:

1. bitcoin / BTC
2. ethereum / ETH
3. binancecoin / BNB
4. ripple / XRP
5. solana / SOL
6. dogecoin / DOGE
7. cardano / ADA
8. chainlink / LINK
9. avalanche-2 / AVAX
10. sui / SUI

## Quick Start

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Mock mode is enabled by default with `NEXT_PUBLIC_MOCK_CONTRACT=1`. It is only
for local UI development and is visibly labeled in the app.

## Real Contract Mode

After deploying the new contract, set:

```text
NEXT_PUBLIC_GENLAYER_NETWORK=testnet-bradbury
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RETIRED_CONTRACT_ADDRESSES=0xOldAddress1,0xOldAddress2
NEXT_PUBLIC_MOCK_CONTRACT=0
```

Do not claim the app is deployed until there is a real transaction hash, a real
contract address, successful consensus execution, state read-back, and frontend
configuration pointing to that address.

## Contract Checks

```bash
pip install genvm-linter genlayer-test
genvm-lint check contracts/crypto_oracle.py --json
pytest tests/direct/ -v
```

Live smoke tests require a usable network/account:

```bash
gltest tests/integration/ -v -s --network testnet_bradbury
```

## Cron

Dry-run without signing:

```bash
cd cron
npm install
CRON_DRY_RUN=1 npm run monitor
```

Live scheduled run:

```bash
GENLAYER_NETWORK=testnet-bradbury \
CONTRACT_ADDRESS=0x... \
CRON_PRIVATE_KEY=0x... \
npm run monitor
```

Expected normal result: 1 write transaction, 10 expected coins, 10 per-coin run
results.

## Demo Script

1. Open a coin page.
2. Read Project Fundamentals to understand the project and token utility.
3. Run Market Intelligence to create a 24-hour thesis.
4. Open Incidents and inspect status, severity, and evidence timeline.
5. Submit counter-evidence through the challenge form.
6. Show the resulting GenLayer verdict and incident state transition.
7. Open Thesis History and show checkpoint/final measured outcome.
8. Show the transaction and state read-back evidence for the write.

## Known Limitations

- Bradbury deployment, faucet funding, wallet signing, GitHub secrets, and live
  frontend hosting are manual credential-dependent steps.
- Existing deployed addresses are incompatible with the new storage schema.
- Mock mode remains for local UI work but must not be presented as GenLayer
  state.
