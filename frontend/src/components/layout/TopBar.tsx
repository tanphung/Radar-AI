"use client";

import { Bell, Search, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopBar() {
  // TODO(Phase 5): wire AlertBell badge count from contract alerts.
  // TODO(Phase 6): wire wallet connect (SIWE) + show truncated address.
  const noop = () => {};

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
      <Button
        variant="ghost"
        size="icon"
        aria-label="Alerts"
        onClick={noop}
      >
        <Bell className="size-4" />
      </Button>
      <Button
        variant="default"
        onClick={noop}
        className="gap-2"
      >
        <Wallet className="size-4" />
        Connect Wallet
      </Button>
    </header>
  );
}
