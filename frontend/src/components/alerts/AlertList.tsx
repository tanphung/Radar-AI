"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AlertSummary } from "@/lib/contract/schema";
import { useAlerts } from "@/lib/data/alerts";
import { useWatchlistStore } from "@/lib/store/watchlistStore";

import { AlertItem, formatAlertTimeAgo } from "./AlertItem";

type Tab = "watchlist" | "all";

const IMPACT_CLASS = {
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  high: "border-red-500/30 bg-red-500/10 text-red-300",
} satisfies Record<AlertSummary["impact"], string>;

function AlertDetailPanel({ alert }: { alert: AlertSummary }) {
  const tags = alert.tags.length > 0 ? alert.tags : [alert.kind];

  return (
    <section className="rounded-md border border-border bg-card px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-xl leading-none"
            aria-hidden
          >
            {alert.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {alert.symbol} market news
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {alert.title}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`capitalize ${IMPACT_CLASS[alert.impact]}`}
          >
            {alert.impact} impact
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatAlertTimeAgo(alert.createdAt)}
          </span>
        </div>
      </div>

      <p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">
        {alert.details || alert.summary || alert.reason}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Source: {alert.source}
        </span>
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[11px]">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/coin/${alert.coinId}`}>
            Open coin page
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/alerts">Clear selection</Link>
        </Button>
      </div>
    </section>
  );
}

interface AlertListProps {
  selectedId?: string | null;
}

export function AlertList({ selectedId = null }: AlertListProps) {
  const { data: alerts = [], isLoading, error } = useAlerts();
  const coinIds = useWatchlistStore((s) => s.coinIds);
  const watchlistLoaded = useWatchlistStore((s) => s.loaded);
  const signedIn = useWatchlistStore((s) => s.signedIn);
  const [tab, setTab] = useState<Tab>(() =>
    selectedId ? "all" : "watchlist",
  );

  const watchlistAlerts = useMemo(
    () => alerts.filter((a) => coinIds.has(a.coinId)),
    [alerts, coinIds],
  );
  const selectedAlert = useMemo(
    () => alerts.find((a) => a.alertId === selectedId) ?? null,
    [alerts, selectedId],
  );

  if (error) {
    return (
      <div className="p-6 text-sm text-red-400">
        Failed to load alerts - {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
      {selectedAlert && <AlertDetailPanel alert={selectedAlert} />}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="flex flex-col gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value="watchlist">
            My Watchlist{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({watchlistAlerts.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="all">
            All{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({alerts.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="m-0">
          {!watchlistLoaded ? (
            <p className="text-sm text-muted-foreground">Loading watchlist...</p>
          ) : !signedIn ? (
            <p className="text-sm text-muted-foreground">
              Connect your wallet and star coins from the dashboard to filter
              alerts by your watchlist.
            </p>
          ) : coinIds.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              Star coins from the dashboard to filter alerts by your watchlist.
            </p>
          ) : watchlistAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No alerts on your watched coins right now.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {watchlistAlerts.map((alert) => (
                <li key={alert.alertId}>
                  <AlertItem
                    alert={alert}
                    selected={alert.alertId === selectedId}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="all" className="m-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No alerts have been raised this cycle.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <li key={alert.alertId}>
                  <AlertItem
                    alert={alert}
                    selected={alert.alertId === selectedId}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
