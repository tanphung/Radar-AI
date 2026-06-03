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
  const toggle = useWatchlistStore((s) => s.toggle);

  return (
    <button
      type="button"
      aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={starred}
      title={
        loaded
          ? starred
            ? "Remove from watchlist"
            : "Add to watchlist"
          : "Sign in to save your watchlist"
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(coinId);
      }}
      className={cn(
        "rounded p-1 transition-colors",
        starred
          ? "text-amber-400 hover:text-amber-300"
          : "text-muted-foreground/60 hover:text-amber-400",
      )}
    >
      <Star
        className={cn(
          "size-4 transition-transform",
          starred && "scale-110 fill-current",
        )}
        aria-hidden
      />
    </button>
  );
}
