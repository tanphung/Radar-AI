"use client";

import { Suspense, useMemo } from "react";

import { CoinTable } from "@/components/dashboard/CoinTable";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters";
import { useBinanceTickerInit } from "@/lib/data/binanceWs";
import { useTop200, type MarketCoin } from "@/lib/data/coingecko";

function Dashboard() {
  const { data: coins, isLoading, error } = useTop200();
  useBinanceTickerInit(coins);
  const { q, sort } = useDashboardFilters();

  const visible = useMemo<MarketCoin[] | undefined>(() => {
    if (!coins) return undefined;
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? coins.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            c.symbol.toLowerCase().includes(needle),
        )
      : coins.slice();
    switch (sort) {
      case "price_desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "change_desc":
        filtered.sort((a, b) => b.change24h - a.change24h);
        break;
      case "change_asc":
        filtered.sort((a, b) => a.change24h - b.change24h);
        break;
      case "volume_desc":
        filtered.sort((a, b) => b.volume24h - a.volume24h);
        break;
      default:
        filtered.sort((a, b) => a.rank - b.rank);
    }
    return filtered;
  }, [coins, q, sort]);

  return (
    <>
      <FilterBar />
      <CoinTable
        coins={visible}
        loading={isLoading}
        error={error as Error | null}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}
