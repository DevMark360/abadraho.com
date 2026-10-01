import { Calendar, Clock, User } from "lucide-react";
import { businessConfig } from "@/config/business";
import { cn } from "@/lib/utils";

export function BlogArticleByline({
  date,
  category,
  readingMinutes,
  className,
}: {
  date?: string;
  category?: string | null;
  readingMinutes?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200">
          <User className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">
            {businessConfig.brandName} Editorial
          </p>
          <p className="text-xs text-zinc-500">{businessConfig.legalName}</p>
        </div>
      </div>
      {readingMinutes ? (
        <div className="flex items-center gap-1.5 text-sm text-zinc-600">
          <Clock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
          <span>{readingMinutes} min read</span>
        </div>
      ) : null}
      {date ? (
        <div className="flex items-center gap-1.5 text-sm text-zinc-600">
          <Calendar className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium ring-1 ring-zinc-200">
            Last updated · {date}
          </span>
        </div>
      ) : null}
      {category ? (
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
          {category}
        </span>
      ) : null}
    </div>
  );
}
