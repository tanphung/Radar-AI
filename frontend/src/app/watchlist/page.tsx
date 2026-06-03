"use client";

import { useMemo } from "react";

import { CoinTable } from "@/components/dashboard/CoinTable";
import { EmptyState } from "@/components/watchlist/EmptyState";
import { useBinanceTickerInit } from "@/lib/data/binanceWs";
import { useTop200 } from "@/lib/data/coingecko";
import { useWatchlistStore } from "@/lib/store/watchlistStore";

export default function Page() {
  const { data: coins, isLoading, error } = useTop200();
  useBinanceTickerInit(coins);
  const coinIds = useWatchlistStore((s) => s.coinIds);
  const loaded = useWatchlistStore((s) => s.loaded);

  const visible = useMemo(() => {
    if (!coins) return undefined;
    if (coinIds.size === 0) return [];
    return coins.filter((c) => coinIds.has(c.id));
  }, [coins, coinIds]);

  const showEmpty = loaded && coinIds.size === 0 && !isLoading;

  return (
    <div>
      <header className="border-b border-border px-4 py-4 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time prices for the coins you have starred.
        </p>
      </header>
      {showEmpty ? (
        <EmptyState signedIn={loaded} />
      ) : (
        <CoinTable
          coins={visible}
          loading={isLoading || !loaded}
          error={error as Error | null}
        />
      )}
    </div>
  );
}
