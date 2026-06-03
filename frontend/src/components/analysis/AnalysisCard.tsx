import type { AnalysisResult } from "@/lib/contract/schema";

import { AnalysisHeader } from "./AnalysisHeader";
import { BreakingBanner } from "./BreakingBanner";
import { NewsList } from "./NewsList";
import { ProjectUpdates } from "./ProjectUpdates";
import { SignalsGrid } from "./SignalsGrid";
import { SmartMoneyCard } from "./SmartMoneyCard";
import { VerdictBlock } from "./VerdictBlock";

interface Props {
  result: AnalysisResult;
  onReanalyze: () => void;
  reanalyzing: boolean;
}

export function AnalysisCard({ result, onReanalyze, reanalyzing }: Props) {
  return (
    <article className="rounded-lg border border-border bg-card">
      <AnalysisHeader result={result} />
      <BreakingBanner headline={result.breakingHeadline} />
      <NewsList items={result.news} />
      <ProjectUpdates items={result.projectUpdates} />
      <SignalsGrid bullish={result.bullishSignals} risks={result.riskSignals} />
      <SmartMoneyCard text={result.smartMoney} />
      <VerdictBlock
        summary={result.verdictSummary}
        sources={result.dataSources}
        onReanalyze={onReanalyze}
        reanalyzing={reanalyzing}
      />
    </article>
  );
}
