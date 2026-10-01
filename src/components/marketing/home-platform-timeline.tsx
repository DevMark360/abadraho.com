import { Search, GitCompare, Calendar, MessageSquare, CheckCircle2 } from "lucide-react";
import { homeCardClass } from "@/components/marketing/home-ui";
import { cn } from "@/lib/utils";

const events = [
  {
    title: "Search & shortlist",
    description: "Filter projects by area, budget, unit type, and handover.",
    icon: Search,
    tone: "safe" as const,
  },
  {
    title: "Compare payment plans",
    description: "Review installments and pricing across two developments side by side.",
    icon: GitCompare,
    tone: "info" as const,
  },
  {
    title: "Book a site visit",
    description: "Mark Properties advisors arrange guided visits for shortlisted projects.",
    icon: Calendar,
    tone: "warning" as const,
  },
  {
    title: "Submit inquiry",
    description: "Get expert answers and move forward with transparent documentation.",
    icon: MessageSquare,
    tone: "safe" as const,
  },
];

const toneClass = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

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
          const Icon = event.icon;
          const isLast = i === events.length - 1;
          return (
            <li key={event.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ring-1 ring-zinc-200",
                    toneClass[event.tone]
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {!isLast ? (
                  <span className="my-1 w-px flex-1 min-h-[2rem] bg-zinc-200" aria-hidden />
                ) : null}
              </div>
              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-8")}>
                <p className="flex items-center gap-2 font-semibold text-zinc-900">
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
