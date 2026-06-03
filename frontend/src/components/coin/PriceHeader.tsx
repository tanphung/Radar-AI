"use client";

import type { CoinDetail } from "@/lib/data/coinDetail";
import { formatPct, formatPrice } from "@/lib/format";
import { useLivePrice } from "@/lib/store/priceStore";
import { cn } from "@/lib/utils";

interface Props {
  coin: CoinDetail;
}

export function PriceHeader({ coin }: Props) {
  const live = useLivePrice(coin.id);
  const price = live ?? coin.priceUsd;
  const positive = coin.change24hPct >= 0;

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-5 md:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coin.image}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="rounded-full"
      />
      <div className="flex min-w-0 flex-col leading-tight">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {coin.name}
        </h1>
        <span className="text-sm uppercase text-muted-foreground">
          {coin.symbol} · Rank #{coin.rank}
        </span>
      </div>
      <div className="ml-auto flex items-baseline gap-3">
        <span className="text-3xl font-semibold">{formatPrice(price)}</span>
        <span
          className={cn(
            "text-sm font-medium",
            positive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {formatPct(coin.change24hPct)} 24h
        </span>
      </div>
    </div>
  );
}
