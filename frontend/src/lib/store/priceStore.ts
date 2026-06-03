"use client";

import { create } from "zustand";

interface PriceState {
  prices: Map<string, number>;
  setBulk: (entries: Iterable<readonly [string, number]>) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: new Map(),
  setBulk: (entries) =>
    set((state) => {
      const next = new Map(state.prices);
      let changed = false;
      for (const [id, price] of entries) {
        if (next.get(id) !== price) {
          next.set(id, price);
          changed = true;
        }
      }
      return changed ? { prices: next } : state;
    }),
}));

export function useLivePrice(coinId: string): number | undefined {
  return usePriceStore((s) => s.prices.get(coinId));
}
