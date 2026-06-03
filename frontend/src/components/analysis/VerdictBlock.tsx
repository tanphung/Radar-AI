import { RotateCcw, Share2 } from "lucide-react";

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
          onClick={() => {
            // TODO(Phase 7): copy share link or open share sheet
          }}
        >
          <Share2 className="size-4" />
          Share
        </Button>
      </div>
    </section>
  );
}
