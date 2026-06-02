# Crypto Analysis Dashboard

GenLayer-powered dApp for crypto market analysis with AI validator consensus.

See [`BUILD_PLAN.md`](./BUILD_PLAN.md) for the phased roadmap, exit gates, and
project-wide rules.

## Status

Phase 1 — contract scaffolding (`contracts/crypto_oracle.py`).

## Layout

```
contracts/   GenLayer intelligent contract (Python, GenVM)
tests/       direct + integration tests
scripts/     deploy + sanity utilities
cron/        GitHub Actions trigger script
frontend/    Next.js dashboard (added in Phase 3)
```
