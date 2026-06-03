"""Integration tests for CryptoOracle on a live GenLayer environment.

These tests exercise the full consensus path — leader execution + validator
verification + finalization — so they need a running network. They are NOT
part of the fast `pytest tests/direct/` suite.

Run modes:
    # against studionet (hosted, gasless, requires Studio account)
    gltest tests/integration/ -v -s --network studionet

    # against a local studio docker
    gltest tests/integration/ -v -s --network localnet

    # against testnet bradbury (needs funded account)
    gltest tests/integration/ -v -s --network testnet_bradbury

Each `request_analysis` invocation triggers a real LLM call across validators
and takes 30-90s to finalize. Keep the suite small.
"""
import os

import pytest

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded


CONTRACT_PATH = "contracts/crypto_oracle.py"

# Reuse an already-deployed contract by setting this. Useful when you do not
# want to redeploy on every CI run, or when targeting a known address such as
# the one published in `.env.example`.
PRE_DEPLOYED_ADDRESS = os.environ.get("CRYPTO_ORACLE_ADDRESS", "").strip()


@pytest.fixture(scope="module")
def oracle():
    """Deploy a fresh CryptoOracle (or attach to a pre-deployed one)."""
    factory = get_contract_factory("CryptoOracle", path=CONTRACT_PATH)
    if PRE_DEPLOYED_ADDRESS:
        return factory.attach(PRE_DEPLOYED_ADDRESS)
    return factory.deploy(args=[])


def test_owner_is_initialized(oracle):
    """get_owner returns the deployer address; is_paused is False."""
    owner = oracle.get_owner(args=[]).call()
    assert owner is not None
    assert oracle.is_paused(args=[]).call() is False


def test_request_analysis_runs_consensus(oracle):
    """Submit a real request_analysis for bitcoin and read it back.

    Costs ~30-90s for consensus to finalize plus one LLM call per validator.
    Asserts the result has a valid signal and a non-empty verdict — the
    exact LLM output is not deterministic so we only check shape.
    """
    receipt = oracle.request_analysis(args=["bitcoin", "BTC"]).transact()
    assert tx_execution_succeeded(receipt)

    analysis = oracle.get_latest_analysis(args=["bitcoin"]).call()
    assert analysis.coin_id == "bitcoin"
    assert analysis.symbol == "BTC"
    assert analysis.signal in ("buy", "hold", "sell", "watch")
    assert analysis.risk_level in ("low", "medium", "high", "extreme")
    assert 0 <= analysis.sentiment_score <= 100
    assert 0 <= analysis.confidence <= 100
    assert len(analysis.breaking_headline) > 0
    assert len(analysis.verdict_summary) >= 40
    # JSON-encoded lists should at minimum start with `[`
    assert analysis.news_json.startswith("[")
    assert analysis.bullish_json.startswith("[")
    assert analysis.risks_json.startswith("[")


def test_get_alerts_initially_empty(oracle):
    """A coin that has never been monitored has no alerts."""
    alerts = oracle.get_alerts(args=["nonexistent-test-coin"]).call()
    assert alerts == ""
