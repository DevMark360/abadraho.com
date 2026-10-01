import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServedAd } from "@/server/services/ad-serving.service";

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const section = "py-12 md:py-16 lg:py-20";

/**
 * The one "this is sponsored" signal shared by all three placement types — same color,
 * same mark, same position logic — so three different ad units read as one program
 * instead of three unrelated bolt-ons. Bronze is used only here, never for real
 * navigation/CTAs, so it never competes with `brand-accent`.
 */
function SponsorBadge({ label, inverted = false }: { label: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider",
        inverted
          ? "border-white/25 bg-white/15 text-amber-100 backdrop-blur-sm"
          : "border-sponsor-tint-border bg-sponsor-tint text-sponsor-ink"
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

/**
 * Generative duotone skyline — the default render whenever a builder hasn't uploaded a
 * creative yet. Replaces what used to be a flat, broken-looking black box.
 */
function SponsorArt({
  imageUrl,
  alt,
  className,
}: {
  imageUrl: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-zinc-100", className, !imageUrl && "bg-zinc-900")}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <rect width="200" height="140" fill="#232026" />
          <rect x="8" y="70" width="18" height="70" fill="#33303a" />
          <rect x="30" y="50" width="22" height="90" fill="#3c3944" />
          <rect x="56" y="30" width="20" height="110" fill="#454150" />
          <rect x="80" y="58" width="26" height="82" fill="#3c3944" />
          <rect x="110" y="38" width="20" height="102" fill="#454150" />
          <rect x="134" y="66" width="22" height="74" fill="#33303a" />
          <rect x="160" y="46" width="18" height="94" fill="#3c3944" />
          <rect width="200" height="140" fill="url(#sponsorArtGradient)" />
          <defs>
            <linearGradient id="sponsorArtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93672a" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#93672a" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
}

/** Closes every placement the same way — replaces each component's previous ad-hoc ending. */
function SponsorFooter({ builderName, cta }: { builderName: string; cta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-400">
      <span>
        Marketed by <span className="font-medium text-zinc-600">{builderName}</span>
      </span>
      <span className="inline-flex items-center gap-1 font-semibold text-zinc-700">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  );
}

/** Renders nothing when no campaign is currently winning this slot — never a placeholder gap. */
export function SponsoredFeaturedSection({ ad }: { ad: ServedAd | null }) {
  if (!ad) return null;

  return (
    <section className={cn(section, "bg-zinc-50")} id="sponsored-featured">
      <div className={container}>
        <a
          href={`/api/v1/ads/click/${ad.campaignId}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row">
            <SponsorArt
              imageUrl={ad.project.imageUrl}
              alt={ad.project.name}
              className="aspect-video w-full shrink-0 sm:aspect-auto sm:w-80"
            />
            <div className="flex flex-1 flex-col gap-2 p-6">
              <SponsorBadge label="Featured partner" />
              <h3 className="mt-1 text-xl font-semibold text-zinc-900">{ad.project.name}</h3>
              {ad.project.area ? <p className="text-sm text-zinc-500">{ad.project.area}</p> : null}
              {ad.project.minPrice != null ? (
                <p className="mt-1 text-sm font-medium text-zinc-700">
                  From Rs. {ad.project.minPrice.toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>
          <SponsorFooter builderName={ad.builderName} cta="View project" />
        </a>
      </div>
    </section>
  );
}

/** Compact "Recommended for you" style card — distinct from the hero-ish Featured section
 * and the full-bleed Banner, meant to sit alongside organic content rather than dominate it. */
export function SponsoredContentSection({ ad }: { ad: ServedAd | null }) {
  if (!ad) return null;

  return (
    <section className={cn(section, "bg-zinc-50")} id="sponsored-content">
      <div className={container}>
        <a
          href={`/api/v1/ads/click/${ad.campaignId}`}
          className="group flex max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center gap-3 p-3">
            <SponsorArt
              imageUrl={ad.project.imageUrl}
              alt={ad.project.name}
              className="h-16 w-16 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-zinc-900">{ad.project.name}</h3>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {ad.project.area ?? ad.title}
              </p>
              {ad.project.minPrice != null ? (
                <p className="mt-1 text-xs font-medium text-zinc-700">
                  From Rs. {ad.project.minPrice.toLocaleString()}
                </p>
              ) : null}
            </div>
            <SponsorBadge label="Sponsored" />
          </div>
          <SponsorFooter builderName={ad.builderName} cta="View" />
        </a>
      </div>
    </section>
  );
}

export function SponsoredBannerSection({ ad }: { ad: ServedAd | null }) {
  if (!ad) return null;

  return (
    <section className={cn(section, "bg-white")} id="sponsored-banner">
      <div className={container}>
        <a
          href={`/api/v1/ads/click/${ad.campaignId}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 shadow-sm transition hover:shadow-md"
        >
          <div className="relative">
            <SponsorArt imageUrl={ad.project.imageUrl} alt={ad.project.name} className="aspect-[21/6] w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-6">
              <SponsorBadge label="Sponsored" inverted />
              <h3 className="text-lg font-semibold text-white sm:text-2xl">{ad.project.name}</h3>
              <p className="text-xs font-medium text-zinc-300">{ad.title}</p>
            </div>
          </div>
          <SponsorFooter builderName={ad.builderName} cta="View project" />
        </a>
      </div>
    </section>
  );
}
