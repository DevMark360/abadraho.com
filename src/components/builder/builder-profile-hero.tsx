import Image from "next/image";
import type { ReactNode } from "react";
import {
  Building2,
  Calendar,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { BuilderProfile } from "@/server/services/builder-page.service";

function VerifiedDeveloperTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 sm:px-3 sm:py-1 sm:text-[11px]">
      <ShieldCheck className="h-3 w-3 text-emerald-600 sm:h-3.5 sm:w-3.5" aria-hidden />
      Verified developer
    </span>
  );
}

function ProfileStatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm transition hover:border-brand-accent/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            {label}
          </p>
          <div className="mt-1.5 text-xl font-bold leading-tight text-zinc-900">{value}</div>
          {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProfileRatingSummary({
  average,
  count,
}: {
  average: number;
  count: number;
}) {
  if (count <= 0) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
        <Star className="h-4 w-4 text-zinc-300" aria-hidden />
        No reviews yet
      </p>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1.5">
      <span className="text-lg font-bold leading-none text-zinc-900">{average.toFixed(1)}</span>
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-4 w-4 ${
              n <= Math.round(average)
                ? "fill-amber-400 text-amber-400"
                : "text-amber-200"
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-zinc-600">
        {count} review{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export function BuilderProfileHero({
  profile,
  coverImageUrl,
  description,
  totalProjects,
  projectCityCount,
  ratingAverage,
  ratingCount,
}: {
  profile: BuilderProfile;
  coverImageUrl?: string | null;
  description: string;
  totalProjects: number;
  projectCityCount: number;
  ratingAverage: number;
  ratingCount: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      {/* Cover — fixed responsive height (FB-style), focal point on building */}
      <div className="relative h-[200px] w-full overflow-hidden bg-zinc-900 sm:h-[240px] md:h-[280px]">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={`${profile.fullName} cover photo`}
            fill
            priority
            className="object-cover object-[center_40%] sm:object-[center_38%]"
            sizes="(max-width: 768px) 100vw, 1152px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-brand-accent" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
      </div>

      {/* Profile header */}
      <div className="relative border-b border-zinc-100 px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            <div className="-mt-12 shrink-0 self-start sm:-mt-14 md:-mt-16">
              <div className="relative h-[88px] w-[88px] overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] ring-1 ring-zinc-200/80 sm:h-24 sm:w-24 md:h-28 md:w-28">
                {profile.imageUrl ? (
                  <Image
                    src={profile.imageUrl}
                    alt={profile.fullName}
                    fill
                    priority
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                    <Building2 className="h-8 w-8 text-zinc-400" aria-hidden />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2 sm:pb-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                  {profile.fullName}
                </h1>
                <VerifiedDeveloperTag />
              </div>

              <ProfileRatingSummary average={ratingAverage} count={ratingCount} />

              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats — public marketing metrics only (no admin contact details) */}
      <div className="bg-zinc-50/80 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileStatCard
            label="Projects"
            value={totalProjects}
            hint={totalProjects === 1 ? "Live listing" : "Live listings"}
            icon={<Building2 className="h-4 w-4" aria-hidden />}
          />
          <ProfileStatCard
            label="Cities"
            value={projectCityCount}
            hint={
              projectCityCount === 1
                ? "City with active projects"
                : "Cities with active projects"
            }
            icon={<MapPin className="h-4 w-4" aria-hidden />}
          />
          {profile.memberSince ? (
            <ProfileStatCard
              label="On AbadRaho since"
              value={profile.memberSince}
              hint="Trusted developer partner"
              icon={<Calendar className="h-4 w-4" aria-hidden />}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
