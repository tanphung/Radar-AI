"use client";

import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  challengeIncident,
  getEvidenceTimeline,
  getIncidentsForCoin,
} from "@/lib/contract/cryptoOracle";
import { isRealContractEnabled } from "@/lib/contract/client";
import type { EvidenceRecord, MarketIncident } from "@/lib/contract/schema";

interface Props {
  coinId: string;
}

const severityClass: Record<MarketIncident["severity"], string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  watch: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  warning: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-300",
};

function EvidenceTimeline({ incidentId }: { incidentId: string }) {
  const { data = [], isLoading } = useQuery<EvidenceRecord[]>({
    queryKey: ["contract", "evidence", incidentId],
    queryFn: () => getEvidenceTimeline(incidentId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading evidence...</p>;
  }
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No external evidence was fetched successfully for this incident.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-3">
      {data.map((evidence) => (
        <li key={evidence.evidenceId} className="border-l border-border pl-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {evidence.stance}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {evidence.observedAt || "time unavailable"}
            </span>
          </div>
          <p className="mt-1 text-sm">{evidence.claim}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Source: {evidence.sourceName || "Source unavailable"}{" "}
            {evidence.fetched ? "(fetched)" : "(not fetched)"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{evidence.impact}</p>
        </li>
      ))}
    </ol>
  );
}

function ChallengeForm({
  incident,
  onDone,
}: {
  incident: MarketIncident;
  onDone: () => void;
}) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [counterClaim, setCounterClaim] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const challengeable =
    incident.status === "investigating" || incident.status === "confirmed";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const result = await challengeIncident(
        incident.incidentId,
        sourceUrl,
        counterClaim,
      );
      setStatus("done");
      setMessage(result.transitionReason);
      await onDone();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  if (!challengeable) {
    return (
      <p className="text-sm text-muted-foreground">
        Challenges are available only while an incident is investigating or
        confirmed.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        placeholder="https://example.com/counter-evidence"
      />
      <Input
        value={counterClaim}
        onChange={(event) => setCounterClaim(event.target.value)}
        placeholder="Short counter-claim"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={status === "submitting" || sourceUrl.length === 0}
          className="gap-2"
        >
          <ShieldCheck className="size-4" />
          Submit challenge
        </Button>
        {message && (
          <span
            className={
              status === "error"
                ? "text-sm text-red-300"
                : "text-sm text-muted-foreground"
            }
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}

export function IncidentPanel({ coinId }: Props) {
  const realMode = isRealContractEnabled();
  const { data = [], isLoading, error, refetch } = useQuery<MarketIncident[]>({
    queryKey: ["contract", "incidents", coinId],
    queryFn: () => getIncidentsForCoin(coinId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="border-t border-border px-4 py-6 md:px-8">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Incidents</h2>
        <p className="text-sm text-muted-foreground">
          {realMode
            ? "Persistent GenLayer incident lifecycle and evidence timeline."
            : "Mock incident view for local UI development."}
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Failed to load incidents - {error.message}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading incidents...</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No incident has been recorded for this coin.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {data.map((incident) => (
            <article
              key={incident.incidentId}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{incident.title}</h3>
                  <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
                    {incident.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {incident.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`capitalize ${severityClass[incident.severity]}`}
                  >
                    {incident.severity}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-sm">{incident.latestUpdate}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Linked runs:{" "}
                {incident.linkedRunIds.length > 0
                  ? incident.linkedRunIds.join(", ")
                  : "None"}
              </p>
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold">Evidence timeline</h4>
                <EvidenceTimeline incidentId={incident.incidentId} />
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="mb-2 text-sm font-semibold">Challenge evidence</h4>
                <ChallengeForm incident={incident} onDone={() => refetch()} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
