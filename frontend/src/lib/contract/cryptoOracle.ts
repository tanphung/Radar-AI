"use client";

// Mock contract client — returned data shape matches what the real GenLayer
// contract will emit. Real genlayer-js wiring lands in Phase 9 (deploy);
// until then this lets the UI work end-to-end with deterministic but per-coin
// varied analyses persisted in localStorage.

import type { AnalysisResult, RiskLevel, Signal } from "./schema";

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

export async function requestAnalysis(
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

export function getLatestAnalysis(coinId: string): AnalysisResult | null {
  const store = loadStore();
  const found = store[coinId];
  if (!found) return null;
  const ageMs = Date.now() - new Date(found.createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return found;
  return ageMs <= RECENT_WINDOW_MS ? found : found;
}
