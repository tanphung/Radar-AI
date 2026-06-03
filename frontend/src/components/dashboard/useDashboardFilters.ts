"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type SortKey =
  | "market_cap_desc"
  | "price_desc"
  | "change_desc"
  | "change_asc"
  | "volume_desc";

const DEFAULT_SORT: SortKey = "market_cap_desc";
const SORT_VALUES: ReadonlySet<SortKey> = new Set([
  "market_cap_desc",
  "price_desc",
  "change_desc",
  "change_asc",
  "volume_desc",
]);

function parseSort(raw: string | null): SortKey {
  return raw && SORT_VALUES.has(raw as SortKey) ? (raw as SortKey) : DEFAULT_SORT;
}

export function useDashboardFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const sort = parseSort(params.get("sort"));

  const update = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const next = new URLSearchParams(params.toString());
      if (value === defaultValue) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [params, router],
  );

  return {
    q,
    sort,
    setQ: (value: string) => update("q", value, ""),
    setSort: (value: SortKey) => update("sort", value, DEFAULT_SORT),
  };
}
