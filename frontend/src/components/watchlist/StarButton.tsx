"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWatchlistStore } from "@/lib/store/watchlistStore";

interface Props {
  coinId: string;
}

export function StarButton({ coinId }: Props) {
  const starred = useWatchlistStore((s) => s.coinIds.has(coinId));
  const loaded = useWatchlistStore((s) => s.loaded);
  const signedIn = useWatchlistStore((s) => s.signedIn);
  const saveStatus = useWatchlistStore((s) => s.saveStatus);
  const toggle = useWatchlistStore((s) => s.toggle);
  const canToggle = loaded && signedIn;

  return (
    <button
      type="button"
      aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={starred}
      aria-disabled={!canToggle}
      title={
        !loaded
          ? "Loading watchlist"
          : signedIn
          ? starred
            ? "Remove from watchlist"
            : "Add to watchlist"
          : "Connect wallet to save watchlist"
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!canToggle) return;
        toggle(coinId);
      }}
      className={cn(
        "rounded p-1 transition-colors",
        !canToggle
          ? "cursor-not-allowed text-muted-foreground/35"
          : starred
          ? "text-amber-400 hover:text-amber-300"
          : "text-muted-foreground/60 hover:text-amber-400",
      )}
    >
      <Star
        className={cn(
          "size-4 transition-transform",
          starred && "scale-110 fill-current",
          saveStatus === "saving" && starred && "animate-pulse",
        )}
        aria-hidden
      />
    </button>
  );
}
