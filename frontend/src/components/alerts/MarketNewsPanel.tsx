"use client";

import { Newspaper } from "lucide-react";
import Link from "next/link";

import { AlertItem } from "@/components/alerts/AlertItem";
import { useAlerts } from "@/lib/data/alerts";

const FEATURED_LIMIT = 4;

export function MarketNewsPanel() {
  const { data: alerts = [], isLoading, error } = useAlerts();
  const featured = alerts.slice(0, FEATURED_LIMIT);

  return (
    <section className="border-b border-border px-4 py-4 md:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Newspaper
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Market news</h2>
            <p className="text-xs text-muted-foreground">
              Latest monitored signals from this cycle.
            </p>
          </div>
        </div>
        <Link
          href="/alerts"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Failed to load market news - {error.message}
        </p>
      ) : isLoading ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-md border border-border bg-card"
            />
          ))}
        </div>
      ) : featured.length === 0 ? (
        <p className="rounded-md border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          No market news has been raised in the current monitoring cycle.
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {featured.map((alert) => (
            <li key={alert.alertId} className="min-w-0">
              <AlertItem alert={alert} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
