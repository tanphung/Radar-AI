import { Eye } from "lucide-react";

interface Props {
  text: string;
}

export function SmartMoneyCard({ text }: Props) {
  return (
    <section className="mx-4 my-2 flex items-start gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 md:mx-6">
      <Eye
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Smart money
        </span>
        <p className="mt-0.5 text-sm">{text}</p>
      </div>
    </section>
  );
}
