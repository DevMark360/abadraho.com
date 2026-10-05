import Link from "next/link";

/** Reelly-style promo cards below filters */
export function FilterPromoCards() {
  return (
    <div className="hidden space-y-3 border-t border-zinc-100 p-4 lg:block">
      <Link
        href="/admin"
        className="block rounded-clay border border-white/80 bg-clay-surface p-3 shadow-clay-sm transition-shadow hover:shadow-clay"
      >
        <p className="text-xs font-semibold text-zinc-900">Projects API integration</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          Connect our database and display projects on your website or CRM.
        </p>
      </Link>
      <Link
        href="/broker"
        className="block rounded-clay border border-white/80 bg-clay-surface p-3 shadow-clay-sm transition-shadow hover:shadow-clay"
      >
        <p className="text-xs font-semibold text-zinc-900">For agency</p>
        <p className="mt-1 text-[11px] text-zinc-500">Commission · Free trial</p>
      </Link>
    </div>
  );
}
