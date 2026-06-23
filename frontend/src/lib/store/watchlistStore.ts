"use client";

import { create } from "zustand";

interface WatchlistState {
  coinIds: Set<string>;
  loaded: boolean;
  signedIn: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  load: () => Promise<void>;
  toggle: (coinId: string) => void;
  reset: () => void;
}

const SAVE_DEBOUNCE_MS = 500;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(
  coinIds: string[],
  set: (partial: Partial<WatchlistState>) => void,
) {
  if (saveTimer) clearTimeout(saveTimer);
  set({ saveStatus: "saving" });
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/watchlist", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coinIds }),
      });
      if (!res.ok) throw new Error("watchlist save failed");
      set({ saveStatus: "saved" });
    } catch {
      set({ saveStatus: "error" });
    }
  }, SAVE_DEBOUNCE_MS);
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  coinIds: new Set(),
  loaded: false,
  signedIn: false,
  saveStatus: "idle",
  load: async () => {
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      if (res.status === 401) {
        set({
          coinIds: new Set(),
          loaded: true,
          signedIn: false,
          saveStatus: "idle",
        });
        return;
      }
      if (!res.ok) {
        set({ loaded: true });
        return;
      }
      const data = (await res.json()) as { coinIds?: string[] };
      const next = new Set(Array.isArray(data.coinIds) ? data.coinIds : []);
      set({
        coinIds: next,
        loaded: true,
        signedIn: true,
        saveStatus: "idle",
      });
    } catch {
      set({ loaded: true });
    }
  },
  toggle: (coinId) => {
    if (!get().signedIn) return;
    const current = get().coinIds;
    const next = new Set(current);
    if (next.has(coinId)) next.delete(coinId);
    else next.add(coinId);
    set({ coinIds: next });
    scheduleSave(Array.from(next), set);
  },
  reset: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({
      coinIds: new Set(),
      loaded: false,
      signedIn: false,
      saveStatus: "idle",
    });
  },
}));

export function useIsStarred(coinId: string): boolean {
  return useWatchlistStore((s) => s.coinIds.has(coinId));
}
