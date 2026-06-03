"use client";

import { useEffect, useRef, useState } from "react";

import type { MarketCoin } from "@/lib/data/coingecko";
import { formatCompactUsd, formatPct, formatPrice } from "@/lib/format";
import { useLivePrice } from "@/lib/store/priceStore";
import { cn } from "@/lib/utils";

import { Sparkline } from "./Sparkline";

interface Props {
  coin: MarketCoin;
}

const FLASH_DURATION_MS = 250;

export function CoinRow({ coin }: Props) {
  const live = useLivePrice(coin.id);
  const price = live ?? coin.price;
  const prev = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price === prev.current) return;
    setFlash(price > prev.current ? "up" : "down");
    prev.current = price;
    const t = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [price]);

  const positive = coin.change24h >= 0;

  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_120px_88px_120px_88px] items-center gap-3 border-b border-border px-4 py-3 text-sm md:grid-cols-[36px_minmax(0,1fr)_140px_96px_140px_104px] md:px-6">
      <span className="text-muted-foreground">{coin.rank}</span>
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coin.image}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          className="rounded-full"
        />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-medium">{coin.name}</span>
          <span className="text-xs uppercase text-muted-foreground">
            {coin.symbol}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "rounded px-2 py-0.5 text-right font-medium transition-colors",
          flash === "up" && "bg-emerald-500/15 text-emerald-300",
          flash === "down" && "bg-red-500/15 text-red-300",
        )}
      >
        {formatPrice(price)}
      </span>
      <span
        className={cn(
          "text-right font-medium",
          positive ? "text-emerald-400" : "text-red-400",
        )}
      >
        {formatPct(coin.change24h)}
      </span>
      <span className="text-right text-muted-foreground">
        {formatCompactUsd(coin.marketCap)}
      </span>
      <div className="flex justify-end">
        <Sparkline data={coin.sparkline7d} positive={positive} />
      </div>
    </div>
  );
}
