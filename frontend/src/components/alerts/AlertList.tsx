"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlerts } from "@/lib/data/alerts";
import { useWatchlistStore } from "@/lib/store/watchlistStore";

import { AlertItem } from "./AlertItem";

type Tab = "watchlist" | "all";

export function AlertList() {
  const { data: alerts = [], isLoading, error } = useAlerts();
  const coinIds = useWatchlistStore((s) => s.coinIds);
  const watchlistLoaded = useWatchlistStore((s) => s.loaded);
  const [tab, setTab] = useState<Tab>("watchlist");

  const watchlistAlerts = useMemo(
    () => alerts.filter((a) => coinIds.has(a.coinId)),
    [alerts, coinIds],
  );

  if (error) {
    return (
      <div className="p-6 text-sm text-red-400">
        Failed to load alerts — {error.message}
      </div>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as Tab)}
      className="flex flex-col gap-4 px-4 py-4 md:px-6"
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
          <p className="text-sm text-muted-foreground">Loading watchlist…</p>
        ) : coinIds.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sign in and star coins from the dashboard to filter alerts by your
            watchlist.
          </p>
        ) : watchlistAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts on your watched coins right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {watchlistAlerts.map((alert) => (
              <li key={alert.alertId}>
                <AlertItem alert={alert} />
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="all" className="m-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts have been raised this cycle.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <li key={alert.alertId}>
                <AlertItem alert={alert} />
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
