"use client";

// Multi-wallet discovery via EIP-6963.
//
// Modern wallets (MetaMask, OKX, Rabby, Coinbase, Brave, etc.) announce
// themselves through `eip6963:announceProvider` events instead of (or in
// addition to) injecting window.ethereum. Browsers that have multiple wallets
// installed will pick ONE for window.ethereum — usually the last-set default —
// which is why an OKX-only user clicking a window.ethereum button sees nothing
// happen.
//
// We:
//   1. Dispatch eip6963:requestProvider once at module load to wake any
//      already-injected wallets.
//   2. Subscribe to eip6963:announceProvider for the rest of the session.
//   3. Expose getInjectedProvider() which returns the first usable provider
//      (window.ethereum first, then EIP-6963).
//
// Reference pattern matches the working game-mochi dApp.

interface EthereumProvider {
  request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(
    event: string,
    handler: (...args: unknown[]) => void,
  ): void;
}

export interface DiscoveredWallet {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  provider: EthereumProvider;
}

interface EIP6963AnnounceEvent extends Event {
  detail?: {
    info?: { uuid: string; name: string; icon: string; rdns: string };
    provider?: EthereumProvider;
  };
}

const discovered: DiscoveredWallet[] = [];

function record(detail: EIP6963AnnounceEvent["detail"]) {
  if (!detail?.info?.uuid || !detail.provider) return;
  if (discovered.some((w) => w.uuid === detail.info!.uuid)) return;
  discovered.push({
    uuid: detail.info.uuid,
    name: detail.info.name,
    icon: detail.info.icon,
    rdns: detail.info.rdns,
    provider: detail.provider,
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", ((
    event: EIP6963AnnounceEvent,
  ) => {
    record(event.detail);
  }) as EventListener);
  // Ask any already-injected wallets to announce themselves.
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/** Subscribe to wallet discovery. Returns an unsubscribe function. */
export function subscribeToWalletDiscovery(
  callback: (wallets: DiscoveredWallet[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = ((event: EIP6963AnnounceEvent) => {
    const before = discovered.length;
    record(event.detail);
    if (discovered.length !== before) callback([...discovered]);
  }) as EventListener;
  window.addEventListener("eip6963:announceProvider", handler);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Fire once for already-known wallets.
  if (discovered.length > 0) callback([...discovered]);
  return () => window.removeEventListener("eip6963:announceProvider", handler);
}

/** Snapshot of currently discovered EIP-6963 wallets. */
export function getDiscoveredWallets(): DiscoveredWallet[] {
  return [...discovered];
}

/** Any EIP-1193 wallet available? */
export function isWalletInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum) || discovered.length > 0;
}

/**
 * Active provider. Order of preference:
 *   1. window.ethereum (the user-selected default browser wallet)
 *   2. First EIP-6963 announced wallet (covers OKX-only, Rabby-only, etc.)
 */
export function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  if (window.ethereum) return window.ethereum as EthereumProvider;
  if (discovered.length > 0) return discovered[0].provider;
  return null;
}
