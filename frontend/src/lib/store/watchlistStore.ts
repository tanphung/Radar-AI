"use client";

import { create } from "zustand";

interface WatchlistState {
  coinIds: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (coinId: string) => void;
  reset: () => void;
}

const SAVE_DEBOUNCE_MS = 500;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(coinIds: string[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch("/api/watchlist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coinIds }),
      });
    } catch {
      // Silent — next toggle will re-attempt with the latest set.
    }
  }, SAVE_DEBOUNCE_MS);
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  coinIds: new Set(),
  loaded: false,
  load: async () => {
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      if (res.status === 401) {
        set({ coinIds: new Set(), loaded: true });
        return;
      }
      if (!res.ok) {
        set({ loaded: true });
        return;
      }
      const data = (await res.json()) as { coinIds?: string[] };
      const next = new Set(Array.isArray(data.coinIds) ? data.coinIds : []);
      set({ coinIds: next, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  toggle: (coinId) => {
    const current = get().coinIds;
    const next = new Set(current);
    if (next.has(coinId)) next.delete(coinId);
    else next.add(coinId);
    set({ coinIds: next });
    scheduleSave(Array.from(next));
  },
  reset: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ coinIds: new Set(), loaded: false });
  },
}));

export function useIsStarred(coinId: string): boolean {
  return useWatchlistStore((s) => s.coinIds.has(coinId));
}
