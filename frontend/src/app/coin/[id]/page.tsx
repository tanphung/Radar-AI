"use client";

import { useParams } from "next/navigation";

import { AnalysisSection } from "@/components/analysis/AnalysisSection";
import { ChartBlock } from "@/components/coin/ChartBlock";
import { IncidentPanel } from "@/components/coin/IncidentPanel";
import { PriceHeader } from "@/components/coin/PriceHeader";
import { ProjectFundamentals } from "@/components/coin/ProjectFundamentals";
import { StatsGrid } from "@/components/coin/StatsGrid";
import { ThesisHistory } from "@/components/coin/ThesisHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MarketSnapshotInput } from "@/lib/contract/schema";
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
      <div className="p-6 text-sm text-muted-foreground">
        Market data is temporarily unavailable. Open the related alert from the
        news feed for the latest monitored context.
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
  const marketSnapshot: MarketSnapshotInput = {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    price_usd_cents: Math.max(0, Math.round(coin.priceUsd * 100)),
    change_24h_pct: coin.change24hPct,
    volume_usd: 0,
    market_cap_usd: Math.max(0, Math.round(coin.marketCapUsd)),
    high_24h_cents: 0,
    low_24h_cents: 0,
    snapshot_timestamp: new Date().toISOString(),
    source: "CoinGecko",
  };

  return (
    <div>
      <PriceHeader coin={coin} />
      <Tabs defaultValue="overview" className="w-full">
        <div className="border-b border-border px-4 py-3 md:px-8">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fundamentals">Project Fundamentals</TabsTrigger>
            <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="thesis">Thesis History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="m-0">
          <ChartBlock id={coin.id} positive={positive} />
          <StatsGrid coin={coin} />
          <ProjectFundamentals
            coinId={coin.id}
            symbol={coin.symbol}
            coinName={coin.name}
            sources={coin.officialLinks}
          />
        </TabsContent>

        <TabsContent value="fundamentals" className="m-0">
          <ProjectFundamentals
            coinId={coin.id}
            symbol={coin.symbol}
            coinName={coin.name}
            sources={coin.officialLinks}
          />
        </TabsContent>

        <TabsContent value="intelligence" className="m-0">
          <AnalysisSection
            coinId={coin.id}
            symbol={coin.symbol}
            coinName={coin.name}
            marketSnapshot={marketSnapshot}
          />
        </TabsContent>

        <TabsContent value="incidents" className="m-0">
          <IncidentPanel coinId={coin.id} />
        </TabsContent>

        <TabsContent value="thesis" className="m-0">
          <ThesisHistory coinId={coin.id} symbol={coin.symbol} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
