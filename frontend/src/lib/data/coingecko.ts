"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  sparkline7d: number[];
  rank: number;
}

interface RawMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  market_cap_rank: number | null;
  sparkline_in_7d?: { price?: number[] };
}

const ENDPOINT = "https://api.coingecko.com/api/v3/coins/markets";

async function fetchTop200(): Promise<MarketCoin[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "200");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h");

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko request failed: ${res.status}`);
  }
  const raw: RawMarketCoin[] = await res.json();
  return raw.map((c) => ({
    id: c.id,
    symbol: c.symbol.toLowerCase(),
    name: c.name,
    image: c.image,
    price: c.current_price ?? 0,
    marketCap: c.market_cap ?? 0,
    volume24h: c.total_volume ?? 0,
    change24h: c.price_change_percentage_24h ?? 0,
    sparkline7d: c.sparkline_in_7d?.price ?? [],
    rank: c.market_cap_rank ?? 9999,
  }));
}

export function useTop200(): UseQueryResult<MarketCoin[]> {
  return useQuery({
    queryKey: ["coingecko", "top200"],
    queryFn: fetchTop200,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}
