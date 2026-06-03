import type { CoinDetail } from "@/lib/data/coinDetail";
import { formatCompactUsd, formatPrice } from "@/lib/format";

interface Props {
  coin: CoinDetail;
}

function formatSupply(value: number | null, symbol: string): string {
  if (value === null || value === 0) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B ${symbol}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M ${symbol}`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K ${symbol}`;
  return `${value.toFixed(0)} ${symbol}`;
}

export function StatsGrid({ coin }: Props) {
  const sym = coin.symbol.toUpperCase();
  const items = [
    { label: "Market Cap", value: formatCompactUsd(coin.marketCapUsd) },
    {
      label: "FDV",
      value: coin.fdvUsd ? formatCompactUsd(coin.fdvUsd) : "—",
    },
    {
      label: "Circulating",
      value: formatSupply(coin.circulatingSupply, sym),
    },
    {
      label: "Max Supply",
      value: coin.maxSupply ? formatSupply(coin.maxSupply, sym) : "∞",
    },
    { label: "All-Time High", value: formatPrice(coin.athUsd) },
    { label: "All-Time Low", value: formatPrice(coin.atlUsd) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 border-t border-border px-4 py-4 md:grid-cols-3 md:px-8 lg:grid-cols-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex flex-col gap-1 rounded-md border border-border bg-card p-3"
        >
          <span className="text-xs text-muted-foreground">{it.label}</span>
          <span className="text-sm font-medium">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
