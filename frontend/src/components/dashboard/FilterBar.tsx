"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

import { useDashboardFilters, type SortKey } from "./useDashboardFilters";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "market_cap_desc", label: "Market Cap" },
  { value: "price_desc", label: "Price" },
  { value: "change_desc", label: "24h % gainers" },
  { value: "change_asc", label: "24h % losers" },
  { value: "volume_desc", label: "Volume" },
];

export function FilterBar() {
  const { q, sort, setQ, setSort } = useDashboardFilters();

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-6">
      <div className="relative min-w-[200px] flex-1 max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search coin by name or symbol"
          aria-label="Search coins"
          className="pl-9"
        />
      </div>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortKey)}
        aria-label="Sort"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
