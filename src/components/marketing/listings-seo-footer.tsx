import Link from "next/link";
import { geoContent } from "@/config/geo-content";
import { MarkPropertiesBadge } from "@/components/marketing/trust-signals";

/** One-line SEO strip for listings — visible to bots, minimal UI clutter. */
export function ListingsSeoFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-4 py-4 lg:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <MarkPropertiesBadge />
        <p className="text-center text-xs leading-relaxed text-zinc-500 sm:text-right">
          {geoContent.listings.summary.slice(0, 100)}…{" "}
          <Link href="/about-us" className="font-medium text-brand hover:underline">
            About AbadRaho
          </Link>
        </p>
      </div>
    </footer>
  );
}
