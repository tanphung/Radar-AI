"use client";

import {
  getContractAddress,
  getReadClient,
  getWriteClient,
  isRealContractEnabled,
} from "./client";
import type {
  AlertImpact,
  AlertKind,
  AlertSummary,
  CoinProfile,
  EvidenceRecord,
  IncidentChallenge,
  MarketIncident,
  MarketSnapshotInput,
  NewsItem,
  ProjectUpdate,
  RiskLevel,
  Signal,
  SignalThesis,
  ThesisCheckpoint,
} from "./schema";

const STORAGE_KEY = "cryptolens:analyses";
const MOCK_DELAY_MS = 900;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

type Store = Record<string, AnalysisResult>;

export interface AnalysisResult {
  analysisId: string;
  coinId: string;
  symbol: string;
  signal: Signal;
  sentimentScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  breakingHeadline: string;
  news: NewsItem[];
  projectUpdates: ProjectUpdate[];
  bullishSignals: string[];
  riskSignals: string[];
  smartMoney: string;
  verdictSummary: string;
  dataSources: string[];
  createdAt: string;
  isAlert: boolean;
  alertReason: string;
  thesisId?: string;
  marketSnapshotJson?: string;
}

const FAILED_RESULT_NAMES = new Set([
  "DISAGREE",
  "MAJORITY_DISAGREE",
  "TIMEOUT",
  "DETERMINISTIC_VIOLATION",
  "NO_MAJORITY",
  "ERROR",
  "REVERTED",
  "CANCELED",
  "CANCELLED",
  "UNDETERMINED",
]);

const CURATED_ALERT_COINS = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "binancecoin", symbol: "BNB" },
  { id: "ripple", symbol: "XRP" },
  { id: "solana", symbol: "SOL" },
  { id: "dogecoin", symbol: "DOGE" },
  { id: "cardano", symbol: "ADA" },
  { id: "chainlink", symbol: "LINK" },
  { id: "avalanche-2", symbol: "AVAX" },
  { id: "sui", symbol: "SUI" },
];

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
    // Non-fatal in private mode.
  }
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function safeJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function safeJsonObject<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function splitPipe(raw: unknown): string[] {
  const text = String(raw ?? "");
  return text.length === 0 ? [] : text.split("|").filter(Boolean);
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function executionSucceeded(receipt: unknown): boolean {
  const r = receipt as Record<string, unknown> | undefined;
  const resultNameByNumber: Record<string, string> = {
    "1": "AGREE",
    "2": "DISAGREE",
    "3": "TIMEOUT",
    "4": "DETERMINISTIC_VIOLATION",
    "5": "NO_MAJORITY",
    "6": "MAJORITY_AGREE",
    "7": "MAJORITY_DISAGREE",
  };
  const resultRaw =
    r?.result_name ??
    r?.resultName ??
    resultNameByNumber[String(r?.result)] ??
    (typeof r?.result === "object" && r?.result
      ? (r.result as Record<string, unknown>).name
      : undefined) ??
    r?.result;
  const resultName = String(resultRaw ?? "").toUpperCase();
  if (FAILED_RESULT_NAMES.has(resultName)) return false;
  if (resultName.includes("AGREE") || resultName.includes("SUCCESS")) return true;
  const statusName = String(r?.statusName ?? r?.status_name ?? r?.status ?? "").toUpperCase();
  return statusName === "ACCEPTED" || statusName === "FINALIZED";
}

async function waitForSuccessfulWrite(
  client: ReturnType<typeof getWriteClient>,
  hash: Awaited<ReturnType<ReturnType<typeof getWriteClient>["writeContract"]>>,
) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    interval: 5_000,
    retries: 120,
  });
  if (!executionSucceeded(receipt)) {
    throw new Error(`GenLayer execution failed after wallet hash ${hash}`);
  }
  return receipt;
}

async function poll<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
  throw new Error(`${label} was not readable after consensus: ${lastError}`);
}

function generateMockAnalysis(coinId: string, symbol: string, coinName: string): AnalysisResult {
  const h = hash(coinId);
  const signals: Signal[] = ["buy", "hold", "watch", "sell"];
  const risks: RiskLevel[] = ["low", "medium", "high", "extreme"];
  const upperSym = symbol.toUpperCase();
  return {
    analysisId: `mock_${coinId}_${Date.now()}`,
    coinId,
    symbol,
    signal: signals[h % signals.length],
    sentimentScore: 45 + (h % 50),
    riskLevel: risks[(h >> 3) % risks.length],
    confidence: 55 + ((h >> 5) % 40),
    breakingHeadline: `${coinName} monitoring snapshot shows unusual market attention.`,
    news: [
      {
        sentiment: "neutral",
        title: `${upperSym} market context refreshed`,
        impact: "Demo mode uses bounded local fixtures, not GenLayer state.",
      },
    ],
    projectUpdates: [
      {
        type: "announcement",
        content: "Project fundamentals are shown from a local mock profile in demo mode.",
      },
    ],
    bullishSignals: ["Spot demand", "Constructive liquidity", "Stable derivatives"],
    riskSignals: ["Macro volatility", "Exchange-flow uncertainty", "Thin weekend liquidity"],
    smartMoney: "Not verified in mock mode.",
    verdictSummary: `${coinName} has a demo-mode thesis. Switch to a deployed GenLayer contract for adjudicated market intelligence.`,
    dataSources: ["Mock mode"],
    createdAt: new Date().toISOString(),
    isAlert: false,
    alertReason: "",
    thesisId: `mock_thesis_${coinId}`,
  };
}

async function requestAnalysisMock(coinId: string, symbol: string, coinName: string): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  const result = generateMockAnalysis(coinId, symbol, coinName);
  const store = loadStore();
  store[coinId] = result;
  saveStore(store);
  return result;
}

function getLatestAnalysisMock(coinId: string): AnalysisResult | null {
  const found = loadStore()[coinId];
  if (!found) return null;
  const ageMs = Date.now() - new Date(found.createdAt).getTime();
  return !Number.isFinite(ageMs) || ageMs <= RECENT_WINDOW_MS ? found : null;
}

function mockProfile(coinId: string, symbol: string, name?: string): CoinProfile {
  return {
    coinId,
    symbol: symbol.toUpperCase(),
    projectName: name ?? coinId,
    plainLanguageSummary: "Demo profile. Real mode stores a GenLayer-verified project profile with bounded unknowns.",
    problemSolved: "Not verified in mock mode",
    targetUsers: "Not verified in mock mode",
    category: "Unknown",
    ecosystem: "Unknown",
    architecture: "Not verified",
    tokenUtility: "Not verified",
    useCases: ["Unknown"],
    tokenomics: "Not verified",
    supplyModel: "Not verified",
    governance: "Not verified",
    dependencies: ["Unknown"],
    nonPriceRisks: ["Unknown"],
    sources: ["Mock mode"],
    updatedAt: new Date().toISOString(),
  };
}

function mockIncidents(): MarketIncident[] {
  return [
    {
      incidentId: "mock_incident_bitcoin",
      coinId: "bitcoin",
      symbol: "BTC",
      title: "Demo BTC market incident",
      summary: "This is a visibly labeled mock incident for local UI development.",
      status: "investigating",
      severity: "watch",
      startedAt: new Date(Date.now() - 3_600_000).toISOString(),
      updatedAt: new Date().toISOString(),
      latestUpdate: "Mock mode has no GenLayer adjudication.",
      supportingEvidenceIds: ["mock_ev_1"],
      conflictingEvidenceIds: [],
      neutralEvidenceIds: [],
      linkedRunIds: ["mock_run"],
      resolutionReason: "",
      transitionReason: "Demo data only.",
    },
  ];
}

function mockEvidence(incidentId: string): EvidenceRecord[] {
  return [
    {
      evidenceId: "mock_ev_1",
      incidentId,
      sourceName: "Mock mode",
      sourceUrl: "",
      evidenceType: "market_monitor",
      claim: "Mock evidence is not fetched from GenLayer.",
      marketSnapshot: null,
      fetched: false,
      stance: "neutral",
      observedAt: new Date().toISOString(),
      impact: "Use real contract mode for adjudicated evidence.",
    },
  ];
}

function mockTheses(coinId: string, symbol: string): SignalThesis[] {
  return [
    {
      thesisId: `mock_thesis_${coinId}`,
      coinId,
      analysisId: `mock_${coinId}`,
      signal: "watch",
      referencePriceCents: 0,
      referenceTimestamp: new Date().toISOString(),
      horizonHours: 24,
      thesis: `${symbol.toUpperCase()} has a demo-mode thesis only.`,
      bullishCase: "Not verified in mock mode.",
      riskCase: "Not verified in mock mode.",
      invalidationConditions: "Real invalidation requires a GenLayer contract.",
      expectedCheckpoints: ["Switch to real mode for checkpointing."],
      confidence: 50,
      status: "open",
      latestReview: "Mock mode.",
      finalOutcome: "",
      linkedIncidentId: "",
    },
  ];
}

function toAnalysisResult(raw: Record<string, unknown>, analysisId: string): AnalysisResult {
  return {
    analysisId,
    coinId: String(raw.coin_id ?? ""),
    symbol: String(raw.symbol ?? ""),
    signal: String(raw.signal ?? "watch") as Signal,
    sentimentScore: toNumber(raw.sentiment_score),
    riskLevel: String(raw.risk_level ?? "medium") as RiskLevel,
    confidence: toNumber(raw.confidence),
    breakingHeadline: String(raw.breaking_headline ?? ""),
    news: safeJsonArray<NewsItem>(raw.news_json, []),
    projectUpdates: safeJsonArray<ProjectUpdate>(raw.updates_json, []),
    bullishSignals: safeJsonArray<string>(raw.bullish_json, []),
    riskSignals: safeJsonArray<string>(raw.risks_json, []),
    smartMoney: String(raw.smart_money ?? ""),
    verdictSummary: String(raw.verdict_summary ?? ""),
    dataSources: safeJsonArray<string>(raw.sources_json, []),
    createdAt: String(raw.created_at_iso ?? ""),
    isAlert: Boolean(raw.is_alert),
    alertReason: String(raw.alert_reason ?? ""),
    thesisId: String(raw.thesis_id ?? ""),
    marketSnapshotJson: String(raw.market_snapshot_json ?? ""),
  };
}

function toProfile(raw: Record<string, unknown>): CoinProfile {
  return {
    coinId: String(raw.coin_id ?? ""),
    symbol: String(raw.symbol ?? ""),
    projectName: String(raw.project_name ?? ""),
    plainLanguageSummary: String(raw.plain_language_summary ?? ""),
    problemSolved: String(raw.problem_solved ?? ""),
    targetUsers: String(raw.target_users ?? ""),
    category: String(raw.category ?? ""),
    ecosystem: String(raw.ecosystem ?? ""),
    architecture: String(raw.architecture ?? ""),
    tokenUtility: String(raw.token_utility ?? ""),
    useCases: safeJsonArray<string>(raw.use_cases_json, []),
    tokenomics: String(raw.tokenomics ?? ""),
    supplyModel: String(raw.supply_model ?? ""),
    governance: String(raw.governance ?? ""),
    dependencies: safeJsonArray<string>(raw.dependencies_json, []),
    nonPriceRisks: safeJsonArray<string>(raw.non_price_risks_json, []),
    sources: safeJsonArray<string>(raw.sources_json, []),
    updatedAt: String(raw.updated_at_iso ?? ""),
  };
}

function toIncident(raw: Record<string, unknown>): MarketIncident {
  return {
    incidentId: String(raw.incident_id ?? ""),
    coinId: String(raw.coin_id ?? ""),
    symbol: String(raw.symbol ?? ""),
    title: String(raw.title ?? ""),
    summary: String(raw.summary ?? ""),
    status: String(raw.status ?? "detected") as MarketIncident["status"],
    severity: String(raw.severity ?? "watch") as MarketIncident["severity"],
    startedAt: String(raw.started_at_iso ?? ""),
    updatedAt: String(raw.updated_at_iso ?? ""),
    latestUpdate: String(raw.latest_update ?? ""),
    supportingEvidenceIds: splitPipe(raw.supporting_evidence_ids),
    conflictingEvidenceIds: splitPipe(raw.conflicting_evidence_ids),
    neutralEvidenceIds: splitPipe(raw.neutral_evidence_ids),
    linkedRunIds: splitPipe(raw.linked_run_ids),
    resolutionReason: String(raw.resolution_reason ?? ""),
    transitionReason: String(raw.transition_reason ?? ""),
  };
}

function toEvidence(raw: Record<string, unknown>): EvidenceRecord {
  return {
    evidenceId: String(raw.evidence_id ?? ""),
    incidentId: String(raw.incident_id ?? ""),
    sourceName: String(raw.source_name ?? ""),
    sourceUrl: String(raw.source_url ?? ""),
    evidenceType: String(raw.evidence_type ?? ""),
    claim: String(raw.claim ?? ""),
    marketSnapshot: safeJsonObject<MarketSnapshotInput | null>(raw.market_snapshot_json, null),
    fetched: Boolean(raw.fetched),
    stance: String(raw.stance ?? "neutral") as EvidenceRecord["stance"],
    observedAt: String(raw.observed_at_iso ?? ""),
    impact: String(raw.impact ?? ""),
  };
}

function toChallenge(raw: Record<string, unknown>): IncidentChallenge {
  return {
    challengeId: String(raw.challenge_id ?? ""),
    incidentId: String(raw.incident_id ?? ""),
    challenger: String(raw.challenger ?? ""),
    sourceUrl: String(raw.source_url ?? ""),
    counterClaim: String(raw.counter_claim ?? ""),
    result: String(raw.result ?? "rejected") as IncidentChallenge["result"],
    transitionReason: String(raw.transition_reason ?? ""),
    resultingStatus: String(raw.resulting_status ?? "investigating") as IncidentChallenge["resultingStatus"],
    resultingSeverity: String(raw.resulting_severity ?? "watch") as IncidentChallenge["resultingSeverity"],
    createdAt: String(raw.created_at_iso ?? ""),
  };
}

function toThesis(raw: Record<string, unknown>): SignalThesis {
  return {
    thesisId: String(raw.thesis_id ?? ""),
    coinId: String(raw.coin_id ?? ""),
    analysisId: String(raw.analysis_id ?? ""),
    signal: String(raw.signal ?? "watch") as Signal,
    referencePriceCents: toNumber(raw.reference_price_cents),
    referenceTimestamp: String(raw.reference_timestamp ?? ""),
    horizonHours: toNumber(raw.horizon_hours),
    thesis: String(raw.thesis ?? ""),
    bullishCase: String(raw.bullish_case ?? ""),
    riskCase: String(raw.risk_case ?? ""),
    invalidationConditions: String(raw.invalidation_conditions ?? ""),
    expectedCheckpoints: safeJsonArray<string>(raw.expected_checkpoints_json, []),
    confidence: toNumber(raw.confidence),
    status: String(raw.status ?? "open") as SignalThesis["status"],
    latestReview: String(raw.latest_review ?? ""),
    finalOutcome: String(raw.final_outcome ?? ""),
    linkedIncidentId: String(raw.linked_incident_id ?? ""),
  };
}

function toCheckpoint(raw: Record<string, unknown>): ThesisCheckpoint {
  return {
    checkpointId: String(raw.checkpoint_id ?? ""),
    thesisId: String(raw.thesis_id ?? ""),
    observedPriceCents: toNumber(raw.observed_price_cents),
    pctChangeBps: toNumber(raw.pct_change_bps),
    invalidationReached: Boolean(raw.invalidation_reached),
    evidenceSummary: String(raw.evidence_summary ?? ""),
    updatedStatus: String(raw.updated_status ?? "open") as ThesisCheckpoint["updatedStatus"],
    explanation: String(raw.explanation ?? ""),
    observedAt: String(raw.observed_at_iso ?? ""),
  };
}

async function getLatestAnalysisReal(coinId: string): Promise<AnalysisResult | null> {
  const address = getContractAddress();
  if (!address) return null;
  try {
    const raw = (await getReadClient().readContract({
      address,
      functionName: "get_latest_analysis",
      args: [coinId],
    })) as Record<string, unknown>;
    return toAnalysisResult(raw, `${coinId}_latest`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("no analysis")) return null;
    throw err;
  }
}

async function requestAnalysisReal(
  coinId: string,
  symbol: string,
  marketSnapshot: MarketSnapshotInput,
): Promise<AnalysisResult> {
  const address = getContractAddress();
  if (!address) throw new Error("Contract address not configured");
  const client = getWriteClient();
  const hash = await client.writeContract({
    address,
    functionName: "request_analysis",
    args: [coinId, symbol, JSON.stringify(marketSnapshot)],
    value: 0n,
  });
  await waitForSuccessfulWrite(client, hash);
  return poll(async () => {
    const stored = await getLatestAnalysisReal(coinId);
    if (!stored) throw new Error("latest analysis missing");
    return stored;
  }, "latest analysis");
}

export async function requestAnalysis(
  coinId: string,
  symbol: string,
  coinName: string,
  marketSnapshot: MarketSnapshotInput,
): Promise<AnalysisResult> {
  if (isRealContractEnabled()) return requestAnalysisReal(coinId, symbol, marketSnapshot);
  return requestAnalysisMock(coinId, symbol, coinName);
}

export async function getLatestAnalysis(coinId: string): Promise<AnalysisResult | null> {
  if (isRealContractEnabled()) return getLatestAnalysisReal(coinId);
  return getLatestAnalysisMock(coinId);
}

export async function getProfile(coinId: string, symbol: string, name?: string): Promise<CoinProfile | null> {
  if (!isRealContractEnabled()) return mockProfile(coinId, symbol, name);
  const address = getContractAddress();
  if (!address) return null;
  try {
    const raw = (await getReadClient().readContract({
      address,
      functionName: "get_profile",
      args: [coinId],
    })) as Record<string, unknown>;
    return toProfile(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("profile not found")) return null;
    throw err;
  }
}

export async function refreshProfile(
  coinId: string,
  symbol: string,
  sources: Array<{ url: string; name?: string }>,
): Promise<CoinProfile> {
  if (!isRealContractEnabled()) return mockProfile(coinId, symbol);
  const address = getContractAddress();
  if (!address) throw new Error("Contract address not configured");
  const client = getWriteClient();
  const hash = await client.writeContract({
    address,
    functionName: "refresh_profile",
    args: [coinId, symbol, JSON.stringify(sources)],
    value: 0n,
  });
  await waitForSuccessfulWrite(client, hash);
  return poll(async () => {
    const profile = await getProfile(coinId, symbol);
    if (!profile) throw new Error("profile missing");
    return profile;
  }, "coin profile");
}

export async function getIncidentsForCoin(coinId: string): Promise<MarketIncident[]> {
  if (!isRealContractEnabled()) {
    return mockIncidents().filter((incident) => incident.coinId === coinId);
  }
  const address = getContractAddress();
  if (!address) return [];
  const client = getReadClient();
  const ids = splitPipe(
    await client.readContract({
      address,
      functionName: "get_incident_ids",
      args: [coinId],
    }),
  );
  const incidents: MarketIncident[] = [];
  for (const id of ids) {
    const raw = (await client.readContract({
      address,
      functionName: "get_incident",
      args: [id],
    })) as Record<string, unknown>;
    incidents.push(toIncident(raw));
  }
  return incidents.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getEvidenceTimeline(incidentId: string): Promise<EvidenceRecord[]> {
  if (!isRealContractEnabled()) return mockEvidence(incidentId);
  const address = getContractAddress();
  if (!address) return [];
  const client = getReadClient();
  const ids = splitPipe(
    await client.readContract({
      address,
      functionName: "get_evidence_timeline",
      args: [incidentId],
    }),
  );
  const records: EvidenceRecord[] = [];
  for (const id of ids) {
    const raw = (await client.readContract({
      address,
      functionName: "get_evidence",
      args: [id],
    })) as Record<string, unknown>;
    records.push(toEvidence(raw));
  }
  return records;
}

export async function challengeIncident(
  incidentId: string,
  sourceUrl: string,
  counterClaim: string,
): Promise<IncidentChallenge> {
  if (!isRealContractEnabled()) {
    return {
      challengeId: `mock_challenge_${Date.now()}`,
      incidentId,
      challenger: "mock",
      sourceUrl,
      counterClaim,
      result: "rejected",
      transitionReason: "Mock mode does not adjudicate challenge evidence.",
      resultingStatus: "investigating",
      resultingSeverity: "watch",
      createdAt: new Date().toISOString(),
    };
  }
  const address = getContractAddress();
  if (!address) throw new Error("Contract address not configured");
  const client = getWriteClient();
  const before = splitPipe(
    await getReadClient().readContract({
      address,
      functionName: "get_challenge_ids",
      args: [incidentId],
    }),
  );
  const hash = await client.writeContract({
    address,
    functionName: "challenge_incident",
    args: [incidentId, sourceUrl, counterClaim],
    value: 0n,
  });
  await waitForSuccessfulWrite(client, hash);
  return poll(async () => {
    const ids = splitPipe(
      await getReadClient().readContract({
        address,
        functionName: "get_challenge_ids",
        args: [incidentId],
      }),
    );
    const newest = ids.find((id) => !before.includes(id)) ?? ids.at(-1);
    if (!newest) throw new Error("challenge id missing");
    const raw = (await getReadClient().readContract({
      address,
      functionName: "get_challenge",
      args: [newest],
    })) as Record<string, unknown>;
    return toChallenge(raw);
  }, "incident challenge");
}

export async function getThesesForCoin(coinId: string, symbol: string): Promise<SignalThesis[]> {
  if (!isRealContractEnabled()) return mockTheses(coinId, symbol);
  const address = getContractAddress();
  if (!address) return [];
  const client = getReadClient();
  const ids = splitPipe(
    await client.readContract({
      address,
      functionName: "get_thesis_ids",
      args: [coinId],
    }),
  );
  const theses: SignalThesis[] = [];
  for (const id of ids) {
    const raw = (await client.readContract({
      address,
      functionName: "get_thesis",
      args: [id],
    })) as Record<string, unknown>;
    theses.push(toThesis(raw));
  }
  return theses.reverse();
}

export async function getCheckpointsForThesis(thesisId: string): Promise<ThesisCheckpoint[]> {
  if (!isRealContractEnabled()) return [];
  const address = getContractAddress();
  if (!address) return [];
  const client = getReadClient();
  const ids = splitPipe(
    await client.readContract({
      address,
      functionName: "get_checkpoint_ids",
      args: [thesisId],
    }),
  );
  const checkpoints: ThesisCheckpoint[] = [];
  for (const id of ids) {
    const raw = (await client.readContract({
      address,
      functionName: "get_checkpoint",
      args: [id],
    })) as Record<string, unknown>;
    checkpoints.push(toCheckpoint(raw));
  }
  return checkpoints;
}

export async function getTrackRecord(coinId: string): Promise<Record<string, unknown>> {
  if (!isRealContractEnabled()) return { completed: 0, message: "Mock mode has no measured track record." };
  const address = getContractAddress();
  if (!address) return {};
  const raw = await getReadClient().readContract({
    address,
    functionName: "get_track_record",
    args: [coinId],
  });
  return safeJsonObject<Record<string, unknown>>(raw, {});
}

export async function fetchAlertsAll(): Promise<AlertSummary[]> {
  if (!isRealContractEnabled()) {
    return mockIncidents().map((incident) => incidentToAlert(incident, true));
  }
  const out: AlertSummary[] = [];
  for (const coin of CURATED_ALERT_COINS) {
    const incidents = await getIncidentsForCoin(coin.id);
    for (const incident of incidents) {
      if (incident.status !== "dismissed" && incident.status !== "resolved") {
        out.push(incidentToAlert(incident, false));
      }
    }
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function incidentToAlert(incident: MarketIncident, mock: boolean): AlertSummary {
  const impactBySeverity: Record<MarketIncident["severity"], AlertImpact> = {
    info: "low",
    watch: "medium",
    warning: "medium",
    critical: "high",
  };
  const kindBySeverity: Record<MarketIncident["severity"], AlertKind> = {
    info: "news",
    watch: "sentiment",
    warning: "volume",
    critical: "exchange",
  };
  return {
    alertId: incident.incidentId,
    analysisId: incident.incidentId,
    coinId: incident.coinId,
    symbol: incident.symbol.toLowerCase(),
    kind: kindBySeverity[incident.severity],
    emoji: mock ? "M" : "!",
    title: incident.title,
    summary: incident.summary,
    reason: incident.transitionReason || incident.latestUpdate,
    details: incident.latestUpdate || incident.summary,
    impact: impactBySeverity[incident.severity],
    source: mock ? "Mock mode" : "GenLayer incident state",
    tags: [incident.status, incident.severity],
    createdAt: incident.updatedAt || incident.startedAt,
  };
}
