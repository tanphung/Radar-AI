import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AlertSummary } from "@/lib/contract/schema";
import { cn } from "@/lib/utils";

interface Props {
  alert: AlertSummary;
  compact?: boolean;
  selected?: boolean;
}

const IMPACT_CLASS = {
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  high: "border-red-500/30 bg-red-500/10 text-red-300",
} satisfies Record<AlertSummary["impact"], string>;

export function formatAlertTimeAgo(iso: string): string {
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

export function AlertItem({ alert, compact = false, selected = false }: Props) {
  const href = `/alerts?selected=${encodeURIComponent(alert.alertId)}`;
  const time = formatAlertTimeAgo(alert.createdAt);
  const summary = alert.summary || alert.reason;
  const tags = alert.tags.slice(0, compact ? 2 : 3);

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-md border border-border bg-card text-sm transition-colors hover:border-primary/40 hover:bg-muted/40",
        compact ? "px-3 py-2.5" : "px-4 py-3",
        selected && "border-primary/60 bg-primary/5",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-lg leading-none",
          compact && "size-8 text-base",
        )}
        aria-hidden
      >
        {alert.emoji}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-semibold uppercase">{alert.symbol}</span>
              {!compact && (
                <Badge
                  variant="outline"
                  className={cn("capitalize", IMPACT_CLASS[alert.impact])}
                >
                  {alert.impact}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate font-medium">{alert.title}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
        </div>
        <p
          className={cn(
            "text-sm leading-snug text-muted-foreground",
            compact && "line-clamp-2 text-foreground",
          )}
        >
          {summary}
        </p>
        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">
              {alert.source}
            </span>
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
