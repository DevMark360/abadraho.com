import { CheckCircle2 } from "lucide-react";
import { homeCardClass } from "@/components/marketing/home-ui";
import { Illustration3D, type Illustration3DName } from "@/components/ui/illustration-3d";
import { cn } from "@/lib/utils";

const events: Array<{ title: string; description: string; illustration: Illustration3DName }> = [
  {
    title: "Search & shortlist",
    description: "Filter projects by area, budget, unit type, and handover.",
    illustration: "search",
  },
  {
    title: "Compare payment plans",
    description: "Review installments and pricing across two developments side by side.",
    illustration: "memo",
  },
  {
    title: "Book a site visit",
    description: "Mark Properties advisors arrange guided visits for shortlisted projects.",
    illustration: "calendar",
  },
  {
    title: "Submit inquiry",
    description: "Get expert answers and move forward with transparent documentation.",
    illustration: "chat",
  },
];

export function HomePlatformTimeline() {
  return (
    <div className={cn(homeCardClass, "p-6 sm:p-8")}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-zinc-900">Your buyer journey</h3>
        <p className="mt-1 text-sm text-zinc-500">
          How AbadRaho guides you from search to investment
        </p>
      </div>
      <ol className="space-y-0">
        {events.map((event, i) => {
          const isLast = i === events.length - 1;
          return (
            <li key={event.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <Illustration3D name={event.illustration} size={48} className="shrink-0" />
                {!isLast ? (
                  <span className="my-1 w-px flex-1 min-h-[1.5rem] bg-clay-line" aria-hidden />
                ) : null}
              </div>
              <div className={cn("min-w-0 flex-1 pt-2", isLast ? "pb-0" : "pb-6")}>
                <p className="flex items-center gap-2 font-semibold text-zinc-900">
                  <span className="text-xs font-semibold tabular-nums text-brand-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {event.title}
                  {isLast ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : null}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{event.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
