import { Badge } from "@/components/ui/badge";
import type { AnalysisResult } from "@/lib/contract/schema";

interface Props {
  result: AnalysisResult;
}

const SIGNAL_LABEL: Record<AnalysisResult["signal"], string> = {
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  watch: "WATCH",
};

const SIGNAL_BG: Record<AnalysisResult["signal"], string> = {
  buy: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  hold: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  sell: "bg-red-500/15 text-red-300 border border-red-500/30",
  watch: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
};

const RISK_LABEL: Record<AnalysisResult["riskLevel"], string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  extreme: "Extreme risk",
};

const RISK_TONE: Record<AnalysisResult["riskLevel"], string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  extreme: "text-red-400",
};

export function AnalysisHeader({ result }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4 md:px-6">
      <span
        className={`rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide ${SIGNAL_BG[result.signal]}`}
      >
        {SIGNAL_LABEL[result.signal]}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Sentiment</span>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${result.sentimentScore}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums">
            {result.sentimentScore}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Confidence</span>
        <span className="text-sm font-medium tabular-nums">
          {result.confidence}%
        </span>
      </div>
      <Badge variant="outline" className={RISK_TONE[result.riskLevel]}>
        {RISK_LABEL[result.riskLevel]}
      </Badge>
      <span className="ml-auto text-xs text-muted-foreground">
        {new Date(result.createdAt).toLocaleString()}
      </span>
    </div>
  );
}
