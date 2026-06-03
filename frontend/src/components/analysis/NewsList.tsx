import { AlertTriangle, Minus, TrendingUp } from "lucide-react";

import type { NewsItem } from "@/lib/contract/schema";

const ITEM_STYLE: Record<NewsItem["sentiment"], string> = {
  positive: "border-emerald-500/30 bg-emerald-500/5",
  neutral: "border-border bg-muted/30",
  negative: "border-red-500/30 bg-red-500/5",
};

const ITEM_ICON: Record<NewsItem["sentiment"], typeof TrendingUp> = {
  positive: TrendingUp,
  neutral: Minus,
  negative: AlertTriangle,
};

const ICON_COLOR: Record<NewsItem["sentiment"], string> = {
  positive: "text-emerald-400",
  neutral: "text-muted-foreground",
  negative: "text-red-400",
};

interface Props {
  items: NewsItem[];
}

export function NewsList({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="px-4 py-4 md:px-6">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        Latest news
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => {
          const Icon = ITEM_ICON[item.sentiment];
          return (
            <li
              key={`${index}-${item.title}`}
              className={`flex items-start gap-3 rounded-md border px-3 py-2.5 ${ITEM_STYLE[item.sentiment]}`}
            >
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${ICON_COLOR[item.sentiment]}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Impact:
                  </span>{" "}
                  {item.impact}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
