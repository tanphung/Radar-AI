import Link from "next/link";

import type { AlertSummary } from "@/lib/contract/schema";

interface Props {
  alert: AlertSummary;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffD = Math.floor(diffHr / 24);
  return `${diffD} d ago`;
}

export function AlertItem({ alert }: Props) {
  return (
    <Link
      href={`/coin/${alert.coinId}?analysis=${alert.analysisId}`}
      className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
    >
      <span className="text-xl leading-none" aria-hidden>
        {alert.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold uppercase">{alert.symbol}</span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(alert.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-sm leading-snug">{alert.reason}</p>
      </div>
    </Link>
  );
}
