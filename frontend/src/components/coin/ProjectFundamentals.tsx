"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { getProfile, refreshProfile } from "@/lib/contract/cryptoOracle";
import { isRealContractEnabled } from "@/lib/contract/client";
import type { CoinProfile } from "@/lib/contract/schema";

interface Props {
  coinId: string;
  symbol: string;
  coinName: string;
  sources: Array<{ name: string; url: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value || "Unknown"}</dd>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
        {(items.length > 0 ? items : ["Unknown"]).map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectFundamentals({
  coinId,
  symbol,
  coinName,
  sources,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const realMode = isRealContractEnabled();
  const { data, isLoading, error, refetch } = useQuery<CoinProfile | null>({
    queryKey: ["contract", "profile", coinId, symbol],
    queryFn: () => getProfile(coinId, symbol, coinName),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  async function runRefresh() {
    setRefreshing(true);
    try {
      await refreshProfile(coinId, symbol, sources);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const profile = data;

  return (
    <section className="border-t border-border px-4 py-6 md:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Project fundamentals</h2>
          <p className="text-sm text-muted-foreground">
            {realMode
              ? "Stored Coin Intelligence Profile from GenLayer state."
              : "Mock profile for local UI development."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Refresh profile
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Failed to load profile - {error.message}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      ) : !profile ? (
        <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          No stored profile yet. Refresh the profile to ask GenLayer to verify
          project fundamentals from bounded sources.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="text-base font-semibold">
              About {profile.projectName || coinName}
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              {profile.plainLanguageSummary || "Not verified"}
            </p>
          </div>

          <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Fact label="Problem" value={profile.problemSolved} />
            <Fact label="Users" value={profile.targetUsers} />
            <Fact label="Category" value={profile.category} />
            <Fact label="Ecosystem" value={profile.ecosystem} />
            <Fact label="Architecture" value={profile.architecture} />
            <Fact label="Token utility" value={profile.tokenUtility} />
            <Fact label="Tokenomics" value={profile.tokenomics} />
            <Fact label="Supply model" value={profile.supplyModel} />
            <Fact label="Governance" value={profile.governance} />
          </dl>

          <div className="grid gap-5 md:grid-cols-3">
            <ListBlock title="Use cases" items={profile.useCases} />
            <ListBlock title="Dependencies" items={profile.dependencies} />
            <ListBlock title="Non-price risks" items={profile.nonPriceRisks} />
          </div>

          <div>
            <h3 className="text-sm font-semibold">Fetched sources</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
              {(profile.sources.length > 0 ? profile.sources : ["Source unavailable"]).map(
                (source) => (
                  <li key={source} className="break-all">
                    {source}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
