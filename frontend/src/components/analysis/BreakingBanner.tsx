import { Zap } from "lucide-react";

interface Props {
  headline: string;
}

export function BreakingBanner({ headline }: Props) {
  return (
    <div className="mx-4 my-4 flex items-start gap-3 rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm md:mx-6">
      <Zap className="mt-0.5 size-4 shrink-0 text-blue-400" aria-hidden />
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-blue-300">
          Breaking
        </span>
        <p className="mt-0.5 text-foreground">{headline}</p>
      </div>
    </div>
  );
}
