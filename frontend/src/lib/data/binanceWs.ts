"use client";

import { useEffect } from "react";

import type { MarketCoin } from "@/lib/data/coingecko";
import { usePriceStore } from "@/lib/store/priceStore";

interface MiniTicker {
  s: string;
  c: string;
}

const STREAM_URL = "wss://stream.binance.com:9443/ws/!miniTicker@arr";
const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = INITIAL_BACKOFF_MS;
let symbolToCoinId: Map<string, string> = new Map();

function handleMessage(ev: MessageEvent<string>) {
  if (symbolToCoinId.size === 0) return;
  let payload: unknown;
  try {
    payload = JSON.parse(ev.data);
  } catch {
    return;
  }
  if (!Array.isArray(payload)) return;
  const updates: [string, number][] = [];
  for (const item of payload as MiniTicker[]) {
    const sym = item?.s;
    if (typeof sym !== "string" || !sym.endsWith("USDT")) continue;
    const base = sym.slice(0, -4).toLowerCase();
    const coinId = symbolToCoinId.get(base);
    if (!coinId) continue;
    const price = Number(item.c);
    if (!Number.isFinite(price)) continue;
    updates.push([coinId, price]);
  }
  if (updates.length > 0) {
    usePriceStore.getState().setBulk(updates);
  }
}

function scheduleReconnect() {
  socket = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    connect();
  }, backoffMs);
}

function connect() {
  if (typeof window === "undefined") return;
  if (
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  ) {
    return;
  }
  const ws = new WebSocket(STREAM_URL);
  socket = ws;
  ws.addEventListener("open", () => {
    backoffMs = INITIAL_BACKOFF_MS;
  });
  ws.addEventListener("message", handleMessage);
  ws.addEventListener("close", scheduleReconnect);
  ws.addEventListener("error", () => {
    ws.close();
  });
}

export function useBinanceTickerInit(coins: MarketCoin[] | undefined): void {
  useEffect(() => {
    if (!coins || coins.length === 0) return;
    // CoinGecko returns markets in market-cap-desc order. For symbols owned by
    // multiple coins, keep the highest mcap (first occurrence) match.
    const map = new Map<string, string>();
    for (const c of coins) {
      if (!map.has(c.symbol)) map.set(c.symbol, c.id);
    }
    symbolToCoinId = map;
    connect();
  }, [coins]);
}
