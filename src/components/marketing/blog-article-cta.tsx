import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { designTw } from "@/config/design-tokens";

export function BlogArticleCta({ areaHint }: { areaHint?: string | null }) {
  const label = areaHint
    ? `Browse off-plan projects in ${areaHint}`
    : "Browse off-plan projects in Karachi";

  return (
    <div
      className={
        designTw.publicCard +
        " mt-10 flex flex-col gap-4 border-brand/20 bg-gradient-to-br from-zinc-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Building2 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-zinc-900">{label}</p>
          <p className="mt-1 text-sm text-zinc-600">
            Compare payment plans, handover dates, and unit pricing on AbadRaho.
          </p>
        </div>
      </div>
      <Link
        href="/projects"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-dark"
      >
        View listings
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
