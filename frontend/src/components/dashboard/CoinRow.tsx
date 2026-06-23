"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { MarketCoin } from "@/lib/data/coingecko";
import { formatCompactUsd, formatPct, formatPrice } from "@/lib/format";
import { useLivePrice } from "@/lib/store/priceStore";
import { cn } from "@/lib/utils";

import { StarButton } from "@/components/watchlist/StarButton";

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
    <Link
      href={`/coin/${coin.id}`}
      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3 text-sm transition-colors hover:bg-muted/40 md:grid-cols-[28px_36px_minmax(0,1fr)_140px_96px_140px_104px] md:gap-3 md:px-6">
      <StarButton coinId={coin.id} />
      <span className="hidden text-muted-foreground md:block">{coin.rank}</span>
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
            {coin.symbol} <span className="md:hidden">· #{coin.rank}</span>
          </span>
        </div>
      </div>
      <span
        className={cn(
          "rounded px-2 py-0.5 text-right font-medium transition-colors md:justify-self-end",
          flash === "up" && "bg-emerald-500/15 text-emerald-300",
          flash === "down" && "bg-red-500/15 text-red-300",
        )}
      >
        {formatPrice(price)}
      </span>
      <span
        className={cn(
          "col-start-3 text-right text-xs font-medium md:col-auto md:text-sm",
          positive ? "text-emerald-400" : "text-red-400",
        )}
      >
        {formatPct(coin.change24h)}
      </span>
      <span className="col-span-2 col-start-2 text-xs text-muted-foreground md:col-auto md:text-right md:text-sm">
        <span className="md:hidden">MCap </span>
        {formatCompactUsd(coin.marketCap)}
      </span>
      <div className="hidden justify-end md:flex">
        <Sparkline data={coin.sparkline7d} positive={positive} />
      </div>
    </Link>
  );
}
