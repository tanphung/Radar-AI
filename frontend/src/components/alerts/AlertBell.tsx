"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAlerts } from "@/lib/data/alerts";

import { AlertItem } from "./AlertItem";

const STORAGE_KEY = "cryptolens:lastSeenAlerts";
const DROPDOWN_LIMIT = 5;

function readLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AlertBell() {
  const { data: alerts = [] } = useAlerts();
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Initial localStorage sync on mount.
  useEffect(() => {
    setLastSeen(readLastSeen());
  }, []);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = wrapperRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const unseen = useMemo(
    () =>
      alerts.filter((a) => new Date(a.createdAt).getTime() > lastSeen).length,
    [alerts, lastSeen],
  );
  const recent = alerts.slice(0, DROPDOWN_LIMIT);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const now = Date.now();
        setLastSeen(now);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, String(now));
        }
      }
      return next;
    });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Alerts${unseen ? ` (${unseen} new)` : ""}`}
        aria-expanded={open}
        onClick={handleToggle}
        className="relative"
      >
        <Bell className="size-4" />
        {unseen > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold tabular-nums text-white"
            aria-hidden
          >
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-md border border-border bg-popover shadow-lg md:w-96">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Recent alerts</span>
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No alerts right now. The cron checks every 2 hours.
            </div>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto p-2">
              {recent.map((alert) => (
                <li key={alert.alertId}>
                  <AlertItem alert={alert} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
