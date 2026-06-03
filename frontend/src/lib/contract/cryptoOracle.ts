"use client";

// Crypto oracle client. Real path uses genlayer-js when a valid contract
// address is configured and NEXT_PUBLIC_MOCK_CONTRACT is not "1". Otherwise
// the mock returns deterministic per-coin data so the UI works fully offline.
//
// Real <-> mock dispatch lives at the bottom of the file (requestAnalysis /
// getLatestAnalysis). The shape exposed upward is AnalysisResult / AlertSummary
// in both cases.

import {
  getContractAddress,
  getReadClient,
  getWriteClient,
  useRealContract,
} from "./client";
import type {
  AlertKind,
  AlertSummary,
  AnalysisResult,
  NewsItem,
  ProjectUpdate,
  RiskLevel,
  Signal,
  UpdateType,
} from "./schema";

const STORAGE_KEY = "cryptolens:analyses";
const MOCK_DELAY_MS = 12_000;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type Store = Record<string, AnalysisResult>;

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or private mode — non-fatal for a mock.
  }
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function generateMockAnalysis(
  coinId: string,
  symbol: string,
  coinName: string,
): AnalysisResult {
  const h = hash(coinId);
  const SIGNALS: Signal[] = ["buy", "hold", "watch", "sell"];
  const RISKS: RiskLevel[] = ["low", "medium", "high", "extreme"];
  // Skew distribution toward buy/hold/watch over sell so most demos look healthy.
  const signal = SIGNALS[h % 4];
  const riskLevel = RISKS[(h >> 3) % 4];
  const sentimentScore = 45 + (h % 50);
  const confidence = 55 + ((h >> 5) % 40);
  const upperSym = symbol.toUpperCase();
  const accumulationPct = (((h >> 7) % 80) / 10 + 0.5).toFixed(1);

  return {
    analysisId: `mock_${coinId}_${Date.now()}`,
    coinId,
    symbol,
    signal,
    sentimentScore,
    riskLevel,
    confidence,
    breakingHeadline: `${coinName} spot volume jumped ${20 + (h % 280)}% in the last 4 hours.`,
    news: [
      {
        sentiment: "positive",
        title: `Top fund reportedly accumulated ${upperSym} this week`,
        impact: "Could support price into the next funding cycle",
      },
      {
        sentiment: "neutral",
        title: `${coinName} foundation publishes quarterly report`,
        impact: "Roadmap intact, no surprises on token unlocks",
      },
      {
        sentiment: "negative",
        title: `${upperSym} sees rising sell-side flow on Asia-hours`,
        impact: "Possible distribution from large holders before US open",
      },
    ],
    projectUpdates: [
      {
        type: "github",
        content: `Core repo merged 14 commits this week including a consensus client release`,
      },
      {
        type: "institutional",
        content: `Two new market makers added ${upperSym} to their top-tier order book`,
      },
      {
        type: "community",
        content: `Subreddit engagement up 38% versus the 30-day average`,
      },
    ],
    bullishSignals: [
      "Spot ETF net inflows above 30-day average",
      "On-chain accumulation by top 100 wallets",
      "Funding rates normalizing while open interest holds",
      `${upperSym} dominance trending up versus the broader index`,
    ],
    riskSignals: [
      "Funding approaching overheated zone if rally extends",
      "Spot/perp basis widening on shorter expiries",
      "Concentrated supply on a single centralized venue",
      "Macro liquidity expected to tighten at next FOMC",
    ],
    smartMoney: `Top 50 wallets net-added ${accumulationPct}% to ${upperSym} positions in the last 24h while retail wallets net-distributed.`,
    verdictSummary: `${coinName} setup remains constructive with strong on-chain accumulation and improving institutional flows, but funding heat and supply concentration argue for tight risk management. Treat dips toward the 21-day mean as buyable while the 50-day trend holds.`,
    dataSources: [
      "CoinGecko",
      "Glassnode",
      "CoinDesk",
      "Etherscan",
      "X/Twitter sentiment",
    ],
    createdAt: new Date().toISOString(),
    isAlert: false,
    alertReason: "",
  };
}

async function requestAnalysisMock(
  coinId: string,
  symbol: string,
  coinName: string,
): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  const result = generateMockAnalysis(coinId, symbol, coinName);
  const store = loadStore();
  store[coinId] = result;
  saveStore(store);
  return result;
}

// --- Mock alerts (Phase 7) ---
// Real contract: monitor_batch flags is_alert; cron runs every 2h; frontend
// calls get_alerts(coinId) per cron-seeded coin. Until Phase 9, we generate
// deterministic alerts seeded by coin id so the UI is populated.

const ALERT_SEED: Array<{ id: string; symbol: string }> = [
  { id: "bitcoin", symbol: "btc" },
  { id: "ethereum", symbol: "eth" },
  { id: "solana", symbol: "sol" },
  { id: "binancecoin", symbol: "bnb" },
  { id: "ripple", symbol: "xrp" },
  { id: "cardano", symbol: "ada" },
  { id: "dogecoin", symbol: "doge" },
  { id: "avalanche-2", symbol: "avax" },
  { id: "polkadot", symbol: "dot" },
  { id: "chainlink", symbol: "link" },
];

const ALERT_TEMPLATES: Array<{
  kind: AlertKind;
  emoji: string;
  reason: (sym: string, n: number) => string;
}> = [
  {
    kind: "whale",
    emoji: "🐋",
    reason: (sym, n) =>
      `Whale net-withdrew $${30 + (n % 70)}M of ${sym} from a major CEX in the last hour`,
  },
  {
    kind: "volume",
    emoji: "📈",
    reason: (sym, n) =>
      `${sym} spot volume spiked +${180 + (n % 240)}% versus the 7-day average`,
  },
  {
    kind: "exchange",
    emoji: "🏦",
    reason: (sym, n) =>
      `${sym} exchange inflows reached a ${20 + (n % 25)}-day high`,
  },
  {
    kind: "dev",
    emoji: "🔧",
    reason: (sym, n) =>
      `${sym} core repos saw ${24 + (n % 50)} merged commits in the last 24h`,
  },
  {
    kind: "sentiment",
    emoji: "💬",
    reason: (sym) => `${sym} social sentiment flipped within the last 2 hours`,
  },
  {
    kind: "news",
    emoji: "📰",
    reason: (sym, n) =>
      `${sym} mentioned in ${5 + (n % 12)} top-tier outlets within an hour`,
  },
];

const SESSION_BASE_MS = Date.now();

function generateMockAlerts(): AlertSummary[] {
  const out: AlertSummary[] = [];
  for (const coin of ALERT_SEED) {
    const h = hash(coin.id);
    const count = h % 3; // 0, 1, or 2 alerts per coin
    for (let i = 0; i < count; i++) {
      const tpl = ALERT_TEMPLATES[(h + i * 7) % ALERT_TEMPLATES.length];
      const upperSym = coin.symbol.toUpperCase();
      const ageMin = (h + i * 23) % 600; // 0..600 minutes
      out.push({
        alertId: `alert_${coin.id}_${i}`,
        analysisId: `mock_${coin.id}`,
        coinId: coin.id,
        symbol: coin.symbol,
        kind: tpl.kind,
        emoji: tpl.emoji,
        reason: tpl.reason(upperSym, h + i * 13),
        createdAt: new Date(SESSION_BASE_MS - ageMin * 60_000).toISOString(),
      });
    }
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}

export function fetchAlertsAll(): AlertSummary[] {
  return generateMockAlerts();
}

function getLatestAnalysisMock(coinId: string): AnalysisResult | null {
  const store = loadStore();
  const found = store[coinId];
  if (!found) return null;
  const ageMs = Date.now() - new Date(found.createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return found;
  return ageMs <= RECENT_WINDOW_MS ? found : found;
}

// --- Real contract path (Phase 9) ---

interface RawCoinAnalysis {
  coin_id: string;
  symbol: string;
  signal: string;
  sentiment_score: number | bigint;
  risk_level: string;
  confidence: number | bigint;
  breaking_headline: string;
  news_json: string;
  updates_json: string;
  bullish_json: string;
  risks_json: string;
  smart_money: string;
  verdict_summary: string;
  sources_json: string;
  requested_by: string;
  created_at_iso: string;
  is_alert: boolean;
  alert_reason: string;
}

function safeJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function toAnalysisResult(
  raw: RawCoinAnalysis,
  analysisId: string,
): AnalysisResult {
  return {
    analysisId,
    coinId: raw.coin_id,
    symbol: raw.symbol,
    signal: raw.signal as Signal,
    sentimentScore: Number(raw.sentiment_score),
    riskLevel: raw.risk_level as RiskLevel,
    confidence: Number(raw.confidence),
    breakingHeadline: raw.breaking_headline,
    news: safeJsonArray<NewsItem>(raw.news_json, []),
    projectUpdates: safeJsonArray<ProjectUpdate>(raw.updates_json, []),
    bullishSignals: safeJsonArray<string>(raw.bullish_json, []),
    riskSignals: safeJsonArray<string>(raw.risks_json, []),
    smartMoney: raw.smart_money,
    verdictSummary: raw.verdict_summary,
    dataSources: safeJsonArray<string>(raw.sources_json, []),
    createdAt: raw.created_at_iso,
    isAlert: Boolean(raw.is_alert),
    alertReason: raw.alert_reason,
  };
}

async function getLatestAnalysisReal(
  coinId: string,
): Promise<AnalysisResult | null> {
  const address = getContractAddress();
  if (!address) return null;
  try {
    const client = getReadClient();
    const raw = (await client.readContract({
      address,
      functionName: "get_latest_analysis",
      args: [coinId],
    })) as unknown as RawCoinAnalysis;
    return toAnalysisResult(raw, `${coinId}_latest`);
  } catch (err) {
    // "No analysis for coin" is the contract's UserError on first call —
    // surface as a soft null so the UI shows the idle state.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("No analysis for coin")) return null;
    throw err;
  }
}

async function requestAnalysisReal(
  coinId: string,
  symbol: string,
): Promise<AnalysisResult> {
  const address = getContractAddress();
  if (!address) {
    throw new Error("Contract address not configured");
  }
  const client = getWriteClient();
  const hash = await client.writeContract({
    address,
    functionName: "request_analysis",
    args: [coinId, symbol],
    value: 0n,
  });
  await client.waitForTransactionReceipt({
    hash,
    interval: 5_000,
    retries: 60,
  });
  const stored = await getLatestAnalysisReal(coinId);
  if (!stored) {
    throw new Error("Analysis was submitted but could not be read back");
  }
  return stored;
}

// --- Dispatch ---

export async function requestAnalysis(
  coinId: string,
  symbol: string,
  coinName: string,
): Promise<AnalysisResult> {
  if (useRealContract()) {
    return requestAnalysisReal(coinId, symbol);
  }
  return requestAnalysisMock(coinId, symbol, coinName);
}

export async function getLatestAnalysis(
  coinId: string,
): Promise<AnalysisResult | null> {
  if (useRealContract()) {
    return getLatestAnalysisReal(coinId);
  }
  return getLatestAnalysisMock(coinId);
}
