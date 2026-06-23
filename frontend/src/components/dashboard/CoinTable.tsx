"use client";

import type { MarketCoin } from "@/lib/data/coingecko";
import { Skeleton } from "@/components/ui/skeleton";

import { CoinRow } from "./CoinRow";

interface Props {
  coins: MarketCoin[] | undefined;
  loading: boolean;
  error?: Error | null;
}

const HEADER_GRID =
  "hidden grid-cols-[28px_36px_minmax(0,1fr)_140px_96px_140px_104px] gap-3 border-b border-border bg-muted/40 px-6 py-2 text-xs uppercase tracking-wide text-muted-foreground md:grid";

export function CoinTable({ coins, loading, error }: Props) {
  if (error) {
    return (
      <div className="p-6 text-sm text-red-400">
        Failed to load market data — {error.message}. Retry in a minute.
      </div>
    );
  }
  if (loading && (!coins || coins.length === 0)) {
    return (
      <div>
        <div className={HEADER_GRID}>
          <span aria-hidden />
          <span>#</span>
          <span>Coin</span>
          <span className="text-right">Price</span>
          <span className="text-right">24h %</span>
          <span className="text-right">Market Cap</span>
          <span className="text-right">7d</span>
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="grid border-b border-border px-4 py-3 md:px-6"
          >
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    );
  }
  if (!coins || coins.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No coins match the current filter.
      </div>
    );
  }
  return (
    <div>
      <div className={HEADER_GRID}>
        <span aria-hidden />
        <span>#</span>
        <span>Coin</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h %</span>
        <span className="text-right">Market Cap</span>
        <span className="text-right">7d</span>
      </div>
      {coins.map((c) => (
        <CoinRow key={c.id} coin={c} />
      ))}
    </div>
  );
}
