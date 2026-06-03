import { Building2, GitBranch, Megaphone, Users } from "lucide-react";

import type { ProjectUpdate, UpdateType } from "@/lib/contract/schema";

const TYPE_ICON: Record<UpdateType, typeof GitBranch> = {
  github: GitBranch,
  announcement: Megaphone,
  institutional: Building2,
  community: Users,
};

const TYPE_LABEL: Record<UpdateType, string> = {
  github: "GitHub",
  announcement: "Announcement",
  institutional: "Institutional",
  community: "Community",
};

interface Props {
  items: ProjectUpdate[];
}

export function ProjectUpdates({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="px-4 py-4 md:px-6">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        Project updates
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => {
          const Icon = TYPE_ICON[item.type];
          return (
            <li
              key={index}
              className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5"
            >
              <Icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {TYPE_LABEL[item.type]}
                </span>
                <p className="mt-0.5 text-sm">{item.content}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
