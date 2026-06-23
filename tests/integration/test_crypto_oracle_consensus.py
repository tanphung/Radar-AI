"""Live GenLayer smoke tests for upgraded CryptoLens.

Run only when a funded account/network is available:
    gltest tests/integration/ -v -s --network testnet_bradbury

Set CRYPTO_ORACLE_ADDRESS to attach to an existing deployment. Otherwise gltest
deploys the current contract before running the smoke tests.
"""
import json
import os

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded


CONTRACT_PATH = "contracts/crypto_oracle.py"
PRE_DEPLOYED_ADDRESS = os.environ.get("CRYPTO_ORACLE_ADDRESS", "").strip()


def snapshot(coin_id="bitcoin", symbol="BTC", price=10400000):
    return {
        "id": coin_id,
        "symbol": symbol,
        "price_usd_cents": price,
        "change_24h_pct": 4.2,
        "volume_usd": 45_000_000_000,
        "market_cap_usd": 2_000_000_000_000,
        "high_24h_cents": price + 300000,
        "low_24h_cents": price - 200000,
        "snapshot_timestamp": "2026-06-23T00:00:00Z",
        "source": "CoinGecko",
    }


def curated_batch():
    coins = [
        ("bitcoin", "BTC", 10400000),
        ("ethereum", "ETH", 350000),
        ("binancecoin", "BNB", 65000),
        ("ripple", "XRP", 250),
        ("solana", "SOL", 16500),
        ("dogecoin", "DOGE", 18),
        ("cardano", "ADA", 72),
        ("chainlink", "LINK", 1800),
        ("avalanche-2", "AVAX", 2600),
        ("sui", "SUI", 330),
    ]
    return json.dumps([snapshot(c, s, p) for c, s, p in coins])


def oracle():
    factory = get_contract_factory("CryptoOracle", path=CONTRACT_PATH)
    if PRE_DEPLOYED_ADDRESS:
        return factory.attach(PRE_DEPLOYED_ADDRESS)
    return factory.deploy(args=[])


def test_owner_is_initialized():
    contract = oracle()
    assert contract.get_owner(args=[]).call() is not None
    assert contract.is_paused(args=[]).call() is False


def test_request_analysis_creates_thesis_live():
    contract = oracle()
    receipt = contract.request_analysis(
        args=["bitcoin", "BTC", json.dumps(snapshot())],
    ).transact()
    assert tx_execution_succeeded(receipt)

    analysis = contract.get_latest_analysis(args=["bitcoin"]).call()
    assert analysis.coin_id == "bitcoin"
    assert analysis.signal in ("buy", "hold", "sell", "watch")
    assert analysis.thesis_id.startswith("th_")

    thesis = contract.get_thesis(args=[analysis.thesis_id]).call()
    assert thesis.horizon_hours == 24
    assert thesis.status in ("open", "intact", "weakened", "invalidated", "completed")


def test_monitor_batch_single_tx_records_ten_results_live():
    contract = oracle()
    run_id = "smoke_20260623"
    receipt = contract.monitor_batch(args=[run_id, curated_batch()]).transact()
    assert tx_execution_succeeded(receipt)

    run = contract.get_run(args=[run_id]).call()
    assert run.expected_coin_count == 10
    assert run.submitted_tx_count == 1
    assert run.processed_coin_count + run.failed_coin_count == 10

    result_ids = contract.get_run_result_ids(args=[run_id]).call()
    assert len(result_ids.split("|")) == 10
