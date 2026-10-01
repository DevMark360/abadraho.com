import Link from "next/link";

/** Reelly-style promo cards below filters */
export function FilterPromoCards() {
  return (
    <div className="hidden space-y-3 border-t border-zinc-100 p-4 lg:block">
      <Link
        href="/admin"
        className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:border-zinc-300 hover:bg-white"
      >
        <p className="text-xs font-semibold text-zinc-900">Projects API integration</p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          Connect our database and display projects on your website or CRM.
        </p>
      </Link>
      <Link
        href="/broker"
        className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:border-zinc-300 hover:bg-white"
      >
        <p className="text-xs font-semibold text-zinc-900">For agency</p>
        <p className="mt-1 text-[11px] text-zinc-500">Commission · Free trial</p>
      </Link>
    </div>
  );
}
