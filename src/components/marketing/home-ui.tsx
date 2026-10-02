import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Illustration3D, type Illustration3DName } from "@/components/ui/illustration-3d";
import { cn } from "@/lib/utils";

export const homeCardClass =
  "rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md";

export function HomeKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "zinc",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "zinc" | "red" | "emerald" | "blue";
}) {
  const accentMap = {
    zinc: "bg-zinc-100 text-zinc-700",
    red: "bg-red-50 text-brand-accent",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className={cn(homeCardClass, "p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentMap[accent]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function HomeEmptyState({
  title,
  description,
  icon: Icon,
  illustration,
  action,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  /** 3D illustration shown instead of the plain icon. */
  illustration?: Illustration3DName;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-clay-lg bg-clay-well px-6 py-12 text-center shadow-clay-inset">
      {illustration ? (
        <Illustration3D name={illustration} size={104} />
      ) : (
        <Icon className="h-8 w-8 text-brand-accent" aria-hidden />
      )}
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
