"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string;
  athUsd: number;
  athDate: string;
  athChangePct: number;
  atlUsd: number;
  atlDate: string;
  atlChangePct: number;
  rank: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  fdvUsd: number | null;
  marketCapUsd: number;
  priceUsd: number;
  change24hPct: number;
  officialLinks: Array<{ name: string; url: string }>;
}

export type ChartRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

export interface ChartPoint {
  time: number; // unix seconds
  value: number;
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3/coins";

const FALLBACK_COIN_META: Record<string, { symbol: string; name: string }> = {
  bitcoin: { symbol: "btc", name: "Bitcoin" },
  ethereum: { symbol: "eth", name: "Ethereum" },
  solana: { symbol: "sol", name: "Solana" },
  binancecoin: { symbol: "bnb", name: "BNB" },
  ripple: { symbol: "xrp", name: "XRP" },
  cardano: { symbol: "ada", name: "Cardano" },
  dogecoin: { symbol: "doge", name: "Dogecoin" },
  "avalanche-2": { symbol: "avax", name: "Avalanche" },
  polkadot: { symbol: "dot", name: "Polkadot" },
  chainlink: { symbol: "link", name: "Chainlink" },
};

const RANGE_DAYS: Record<ChartRange, string> = {
  "1D": "1",
  "1W": "7",
  "1M": "30",
  "1Y": "365",
  ALL: "max",
};

function nameFromId(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildFallbackCoinDetail(id: string): CoinDetail {
  const meta = FALLBACK_COIN_META[id] ?? {
    symbol: id.slice(0, 6).toLowerCase() || "coin",
    name: nameFromId(id) || "Selected Coin",
  };

  return {
    id,
    symbol: meta.symbol,
    name: meta.name,
    image: "",
    athUsd: 0,
    athDate: "",
    athChangePct: 0,
    atlUsd: 0,
    atlDate: "",
    atlChangePct: 0,
    rank: 0,
    circulatingSupply: 0,
    totalSupply: null,
    maxSupply: null,
    fdvUsd: null,
    marketCapUsd: 0,
    priceUsd: 0,
    change24hPct: 0,
    officialLinks: [],
  };
}

async function fetchCoinDetail(id: string): Promise<CoinDetail> {
  const url = `${COINGECKO_BASE}/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return buildFallbackCoinDetail(id);
    const raw = await res.json();
    const m = raw.market_data ?? {};
    const officialLinks = [
      ...(raw.links?.homepage ?? [])
        .filter((url: string) => Boolean(url))
        .slice(0, 2)
        .map((url: string) => ({ name: "Homepage", url })),
      ...(raw.links?.repos_url?.github ?? [])
        .filter((url: string) => Boolean(url))
        .slice(0, 2)
        .map((url: string) => ({ name: "GitHub", url })),
    ];
    return {
      id: raw.id ?? id,
      symbol: String(raw.symbol ?? "").toLowerCase(),
      name: raw.name ?? nameFromId(id),
      image: raw.image?.large ?? raw.image?.small ?? raw.image?.thumb ?? "",
      athUsd: m.ath?.usd ?? 0,
      athDate: m.ath_date?.usd ?? "",
      athChangePct: m.ath_change_percentage?.usd ?? 0,
      atlUsd: m.atl?.usd ?? 0,
      atlDate: m.atl_date?.usd ?? "",
      atlChangePct: m.atl_change_percentage?.usd ?? 0,
      rank: m.market_cap_rank ?? 0,
      circulatingSupply: m.circulating_supply ?? 0,
      totalSupply: m.total_supply ?? null,
      maxSupply: m.max_supply ?? null,
      fdvUsd: m.fully_diluted_valuation?.usd ?? null,
      marketCapUsd: m.market_cap?.usd ?? 0,
      priceUsd: m.current_price?.usd ?? 0,
      change24hPct: m.price_change_percentage_24h ?? 0,
      officialLinks,
    };
  } catch {
    return buildFallbackCoinDetail(id);
  }
}

async function fetchMarketChart(
  id: string,
  range: ChartRange,
): Promise<ChartPoint[]> {
  const url = `${COINGECKO_BASE}/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${RANGE_DAYS[range]}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko chart failed: ${res.status}`);
  const data: { prices: [number, number][] } = await res.json();
  return data.prices.map(([ms, price]) => ({
    time: Math.floor(ms / 1000),
    value: price,
  }));
}

export function useCoinDetail(id: string): UseQueryResult<CoinDetail> {
  return useQuery({
    queryKey: ["coingecko", "detail", id],
    queryFn: () => fetchCoinDetail(id),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    enabled: id.length > 0,
  });
}

export function useMarketChart(
  id: string,
  range: ChartRange,
): UseQueryResult<ChartPoint[]> {
  return useQuery({
    queryKey: ["coingecko", "chart", id, range],
    queryFn: () => fetchMarketChart(id, range),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: id.length > 0,
  });
}
