"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getLatestAnalysis,
  requestAnalysis,
} from "@/lib/contract/cryptoOracle";
import {
  isRealContractEnabled,
  networkLabel,
} from "@/lib/contract/client";
import type { AnalysisResult } from "@/lib/contract/schema";
import type { MarketSnapshotInput } from "@/lib/contract/schema";

import { AnalysisCard } from "./AnalysisCard";

interface Props {
  coinId: string;
  symbol: string;
  coinName: string;
  marketSnapshot: MarketSnapshotInput;
}

type Status = "idle" | "loading" | "ready" | "error";

const PROGRESS_STEPS = [
  "Connecting to GenLayer…",
  "Reading data sources…",
  "Analyzing on-chain activity…",
  "Validators reaching consensus…",
  "Synthesizing intelligence report…",
];

const STEP_INTERVAL_MS = 2_400;

export function AnalysisSection({ coinId, symbol, coinName, marketSnapshot }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progressIndex, setProgressIndex] = useState<number>(0);
  const modeLabel = isRealContractEnabled()
    ? `GenLayer consensus · ${networkLabel}`
    : "Demo analysis · local mock";

  // Load cached/on-chain latest result on mount / coin change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await getLatestAnalysis(coinId);
        if (cancelled) return;
        if (cached) {
          setResult(cached);
          setStatus("ready");
        } else {
          setResult(null);
          setStatus("idle");
        }
      } catch (err) {
        if (cancelled) return;
        setResult(null);
        setStatus("idle");
        setErrorMessage(
          err instanceof Error ? err.message : "Could not load latest analysis",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coinId]);

  // Rotate progress text while loading.
  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => {
      setProgressIndex((i) =>
        i + 1 >= PROGRESS_STEPS.length ? PROGRESS_STEPS.length - 1 : i + 1,
      );
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  const run = useCallback(async () => {
    setProgressIndex(0);
      setStatus("loading");
      setErrorMessage("");
    try {
      const fresh = await requestAnalysis(
        coinId,
        symbol,
        coinName,
        marketSnapshot,
      );
      setResult(fresh);
      setStatus("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }, [coinId, symbol, coinName, marketSnapshot]);

  return (
    <section className="border-t border-border px-4 py-6 md:px-8">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">AI analysis</h2>
        <span className="text-xs text-muted-foreground">
          {modeLabel}
        </span>
      </header>

      {status === "idle" && (
        <div className="rounded-md border border-dashed border-border bg-card p-6 text-center">
          <Sparkles
            className="mx-auto mb-3 size-6 text-blue-400"
            aria-hidden
          />
          <p className="mb-4 max-w-md text-pretty text-sm text-muted-foreground">
            Run a fresh intelligence report — news, on-chain flows, project
            updates, and a verdict adjudicated by multiple AI validators.
          </p>
          <Button onClick={run} className="gap-2">
            <Sparkles className="size-4" />
            Run AI Analysis
          </Button>
        </div>
      )}

      {status === "loading" && (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div
              className="size-3 animate-pulse rounded-full bg-blue-400"
              aria-hidden
            />
            <span className="text-sm font-medium">
              {PROGRESS_STEPS[progressIndex]}
            </span>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${((progressIndex + 1) / PROGRESS_STEPS.length) * 100}%`,
              }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Typical run takes 30–90 seconds across leader execution and
            validator consensus.
          </p>
        </div>
      )}

      {status === "ready" && result && (
        <AnalysisCard
          result={result}
          onReanalyze={run}
          reanalyzing={false}
        />
      )}

      {status === "error" && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to run analysis — {errorMessage}.
          <Button
            size="sm"
            variant="outline"
            className="ml-3"
            onClick={run}
          >
            Retry
          </Button>
        </div>
      )}
    </section>
  );
}
