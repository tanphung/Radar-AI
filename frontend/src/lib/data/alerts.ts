"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchAlertsAll } from "@/lib/contract/cryptoOracle";
import type { AlertSummary } from "@/lib/contract/schema";

export function useAlerts(): UseQueryResult<AlertSummary[]> {
  return useQuery({
    queryKey: ["alerts", "all"],
    // Real implementation (Phase 9): iterate cron-seeded coins and call
    // cryptoOracle.getAlerts(coinId) sequentially, parse the pipe-list, then
    // fetch each AnalysisResult. Mock returns the seeded set directly.
    queryFn: async () => fetchAlertsAll(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
