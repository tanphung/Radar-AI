import { Check, X } from "lucide-react";

interface Props {
  bullish: string[];
  risks: string[];
}

export function SignalsGrid({ bullish, risks }: Props) {
  return (
    <section className="grid gap-4 px-4 py-4 md:grid-cols-2 md:px-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-emerald-300">
          Bullish signals
        </h3>
        <ul className="flex flex-col gap-1.5">
          {bullish.map((s, i) => (
            <li
              key={`b-${i}`}
              className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm"
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-emerald-400"
                aria-hidden
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium text-red-300">Risk signals</h3>
        <ul className="flex flex-col gap-1.5">
          {risks.map((s, i) => (
            <li
              key={`r-${i}`}
              className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm"
            >
              <X
                className="mt-0.5 size-4 shrink-0 text-red-400"
                aria-hidden
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
