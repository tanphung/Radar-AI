# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from dataclasses import dataclass

from genlayer import *


# Storage dataclasses — field order is locked. New fields go at the END only.

@allow_storage
@dataclass
class CoinAnalysis:
    coin_id: str
    symbol: str
    signal: str
    sentiment_score: u8
    risk_level: str
    confidence: u8
    breaking_headline: str
    news_json: str
    updates_json: str
    bullish_json: str
    risks_json: str
    smart_money: str
    verdict_summary: str
    sources_json: str
    requested_by: Address
    created_at_iso: str
    is_alert: bool
    alert_reason: str


@allow_storage
@dataclass
class CronRun:
    run_id: str
    started_at_iso: str
    batch_count: u32
    coin_count: u32
    alert_count: u32


class CryptoOracle(gl.Contract):
    owner: Address
    paused: bool
    next_analysis_id: u64
    next_run_id: u64
    analyses: TreeMap[str, CoinAnalysis]
    latest_by_coin: TreeMap[str, str]
    alerts_index: TreeMap[str, str]
    runs: TreeMap[str, CronRun]
    cron_authorized: TreeMap[str, bool]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.paused = False
        self.next_analysis_id = u64(1)
        self.next_run_id = u64(1)

    @gl.public.view
    def get_owner(self) -> Address:
        return self.owner

    @gl.public.view
    def is_paused(self) -> bool:
        return self.paused

    @gl.public.view
    def is_cron_authorized(self, operator: Address) -> bool:
        return self.cron_authorized.get(operator.as_hex, False)

    @gl.public.view
    def get_analysis(self, analysis_id: str) -> CoinAnalysis:
        if analysis_id not in self.analyses:
            raise gl.vm.UserError("Analysis not found")
        return self.analyses[analysis_id]

    @gl.public.view
    def get_latest_analysis(self, coin_id: str) -> CoinAnalysis:
        if coin_id not in self.latest_by_coin:
            raise gl.vm.UserError("No analysis for coin")
        analysis_id = self.latest_by_coin[coin_id]
        return self.analyses[analysis_id]

    @gl.public.view
    def get_alerts(self, coin_id: str) -> str:
        return self.alerts_index.get(coin_id, "")

    @gl.public.view
    def get_run(self, run_id: str) -> CronRun:
        if run_id not in self.runs:
            raise gl.vm.UserError("Run not found")
        return self.runs[run_id]

    @gl.public.write
    def set_global_paused(self, paused: bool) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner")
        self.paused = paused

    @gl.public.write
    def authorize_cron(self, operator: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner")
        self.cron_authorized[operator.as_hex] = True

    @gl.public.write
    def revoke_cron(self, operator: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner")
        self.cron_authorized[operator.as_hex] = False
