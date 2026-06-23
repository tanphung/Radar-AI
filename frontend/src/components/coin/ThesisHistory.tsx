"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  getCheckpointsForThesis,
  getThesesForCoin,
  getTrackRecord,
} from "@/lib/contract/cryptoOracle";
import { isRealContractEnabled } from "@/lib/contract/client";
import { formatPct, formatPrice } from "@/lib/format";
import type { SignalThesis, ThesisCheckpoint } from "@/lib/contract/schema";

interface Props {
  coinId: string;
  symbol: string;
}

function Checkpoints({ thesisId }: { thesisId: string }) {
  const { data = [], isLoading } = useQuery<ThesisCheckpoint[]>({
    queryKey: ["contract", "checkpoints", thesisId],
    queryFn: () => getCheckpointsForThesis(thesisId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading checkpoints...</p>;
  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No checkpoints recorded yet.</p>;
  }
  return (
    <ol className="mt-2 flex flex-col gap-2">
      {data.map((checkpoint) => (
        <li key={checkpoint.checkpointId} className="border-l border-border pl-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {checkpoint.updatedStatus}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatPrice(checkpoint.observedPriceCents / 100)} ·{" "}
              {formatPct(checkpoint.pctChangeBps / 100)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {checkpoint.explanation}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ThesisCard({ thesis }: { thesis: SignalThesis }) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {thesis.signal}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {thesis.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Confidence {thesis.confidence}/100
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold">{thesis.thesis}</h3>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{formatPrice(thesis.referencePriceCents / 100)}</div>
          <div>{thesis.horizonHours}h horizon</div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">Bullish case:</span>{" "}
          {thesis.bullishCase}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">Risk case:</span> {thesis.riskCase}
        </p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="text-foreground">Invalidation:</span>{" "}
        {thesis.invalidationConditions}
      </p>
      {thesis.finalOutcome && (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground">Final outcome:</span>{" "}
          {thesis.finalOutcome}
        </p>
      )}
      <div className="mt-4">
        <h4 className="text-sm font-semibold">Checkpoint timeline</h4>
        <Checkpoints thesisId={thesis.thesisId} />
      </div>
    </article>
  );
}

export function ThesisHistory({ coinId, symbol }: Props) {
  const realMode = isRealContractEnabled();
  const { data = [], isLoading, error } = useQuery<SignalThesis[]>({
    queryKey: ["contract", "theses", coinId],
    queryFn: () => getThesesForCoin(coinId, symbol),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const { data: record = {} } = useQuery<Record<string, unknown>>({
    queryKey: ["contract", "track-record", coinId],
    queryFn: () => getTrackRecord(coinId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="border-t border-border px-4 py-6 md:px-8">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Thesis history</h2>
        <p className="text-sm text-muted-foreground">
          {realMode
            ? "Persistent 24-hour GenLayer thesis tracker."
            : "Mock thesis history for local UI development."}
        </p>
      </header>

      <div className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
        {String(record.message ?? "") ||
          `Completed: ${String(record.completed ?? 0)} · Invalidated: ${String(
            record.invalidated ?? 0,
          )}`}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Failed to load theses - {error.message}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading theses...</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No thesis has been created for this coin yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((thesis) => (
            <ThesisCard key={thesis.thesisId} thesis={thesis} />
          ))}
        </div>
      )}
    </section>
  );
}
