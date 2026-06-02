# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from dataclasses import dataclass

from genlayer import *


SIGNAL_BUY = "buy"
SIGNAL_HOLD = "hold"
SIGNAL_SELL = "sell"
SIGNAL_WATCH = "watch"

RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"
RISK_EXTREME = "extreme"

NEWS_POSITIVE = "positive"
NEWS_NEUTRAL = "neutral"
NEWS_NEGATIVE = "negative"

UPDATE_GITHUB = "github"
UPDATE_ANNOUNCEMENT = "announcement"
UPDATE_INSTITUTIONAL = "institutional"
UPDATE_COMMUNITY = "community"

ERROR_LLM = "[LLM_ERROR]"
MAX_BATCH_SIZE = 30


def _split_pipe(raw: str) -> list[str]:
    if len(raw) == 0:
        return []
    parts = raw.split("|")
    out = []
    for part in parts:
        out.append(str(part).strip())
    return out


def _pick(data, key_a: str, key_b: str = "", key_c: str = ""):
    if key_a in data:
        return data[key_a]
    if len(key_b) > 0 and key_b in data:
        return data[key_b]
    if len(key_c) > 0 and key_c in data:
        return data[key_c]
    return None


def _trim(raw, max_len: int) -> str:
    text = str(raw).strip()
    if len(text) > max_len:
        return text[:max_len]
    return text


def _norm_int_range(raw, lo: int, hi: int) -> int:
    if isinstance(raw, bool):
        raise gl.vm.UserError(ERROR_LLM + " invalid numeric")
    try:
        text = str(raw).strip()
        if "." in text:
            text = text.split(".", 1)[0]
        value = int(text)
    except Exception:
        raise gl.vm.UserError(ERROR_LLM + " invalid numeric")
    if value < lo:
        return lo
    if value > hi:
        return hi
    return value


def _norm_bool(raw) -> bool:
    if isinstance(raw, bool):
        return raw
    text = str(raw).strip().lower()
    return text in ("true", "yes", "1", "y")


def _norm_signal(raw) -> str:
    text = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
    if text in ("buy", "long", "accumulate"):
        return SIGNAL_BUY
    if text in ("hold", "neutral"):
        return SIGNAL_HOLD
    if text in ("sell", "short", "exit"):
        return SIGNAL_SELL
    if text in ("watch", "watchlist", "monitor"):
        return SIGNAL_WATCH
    raise gl.vm.UserError(ERROR_LLM + " invalid signal")


def _norm_risk(raw) -> str:
    text = str(raw).strip().lower()
    if text == "low":
        return RISK_LOW
    if text in ("medium", "med", "moderate"):
        return RISK_MEDIUM
    if text == "high":
        return RISK_HIGH
    if text in ("extreme", "very_high", "critical"):
        return RISK_EXTREME
    raise gl.vm.UserError(ERROR_LLM + " invalid risk level")


def _norm_news_sentiment(raw) -> str:
    text = str(raw).strip().lower()
    if text in ("positive", "bullish", "good"):
        return NEWS_POSITIVE
    if text in ("negative", "bearish", "bad"):
        return NEWS_NEGATIVE
    return NEWS_NEUTRAL


def _norm_update_type(raw) -> str:
    text = str(raw).strip().lower()
    if text == UPDATE_GITHUB or text in ("commit", "release", "code"):
        return UPDATE_GITHUB
    if text == UPDATE_INSTITUTIONAL or text in ("fund", "etf"):
        return UPDATE_INSTITUTIONAL
    if text == UPDATE_COMMUNITY or text in ("twitter", "social", "reddit"):
        return UPDATE_COMMUNITY
    return UPDATE_ANNOUNCEMENT


def _norm_str_list(raw, min_len: int, max_len: int, item_max: int) -> list[str]:
    if not isinstance(raw, list):
        raise gl.vm.UserError(ERROR_LLM + " expected list")
    items = []
    for item in raw:
        text = _trim(item, item_max)
        if len(text) > 0:
            items.append(text)
    if len(items) < min_len:
        raise gl.vm.UserError(ERROR_LLM + " list too short")
    if len(items) > max_len:
        return items[:max_len]
    return items


def _norm_news_list(raw) -> list:
    if not isinstance(raw, list):
        raise gl.vm.UserError(ERROR_LLM + " news must be a list")
    items = []
    capped = raw[:6]
    for item in capped:
        if not isinstance(item, dict):
            continue
        sentiment = _norm_news_sentiment(_pick(item, "sentiment") or "neutral")
        title = _trim(_pick(item, "title", "headline") or "", 300)
        impact = _trim(_pick(item, "impact", "effect") or "", 500)
        if len(title) == 0 or len(impact) == 0:
            continue
        items.append({"sentiment": sentiment, "title": title, "impact": impact})
    if len(items) == 0:
        raise gl.vm.UserError(ERROR_LLM + " news items invalid")
    return items


def _norm_updates_list(raw) -> list:
    if not isinstance(raw, list):
        return []
    items = []
    capped = raw[:8]
    for item in capped:
        if not isinstance(item, dict):
            continue
        kind = _norm_update_type(_pick(item, "type", "kind") or "announcement")
        content = _trim(_pick(item, "content", "text", "description") or "", 500)
        if len(content) == 0:
            continue
        items.append({"type": kind, "content": content})
    return items


def _norm_sources_list(raw) -> list:
    if not isinstance(raw, list):
        return []
    items = []
    capped = raw[:10]
    for item in capped:
        text = _trim(item, 200)
        if len(text) > 0:
            items.append(text)
    return items


def _normalize_analysis(response, include_alert: bool) -> dict:
    if not isinstance(response, dict):
        raise gl.vm.UserError(ERROR_LLM + " response must be JSON object")

    signal = _norm_signal(_pick(response, "signal", "recommendation"))
    sentiment_score = _norm_int_range(
        _pick(response, "sentiment_score", "sentiment"), 0, 100
    )
    risk_level = _norm_risk(_pick(response, "risk_level", "risk"))
    confidence = _norm_int_range(_pick(response, "confidence"), 0, 100)
    breaking = _trim(_pick(response, "breaking_headline", "headline") or "", 300)
    if len(breaking) == 0:
        raise gl.vm.UserError(ERROR_LLM + " missing breaking_headline")

    news = _norm_news_list(_pick(response, "news", "news_items"))
    updates = _norm_updates_list(_pick(response, "project_updates", "updates") or [])
    bullish = _norm_str_list(
        _pick(response, "bullish_signals", "bullish") or [], 3, 6, 200
    )
    risks = _norm_str_list(
        _pick(response, "risk_signals", "risks") or [], 3, 6, 200
    )
    smart_money = _trim(_pick(response, "smart_money", "whale_activity") or "", 500)
    verdict = _trim(_pick(response, "verdict_summary", "verdict") or "", 800)
    if len(verdict) < 40:
        raise gl.vm.UserError(ERROR_LLM + " verdict too short")
    sources = _norm_sources_list(_pick(response, "data_sources", "sources") or [])
    created_at_iso = _trim(_pick(response, "timestamp", "created_at") or "", 64)

    result = {
        "signal": signal,
        "sentiment_score": sentiment_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "breaking_headline": breaking,
        "news": news,
        "project_updates": updates,
        "bullish_signals": bullish,
        "risk_signals": risks,
        "smart_money": smart_money,
        "verdict_summary": verdict,
        "data_sources": sources,
        "created_at_iso": created_at_iso,
    }

    if include_alert:
        result["is_alert"] = _norm_bool(_pick(response, "is_alert") or False)
        result["alert_reason"] = _trim(_pick(response, "alert_reason") or "", 300)
        if result["is_alert"] and len(result["alert_reason"]) == 0:
            raise gl.vm.UserError(ERROR_LLM + " alert flagged but no reason")
    else:
        result["is_alert"] = False
        result["alert_reason"] = ""

    return result


def _is_valid_analysis(judgment, include_alert: bool) -> bool:
    if not isinstance(judgment, dict):
        return False
    if judgment.get("signal") not in (
        SIGNAL_BUY,
        SIGNAL_HOLD,
        SIGNAL_SELL,
        SIGNAL_WATCH,
    ):
        return False
    if judgment.get("risk_level") not in (
        RISK_LOW,
        RISK_MEDIUM,
        RISK_HIGH,
        RISK_EXTREME,
    ):
        return False
    score = judgment.get("sentiment_score")
    if isinstance(score, bool) or not isinstance(score, int):
        return False
    if score < 0 or score > 100:
        return False
    conf = judgment.get("confidence")
    if isinstance(conf, bool) or not isinstance(conf, int):
        return False
    if conf < 0 or conf > 100:
        return False
    headline = judgment.get("breaking_headline")
    if not isinstance(headline, str) or len(headline) == 0:
        return False
    news = judgment.get("news")
    if not isinstance(news, list) or len(news) == 0:
        return False
    for item in news:
        if not isinstance(item, dict):
            return False
        if item.get("sentiment") not in (
            NEWS_POSITIVE,
            NEWS_NEUTRAL,
            NEWS_NEGATIVE,
        ):
            return False
        title = item.get("title")
        impact = item.get("impact")
        if not isinstance(title, str) or len(title) == 0:
            return False
        if not isinstance(impact, str) or len(impact) == 0:
            return False
    bullish = judgment.get("bullish_signals")
    if not isinstance(bullish, list) or len(bullish) < 3:
        return False
    risks = judgment.get("risk_signals")
    if not isinstance(risks, list) or len(risks) < 3:
        return False
    verdict = judgment.get("verdict_summary")
    if not isinstance(verdict, str) or len(verdict) < 40:
        return False
    if include_alert:
        if not isinstance(judgment.get("is_alert"), bool):
            return False
        reason = judgment.get("alert_reason")
        if not isinstance(reason, str):
            return False
        if judgment["is_alert"] and len(reason) == 0:
            return False
    return True


def _build_analysis_prompt(coin_id: str, symbol: str, include_alert: bool) -> str:
    base = (
        "You are a crypto market analyst. Produce a structured intelligence report "
        "for the coin below. Return ONLY a valid JSON object — no markdown, no prose "
        "outside JSON. Use the latest knowledge available to you.\n\n"
        "Coin id (CoinGecko): " + coin_id + "\n"
        "Symbol: " + symbol + "\n\n"
        "Required JSON keys:\n"
        '  signal: "buy" | "hold" | "sell" | "watch"\n'
        "  sentiment_score: integer 0..100\n"
        '  risk_level: "low" | "medium" | "high" | "extreme"\n'
        "  confidence: integer 0..100\n"
        "  breaking_headline: short string, single most important event right now\n"
        "  news: list of 3-5 items, each {sentiment, title, impact}\n"
        '    sentiment: "positive" | "neutral" | "negative"\n'
        "  project_updates: list of 0-5 items, each {type, content}\n"
        '    type: "github" | "announcement" | "institutional" | "community"\n'
        "  bullish_signals: list of 3-6 short strings\n"
        "  risk_signals: list of 3-6 short strings\n"
        "  smart_money: short string describing whale / smart wallet activity (24h)\n"
        "  verdict_summary: 2-3 sentence prose summary with a concrete recommendation\n"
        "  data_sources: list of source names considered\n"
        "  timestamp: ISO-8601 string for now\n"
    )
    if include_alert:
        base = base + (
            "  is_alert: boolean — true ONLY if a genuinely abnormal event is detected\n"
            "    among: whale move > $10M in 1h, volume spike > 3x 7d avg,\n"
            "    unusual exchange in/out flow, large dev activity, sudden sentiment\n"
            "    shift, or high-impact breaking news.\n"
            '  alert_reason: short string (required if is_alert=true, else "")\n'
        )
    return base + "\nReturn JSON only. No code fences. No commentary.\n"


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

    @gl.public.write
    def request_analysis(self, coin_id: str, symbol: str) -> str:
        if self.paused:
            raise gl.vm.UserError("Contract is paused")
        if len(coin_id) == 0:
            raise gl.vm.UserError("coin_id required")
        if len(symbol) == 0:
            raise gl.vm.UserError("symbol required")

        result = self._run_analysis_consensus(coin_id, symbol, False)
        return self._store_analysis(
            coin_id, symbol, gl.message.sender_address, result
        )

    @gl.public.write
    def monitor_batch(
        self,
        run_id: str,
        coin_ids_pipe: str,
        symbols_pipe: str,
    ) -> str:
        sender = gl.message.sender_address
        if sender != self.owner and not self.cron_authorized.get(sender.as_hex, False):
            raise gl.vm.UserError("Only owner or authorized cron")
        if self.paused:
            raise gl.vm.UserError("Contract is paused")
        if len(run_id) == 0:
            raise gl.vm.UserError("run_id required")

        coin_ids = _split_pipe(coin_ids_pipe)
        symbols = _split_pipe(symbols_pipe)
        count = len(coin_ids)
        if count == 0:
            raise gl.vm.UserError("Batch is empty")
        if count > MAX_BATCH_SIZE:
            raise gl.vm.UserError("Batch is too large")
        if len(symbols) != count:
            raise gl.vm.UserError("Symbols length mismatch")

        if run_id in self.runs:
            existing = self.runs[run_id]
            batch_count = existing.batch_count
            coin_count = existing.coin_count
            alert_count = existing.alert_count
            started_at_iso = existing.started_at_iso
        else:
            batch_count = u32(0)
            coin_count = u32(0)
            alert_count = u32(0)
            started_at_iso = ""

        created_ids = ""
        for index in range(count):
            coin_id = coin_ids[index]
            symbol = symbols[index]
            if len(coin_id) == 0 or len(symbol) == 0:
                continue
            result = self._run_analysis_consensus(coin_id, symbol, True)
            analysis_id = self._store_analysis(coin_id, symbol, sender, result)
            created_ids = self._append_id(created_ids, analysis_id)
            coin_count = u32(coin_count + 1)
            if bool(result.get("is_alert")):
                alert_count = u32(alert_count + 1)
            if len(started_at_iso) == 0:
                started_at_iso = str(result.get("created_at_iso", ""))

        self.runs[run_id] = CronRun(
            run_id=run_id,
            started_at_iso=started_at_iso,
            batch_count=u32(batch_count + 1),
            coin_count=coin_count,
            alert_count=alert_count,
        )
        return created_ids

    def _run_analysis_consensus(
        self, coin_id: str, symbol: str, include_alert: bool
    ) -> dict:
        prompt = _build_analysis_prompt(coin_id, symbol, include_alert)

        def leader_fn() -> dict:
            response = gl.nondet.exec_prompt(prompt, response_format="json")
            return _normalize_analysis(response, include_alert)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            return _is_valid_analysis(leader_result.calldata, include_alert)

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _store_analysis(
        self,
        coin_id: str,
        symbol: str,
        requester: Address,
        result: dict,
    ) -> str:
        analysis_id = "an_" + str(self.next_analysis_id)
        self.next_analysis_id = u64(self.next_analysis_id + 1)

        record = CoinAnalysis(
            coin_id=coin_id,
            symbol=symbol,
            signal=str(result["signal"]),
            sentiment_score=u8(result["sentiment_score"]),
            risk_level=str(result["risk_level"]),
            confidence=u8(result["confidence"]),
            breaking_headline=str(result["breaking_headline"]),
            news_json=json.dumps(result["news"], separators=(",", ":")),
            updates_json=json.dumps(result["project_updates"], separators=(",", ":")),
            bullish_json=json.dumps(result["bullish_signals"], separators=(",", ":")),
            risks_json=json.dumps(result["risk_signals"], separators=(",", ":")),
            smart_money=str(result["smart_money"]),
            verdict_summary=str(result["verdict_summary"]),
            sources_json=json.dumps(result["data_sources"], separators=(",", ":")),
            requested_by=requester,
            created_at_iso=str(result.get("created_at_iso", "")),
            is_alert=bool(result.get("is_alert", False)),
            alert_reason=str(result.get("alert_reason", "")),
        )
        self.analyses[analysis_id] = record
        self.latest_by_coin[coin_id] = analysis_id
        if record.is_alert:
            current = self.alerts_index.get(coin_id, "")
            self.alerts_index[coin_id] = self._append_id(current, analysis_id)
        return analysis_id

    def _append_id(self, current: str, new_id: str) -> str:
        if len(current) == 0:
            return new_id
        return current + "|" + new_id
