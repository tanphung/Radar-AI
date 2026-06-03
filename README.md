# CryptoLens — Crypto Analysis Dashboard on GenLayer

Real-time crypto price tracking + AI-consensus market intelligence reports.
The intelligence layer runs on GenLayer: multiple validators independently
adjudicate each analysis so no single AI controls the verdict.

**Deployed contract** (StudioNet): `0x4D10566d1017aaA495f482CCEDF94bcBA21F39e3`

## What it does

1. **Real-time dashboard** — Top 200 coin prices via CoinGecko + Binance
   WebSocket. Sub-second price flash, sortable, searchable, sparkline per row.
2. **Coin detail** — Lightweight-charts area chart with 1D/1W/1M/1Y/ALL range
   tabs, ATH/ATL/supply stats, live price header.
3. **On-demand AI analysis** — One click sends `request_analysis(coin, symbol)`
   to the contract. Leader LLM produces a structured JSON verdict (signal,
   sentiment, risk, news, project updates, bullish/risk signals, smart money,
   verdict, sources). Validators reach consensus on shape + range. Frontend
   renders a 7-section intelligence card.
4. **Autonomous monitoring** — GitHub Actions cron runs every 2 hours, splits
   the curated top-40 coin list into 4 batches of 10, and calls
   `monitor_batch` for each. Coins with `is_alert=true` get indexed for fast
   look-up.
5. **Personal watchlist** — Sign in with Ethereum (SIWE), star coins from any
   page, sync to Supabase via JWT-authenticated REST. Watchlist filters the
   alerts feed.
6. **Alert bell** — Badge counter for unseen alerts since last open; dropdown
   shows 5 most recent; `/alerts` page tabs by My Watchlist / All.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  frontend/  Next.js 16 + Tailwind 4 + shadcn             │
│    - dashboard, coin detail, analysis card, alerts UI    │
│    - SIWE sign-in (siwe + jose JWT)                      │
│    - watchlist (Supabase + Zustand store)                │
│    - real contract calls via genlayer-js                 │
└──────────────────────────────────────────────────────────┘
                ↑                          ↑
                │                          │
    ┌───────────┴──────┐       ┌───────────┴───────────────┐
    │  CoinGecko/      │       │  CryptoOracle contract    │
    │  Binance WS      │       │  - request_analysis       │
    └──────────────────┘       │  - monitor_batch          │
                               │  - get_latest_analysis    │
                               │  - get_alerts             │
                               └────────────┬──────────────┘
                                            ↑
                              ┌─────────────┴──────────┐
                              │  cron/                 │
                              │  monitor_coins.ts      │
                              │  Driven by GitHub      │
                              │  Actions every 2h      │
                              └────────────────────────┘
```

## Repository layout

```
contracts/        crypto_oracle.py — Python intelligent contract
tests/
  direct/         pytest direct mode, 22 tests, ~1s, mocks LLM
  integration/    gltest against a live GenLayer environment
frontend/         Next.js dApp (see frontend/README.md from create-next-app)
cron/             monitor driver run by GitHub Actions
.github/workflows/monitor-coins.yml   schedule: 0 */2 * * *
BUILD_PLAN.md     phased build log and rules followed during development
```

## Quick start (frontend, mock contract)

```bash
cd frontend
npm install
cp .env.example .env.local      # works as-is, mock contract enabled
npm run dev
# open http://localhost:3000
```

## Quick start (frontend, real contract on StudioNet)

```bash
cd frontend
cp .env.example .env.local
# edit .env.local — set:
#   NEXT_PUBLIC_CONTRACT_ADDRESS=0x4D10566d1017aaA495f482CCEDF94bcBA21F39e3
#   NEXT_PUBLIC_GENLAYER_NETWORK=studionet
#   NEXT_PUBLIC_MOCK_CONTRACT=0
npm run dev
```

## Contract test suite

```bash
# direct, fast (~1s, no Docker)
pip install genlayer-test genvm-linter
genvm-lint check contracts/crypto_oracle.py --json
pytest tests/direct/ -v

# integration, against the deployed contract
export CRYPTO_ORACLE_ADDRESS=0x4D10566d1017aaA495f482CCEDF94bcBA21F39e3
gltest tests/integration/ -v -s --network studionet
```

## Cron — local dry-run

```bash
cd cron
npm install
GENLAYER_NETWORK=studionet \
CONTRACT_ADDRESS=0x4D10566d1017aaA495f482CCEDF94bcBA21F39e3 \
CRON_PRIVATE_KEY=0x... \
npm run monitor
```

For the schedule to run automatically on GitHub, set repository secrets
`CONTRACT_ADDRESS`, `CRON_PRIVATE_KEY`, and optionally `GENLAYER_NETWORK`.

## Build process

This project was built phase-by-phase with explicit exit gates (lint /
typecheck / test) between phases. See [`BUILD_PLAN.md`](./BUILD_PLAN.md) for
the original plan, the changelog of deviations, and the engineering rules
followed (no junk files, no orphan components, every file wired in the same
commit it was created in).
