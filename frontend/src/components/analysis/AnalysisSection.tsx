"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getLatestAnalysis,
  requestAnalysis,
} from "@/lib/contract/cryptoOracle";
import type { AnalysisResult } from "@/lib/contract/schema";

import { AnalysisCard } from "./AnalysisCard";

interface Props {
  coinId: string;
  symbol: string;
  coinName: string;
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

export function AnalysisSection({ coinId, symbol, coinName }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progressIndex, setProgressIndex] = useState<number>(0);

  // Load cached result on mount / coin change.
  useEffect(() => {
    const cached = getLatestAnalysis(coinId);
    if (cached) {
      setResult(cached);
      setStatus("ready");
    } else {
      setResult(null);
      setStatus("idle");
    }
    setErrorMessage("");
    setProgressIndex(0);
  }, [coinId]);

  // Rotate progress text while loading.
  useEffect(() => {
    if (status !== "loading") return;
    setProgressIndex(0);
    const id = setInterval(() => {
      setProgressIndex((i) =>
        i + 1 >= PROGRESS_STEPS.length ? PROGRESS_STEPS.length - 1 : i + 1,
      );
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  const run = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const fresh = await requestAnalysis(coinId, symbol, coinName);
      setResult(fresh);
      setStatus("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }, [coinId, symbol, coinName]);

  return (
    <section className="border-t border-border px-4 py-6 md:px-8">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">AI analysis</h2>
        <span className="text-xs text-muted-foreground">
          GenLayer consensus · mock until contract is deployed
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
