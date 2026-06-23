"use client";

import { Check, RotateCcw, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  summary: string;
  sources: string[];
  onReanalyze: () => void;
  reanalyzing: boolean;
}

export function VerdictBlock({
  summary,
  sources,
  onReanalyze,
  reanalyzing,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1_800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = useCallback(async () => {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      const input = document.createElement("input");
      input.value = href;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
    }
  }, []);

  return (
    <section className="border-t border-border px-4 py-4 md:px-6">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        AI verdict
      </h3>
      <p className="text-sm leading-relaxed">{summary}</p>
      {sources.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sources considered: {sources.join(" · ")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={onReanalyze}
          disabled={reanalyzing}
          className="gap-2"
        >
          <RotateCcw className="size-4" />
          {reanalyzing ? "Re-running…" : "Re-analyze"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={copyLink}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Share2 className="size-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </section>
  );
}
