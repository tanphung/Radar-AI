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

export interface AlertSummary {
  alertId: string;
  analysisId: string;
  coinId: string;
  symbol: string;
  kind: AlertKind;
  emoji: string;
  reason: string;
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
}
