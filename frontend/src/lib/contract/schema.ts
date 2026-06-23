// Shape of an AnalysisResult as the frontend consumes it. Mirrors the
// `CoinAnalysis` storage dataclass + the LLM JSON output in
// contracts/crypto_oracle.py. Snake_case wire fields are converted to
// camelCase here; nested news/updates/lists are decoded from *_json strings.

export type Signal = "buy" | "hold" | "sell" | "watch";
export type RiskLevel = "low" | "medium" | "high" | "extreme";
export type NewsSentiment = "positive" | "neutral" | "negative";
export type UpdateType =
  | "github"
  | "announcement"
  | "institutional"
  | "community";

export interface NewsItem {
  sentiment: NewsSentiment;
  title: string;
  impact: string;
}

export interface ProjectUpdate {
  type: UpdateType;
  content: string;
}

export type AlertKind =
  | "whale"
  | "volume"
  | "exchange"
  | "dev"
  | "sentiment"
  | "news";
export type AlertImpact = "low" | "medium" | "high";

export interface AlertSummary {
  alertId: string;
  analysisId: string;
  coinId: string;
  symbol: string;
  kind: AlertKind;
  emoji: string;
  title: string;
  summary: string;
  reason: string;
  details: string;
  impact: AlertImpact;
  source: string;
  tags: string[];
  createdAt: string;
}

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

export interface MarketSnapshotInput {
  id: string;
  symbol: string;
  price_usd_cents: number;
  change_24h_pct: number;
  volume_usd: number;
  market_cap_usd: number;
  high_24h_cents: number;
  low_24h_cents: number;
  snapshot_timestamp: string;
  source: string;
}

export interface CoinProfile {
  coinId: string;
  symbol: string;
  projectName: string;
  plainLanguageSummary: string;
  problemSolved: string;
  targetUsers: string;
  category: string;
  ecosystem: string;
  architecture: string;
  tokenUtility: string;
  useCases: string[];
  tokenomics: string;
  supplyModel: string;
  governance: string;
  dependencies: string[];
  nonPriceRisks: string[];
  sources: string[];
  updatedAt: string;
}

export type IncidentStatus =
  | "detected"
  | "investigating"
  | "confirmed"
  | "dismissed"
  | "resolved";
export type IncidentSeverity = "info" | "watch" | "warning" | "critical";
export type EvidenceStance = "supports" | "contradicts" | "neutral";

export interface MarketIncident {
  incidentId: string;
  coinId: string;
  symbol: string;
  title: string;
  summary: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: string;
  updatedAt: string;
  latestUpdate: string;
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  neutralEvidenceIds: string[];
  linkedRunIds: string[];
  resolutionReason: string;
  transitionReason: string;
}

export interface EvidenceRecord {
  evidenceId: string;
  incidentId: string;
  sourceName: string;
  sourceUrl: string;
  evidenceType: string;
  claim: string;
  marketSnapshot: MarketSnapshotInput | null;
  fetched: boolean;
  stance: EvidenceStance;
  observedAt: string;
  impact: string;
}

export interface IncidentChallenge {
  challengeId: string;
  incidentId: string;
  challenger: string;
  sourceUrl: string;
  counterClaim: string;
  result: "kept" | "downgraded" | "dismissed" | "resolved" | "rejected";
  transitionReason: string;
  resultingStatus: IncidentStatus;
  resultingSeverity: IncidentSeverity;
  createdAt: string;
}

export type ThesisStatus =
  | "open"
  | "intact"
  | "weakened"
  | "invalidated"
  | "completed";

export interface SignalThesis {
  thesisId: string;
  coinId: string;
  analysisId: string;
  signal: Signal;
  referencePriceCents: number;
  referenceTimestamp: string;
  horizonHours: number;
  thesis: string;
  bullishCase: string;
  riskCase: string;
  invalidationConditions: string;
  expectedCheckpoints: string[];
  confidence: number;
  status: ThesisStatus;
  latestReview: string;
  finalOutcome: string;
  linkedIncidentId: string;
}

export interface ThesisCheckpoint {
  checkpointId: string;
  thesisId: string;
  observedPriceCents: number;
  pctChangeBps: number;
  invalidationReached: boolean;
  evidenceSummary: string;
  updatedStatus: ThesisStatus;
  explanation: string;
  observedAt: string;
}
