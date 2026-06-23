"use client";

import { createClient } from "genlayer-js";
import {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} from "genlayer-js/chains";

import { getInjectedProvider } from "@/lib/wallet/provider";

// Public env vars are baked into the bundle at build time. Read once.
const RAW_NETWORK = (
  process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "studionet"
).toLowerCase();
const RAW_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const RETIRED_ADDRESSES = new Set(
  (process.env.NEXT_PUBLIC_RETIRED_CONTRACT_ADDRESSES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const FORCE_MOCK = process.env.NEXT_PUBLIC_MOCK_CONTRACT === "1";
const ADDRESS_STORAGE_KEY = "cryptolens.contractAddress";

const CHAINS = {
  studionet,
  localnet,
  "testnet-bradbury": testnetBradbury,
  "testnet-asimov": testnetAsimov,
  testnetbradbury: testnetBradbury,
  testnetasimov: testnetAsimov,
} as const;

function resolveChain() {
  return CHAINS[RAW_NETWORK as keyof typeof CHAINS] ?? studionet;
}

function isValidAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function isRealContractEnabled(): boolean {
  return !FORCE_MOCK && isValidAddress(getInitialContractAddress() ?? "");
}

export function getContractAddress(): `0x${string}` | null {
  const address = getInitialContractAddress();
  return isValidAddress(address ?? "") ? (address as `0x${string}`) : null;
}

export function getInitialContractAddress(): string | null {
  if (!isValidAddress(RAW_ADDRESS)) return null;
  if (typeof window === "undefined") return RAW_ADDRESS;
  const saved = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
  if (
    !saved ||
    !isValidAddress(saved) ||
    RETIRED_ADDRESSES.has(saved.toLowerCase())
  ) {
    window.localStorage.setItem(ADDRESS_STORAGE_KEY, RAW_ADDRESS);
    return RAW_ADDRESS;
  }
  return saved;
}

/** Read-only client. Safe to call from server or browser. */
export function getReadClient() {
  return createClient({ chain: resolveChain() });
}

/**
 * Write-capable client. Requires a browser wallet provider. Resolves through
 * EIP-6963 discovery so OKX / Rabby / Coinbase work even when window.ethereum
 * is held by a different wallet. The caller must already have requested
 * accounts; Phase 6 TopBar handles that.
 */
export function getWriteClient() {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No wallet provider — connect a wallet from the top bar first",
    );
  }
  // genlayer-js EthereumProvider mirrors the EIP-1193 shape declared in
  // src/types/ethereum.d.ts; the cast keeps TS happy across the boundary.
  return createClient({
    chain: resolveChain(),
    provider: provider as unknown as Parameters<
      typeof createClient
    >[0] extends { provider?: infer P }
      ? P
      : never,
  });
}

export const networkLabel = RAW_NETWORK;
