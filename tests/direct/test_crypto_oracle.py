"""Direct tests for the CryptoOracle contract.

Covers access control, paused gating, LLM happy path, LLM error classification,
analysis indexing, and alerts append behavior. Mock LLM responses use the
"crypto market analyst" prompt prefix which is unique to this contract.
"""
import json

import pytest


CONTRACT_PATH = "contracts/crypto_oracle.py"
SDK_VERSION = "v0.2.16"
PROMPT_MATCH = "crypto market analyst"


def as_address(raw):
    from genlayer.py.types import Address

    return Address(raw)


def deploy(direct_deploy):
    return direct_deploy(CONTRACT_PATH, sdk_version=SDK_VERSION)


def valid_analysis(signal: str = "buy", is_alert: bool = False, alert_reason: str = "") -> str:
    """Build a valid LLM JSON response. Tweak fields per test as needed."""
    payload = {
        "signal": signal,
        "sentiment_score": 72,
        "risk_level": "medium",
        "confidence": 78,
        "breaking_headline": "Spot ETF inflows reach a record high this week.",
        "news": [
            {
                "sentiment": "positive",
                "title": "ETF inflows continue",
                "impact": "Sustained demand from institutional buyers",
            },
            {
                "sentiment": "neutral",
                "title": "Hashrate stable",
                "impact": "Network health unchanged",
            },
            {
                "sentiment": "negative",
                "title": "Whale dumps 5k BTC",
                "impact": "Short-term sell pressure on exchanges",
            },
        ],
        "project_updates": [
            {"type": "github", "content": "Core dev merged Taproot wallet PR"},
        ],
        "bullish_signals": [
            "Strong ETF inflows",
            "Halving narrative intact",
            "Whale accumulation",
        ],
        "risk_signals": [
            "Regulatory uncertainty in EU",
            "Macro headwinds from rate decisions",
            "Profit taking near ATH",
        ],
        "smart_money": "Top wallets net accumulated 12k BTC in the last 24h.",
        "verdict_summary": (
            "BTC remains structurally bullish on ETF inflows; near-term "
            "volatility is likely from whale flows."
        ),
        "data_sources": ["CoinGecko", "Glassnode", "CoinDesk"],
        "timestamp": "2026-06-02T12:00:00Z",
        "is_alert": is_alert,
        "alert_reason": alert_reason if is_alert else "",
    }
    return json.dumps(payload)


def test_owner_initialized(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    assert oracle.get_owner() == as_address(direct_alice)
    assert oracle.is_paused() is False


def test_set_global_paused_only_owner(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only owner"):
            oracle.set_global_paused(True)

    oracle.set_global_paused(True)
    assert oracle.is_paused() is True


def test_authorize_and_revoke_cron(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    bob = as_address(direct_bob)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only owner"):
            oracle.authorize_cron(bob)

    oracle.authorize_cron(bob)
    assert oracle.is_cron_authorized(bob) is True

    oracle.revoke_cron(bob)
    assert oracle.is_cron_authorized(bob) is False


def test_request_analysis_validates_inputs(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    with direct_vm.expect_revert("coin_id required"):
        oracle.request_analysis("", "BTC")
    with direct_vm.expect_revert("symbol required"):
        oracle.request_analysis("bitcoin", "")


def test_paused_blocks_request_analysis(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    oracle.set_global_paused(True)

    with direct_vm.expect_revert("Contract is paused"):
        oracle.request_analysis("bitcoin", "BTC")


def test_request_analysis_stores_record(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    direct_vm.mock_llm(PROMPT_MATCH, valid_analysis(signal="buy"))
    analysis_id = oracle.request_analysis("bitcoin", "BTC")

    assert analysis_id == "an_1"

    record = oracle.get_analysis(analysis_id)
    assert record.coin_id == "bitcoin"
    assert record.symbol == "BTC"
    assert record.signal == "buy"
    assert record.sentiment_score == 72
    assert record.confidence == 78
    assert record.risk_level == "medium"
    assert record.is_alert is False
    assert record.alert_reason == ""
    assert "ETF" in record.breaking_headline

    news = json.loads(record.news_json)
    assert len(news) == 3
    assert news[0]["sentiment"] == "positive"
    assert news[2]["sentiment"] == "negative"

    bullish = json.loads(record.bullish_json)
    assert len(bullish) == 3

    latest = oracle.get_latest_analysis("bitcoin")
    assert latest.signal == "buy"

    assert direct_vm.run_validator() is True


def test_latest_analysis_updates_on_repeat(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    direct_vm.mock_llm(PROMPT_MATCH, valid_analysis(signal="buy"))
    first_id = oracle.request_analysis("bitcoin", "BTC")
    assert first_id == "an_1"

    direct_vm.clear_mocks()
    direct_vm.mock_llm(PROMPT_MATCH, valid_analysis(signal="hold"))
    second_id = oracle.request_analysis("bitcoin", "BTC")
    assert second_id == "an_2"

    latest = oracle.get_latest_analysis("bitcoin")
    assert latest.signal == "hold"

    first = oracle.get_analysis(first_id)
    assert first.signal == "buy"


def test_request_analysis_reverts_on_invalid_signal(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    raw = json.loads(valid_analysis())
    raw["signal"] = "moon"
    direct_vm.mock_llm(PROMPT_MATCH, json.dumps(raw))

    with direct_vm.expect_revert("[LLM_ERROR]"):
        oracle.request_analysis("bitcoin", "BTC")


def test_request_analysis_reverts_on_missing_breaking_headline(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    raw = json.loads(valid_analysis())
    raw["breaking_headline"] = ""
    direct_vm.mock_llm(PROMPT_MATCH, json.dumps(raw))

    with direct_vm.expect_revert("[LLM_ERROR]"):
        oracle.request_analysis("bitcoin", "BTC")


def test_request_analysis_reverts_on_short_verdict(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    raw = json.loads(valid_analysis())
    raw["verdict_summary"] = "too short"
    direct_vm.mock_llm(PROMPT_MATCH, json.dumps(raw))

    with direct_vm.expect_revert("[LLM_ERROR]"):
        oracle.request_analysis("bitcoin", "BTC")


def test_request_analysis_reverts_on_too_few_bullish(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    raw = json.loads(valid_analysis())
    raw["bullish_signals"] = ["only one"]
    direct_vm.mock_llm(PROMPT_MATCH, json.dumps(raw))

    with direct_vm.expect_revert("[LLM_ERROR]"):
        oracle.request_analysis("bitcoin", "BTC")


def test_request_analysis_clamps_sentiment_out_of_range(
    direct_vm, direct_deploy, direct_alice
):
    """sentiment_score=150 should clamp to 100, not revert."""
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    raw = json.loads(valid_analysis())
    raw["sentiment_score"] = 150
    direct_vm.mock_llm(PROMPT_MATCH, json.dumps(raw))

    oracle.request_analysis("bitcoin", "BTC")
    record = oracle.get_latest_analysis("bitcoin")
    assert record.sentiment_score == 100


def test_monitor_batch_requires_owner_or_cron(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    direct_vm.mock_llm(PROMPT_MATCH, valid_analysis(is_alert=False))

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only owner or authorized cron"):
            oracle.monitor_batch("run_1", "bitcoin", "BTC")


def test_monitor_batch_works_for_authorized_cron(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    oracle.authorize_cron(as_address(direct_bob))

    direct_vm.mock_llm(PROMPT_MATCH, valid_analysis(is_alert=False))

    with direct_vm.prank(direct_bob):
        oracle.monitor_batch("run_1", "bitcoin", "BTC")

    run = oracle.get_run("run_1")
    assert run.batch_count == 1
    assert run.coin_count == 1
    assert run.alert_count == 0


def test_monitor_batch_validates_inputs(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    with direct_vm.expect_revert("run_id required"):
        oracle.monitor_batch("", "bitcoin", "BTC")
    with direct_vm.expect_revert("Batch is empty"):
        oracle.monitor_batch("run_1", "", "")
    with direct_vm.expect_revert("Symbols length mismatch"):
        oracle.monitor_batch("run_1", "bitcoin|ethereum", "BTC")


def test_monitor_batch_rejects_oversized_batch(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    coins = "|".join("coin_" + str(i) for i in range(31))
    syms = "|".join("S" + str(i) for i in range(31))

    with direct_vm.expect_revert("Batch is too large"):
        oracle.monitor_batch("run_1", coins, syms)


def test_paused_blocks_monitor_batch(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    oracle.authorize_cron(as_address(direct_bob))
    oracle.set_global_paused(True)

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Contract is paused"):
            oracle.monitor_batch("run_1", "bitcoin", "BTC")


def test_alerts_index_appends_only_when_flagged(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    direct_vm.mock_llm(
        PROMPT_MATCH,
        valid_analysis(is_alert=True, alert_reason="Whale net withdrew $52M from Binance in 1h."),
    )
    oracle.monitor_batch("run_1", "bitcoin", "BTC")

    alerts = oracle.get_alerts("bitcoin")
    assert alerts == "an_1"

    record = oracle.get_analysis("an_1")
    assert record.is_alert is True
    assert "Binance" in record.alert_reason

    run = oracle.get_run("run_1")
    assert run.alert_count == 1
    assert run.coin_count == 1
    assert run.batch_count == 1


def test_alerts_index_skips_when_not_flagged(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)

    direct_vm.mock_llm(PROMPT_MATCH, valid_analysis(is_alert=False))
    oracle.monitor_batch("run_2", "ethereum", "ETH")

    assert oracle.get_alerts("ethereum") == ""

    run = oracle.get_run("run_2")
    assert run.alert_count == 0
    assert run.coin_count == 1


def test_get_run_reverts_when_unknown(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    with direct_vm.expect_revert("Run not found"):
        oracle.get_run("nonexistent_run")


def test_get_analysis_reverts_when_unknown(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    with direct_vm.expect_revert("Analysis not found"):
        oracle.get_analysis("an_999")


def test_get_latest_analysis_reverts_when_no_data(
    direct_vm, direct_deploy, direct_alice
):
    direct_vm.sender = direct_alice
    oracle = deploy(direct_deploy)
    with direct_vm.expect_revert("No analysis for coin"):
        oracle.get_latest_analysis("dogecoin")
