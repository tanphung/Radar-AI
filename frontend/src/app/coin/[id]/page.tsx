"use client";

import { useParams } from "next/navigation";

import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { ChartBlock } from "@/components/coin/ChartBlock";
import { PriceHeader } from "@/components/coin/PriceHeader";
import { StatsGrid } from "@/components/coin/StatsGrid";
import { useCoinDetail } from "@/lib/data/coinDetail";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: coin, isLoading, error } = useCoinDetail(id);

  if (!id) {
    return (
      <div className="p-6 text-sm text-muted-foreground">No coin selected.</div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-red-400">
        Failed to load coin — {error.message}
      </div>
    );
  }
  if (isLoading || !coin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading {id}…
      </div>
    );
  }

  const positive = coin.change24hPct >= 0;
  return (
    <div>
      <PriceHeader coin={coin} />
      <ChartBlock id={coin.id} positive={positive} />
      <StatsGrid coin={coin} />
      <AnalysisSection
        coinId={coin.id}
        symbol={coin.symbol}
        coinName={coin.name}
      />
    </div>
  );
}
