"use client";

import { LogOut, Search, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AlertBell } from "@/components/alerts/AlertBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSiweMessage } from "@/lib/auth/siwe";
import { useWatchlistStore } from "@/lib/store/watchlistStore";
import {
  getInjectedProvider,
  isWalletInstalled,
  subscribeToWalletDiscovery,
} from "@/lib/wallet/provider";

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function TopBar() {
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [walletReady, setWalletReady] = useState(false);

  const loadWatchlist = useWatchlistStore((s) => s.load);
  const resetWatchlist = useWatchlistStore((s) => s.reset);

  // Some wallets (OKX, Rabby) inject after first paint via EIP-6963. Listen
  // until at least one wallet is announced so the button does not appear
  // disabled forever in those cases.
  useEffect(() => {
    setWalletReady(isWalletInstalled());
    const unsubscribe = subscribeToWalletDiscovery(() => setWalletReady(true));
    return unsubscribe;
  }, []);

  // On mount: check existing session and prime the watchlist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { address: string | null };
        if (!cancelled && data.address) {
          setAddress(data.address);
          await loadWatchlist();
        } else if (!cancelled) {
          await loadWatchlist();
        }
      } catch {
        // Silent — wallet flow remains available below.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWatchlist]);

  const connect = useCallback(async () => {
    setError("");
    const provider = getInjectedProvider();
    if (!provider) {
      setError(
        "No wallet detected. Install MetaMask, OKX, Rabby, or Coinbase Wallet.",
      );
      return;
    }
    setBusy(true);
    try {
      const accounts = await provider.request<string[]>({
        method: "eth_requestAccounts",
      });
      const account = accounts?.[0];
      if (!account) throw new Error("Wallet did not return an account");

      const nonceRes = await fetch("/api/siwe/nonce", { cache: "no-store" });
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = buildSiweMessage({
        address: account,
        domain: window.location.host,
        origin: window.location.origin,
        nonce,
      });

      const signature = await provider.request<string>({
        method: "personal_sign",
        params: [message, account],
      });

      const verifyRes = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) {
        const detail = (await verifyRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(detail.error ?? "Sign-in failed");
      }
      const { address: verifiedAddress } = (await verifyRes.json()) as {
        address: string;
      };
      setAddress(verifiedAddress);
      await loadWatchlist();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not sign in with wallet";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [loadWatchlist]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/siwe/logout", { method: "POST" });
    } catch {
      // Cookie may already be expired — proceed with local clear.
    }
    resetWatchlist();
    setAddress(null);
    setBusy(false);
  }, [resetWatchlist]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="relative flex-1 max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search coin by name or symbol"
          aria-label="Search coin"
          className="pl-9"
        />
      </div>
      <AlertBell />
      {address ? (
        <Button
          variant="outline"
          onClick={disconnect}
          disabled={busy}
          className="gap-2 font-mono"
          title="Disconnect"
        >
          <LogOut className="size-4" />
          {truncate(address)}
        </Button>
      ) : (
        <Button
          onClick={connect}
          disabled={busy}
          className="gap-2"
          title={
            error ||
            (!walletReady
              ? "No wallet detected — install MetaMask, OKX, Rabby, or Coinbase"
              : "Sign in with your wallet")
          }
        >
          <Wallet className="size-4" />
          {busy ? "Signing…" : "Connect Wallet"}
        </Button>
      )}
      {error && (
        <div className="absolute right-4 top-14 z-40 max-w-xs rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 shadow-lg">
          {error}
        </div>
      )}
    </header>
  );
}
