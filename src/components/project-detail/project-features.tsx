import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { resolveFeatureIcon } from "@/lib/amenity-icons";
import { cn } from "@/lib/utils";

function FeatureIconCard({
  name,
  icon: Icon,
  variant,
}: {
  name: string;
  icon: LucideIcon;
  variant: "amenity" | "utility";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border p-4 text-center transition hover:shadow-sm",
        variant === "amenity"
          ? "border-zinc-100 bg-zinc-50/80 hover:border-brand-accent/20"
          : "border-sky-100 bg-sky-50/50 hover:border-sky-200"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1",
          variant === "amenity"
            ? "text-brand-accent ring-zinc-200"
            : "text-sky-600 ring-sky-100"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-2.5 text-xs font-medium leading-snug text-zinc-800">{name}</p>
    </div>
  );
}

function FeatureGrid({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "amenity" | "utility";
}) {
  if (!items.length) return null;

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((name) => (
          <FeatureIconCard
            key={`${variant}-${name}`}
            name={name}
            icon={resolveFeatureIcon(name)}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

export function ProjectFeatures({
  amenities,
  utilities,
  projectName,
}: {
  amenities: string[];
  utilities: string[];
  projectName?: string;
}) {
  const amenityList = amenities.filter(Boolean);
  const utilityList = utilities.filter(Boolean);
  const hasFeatures = amenityList.length > 0 || utilityList.length > 0;

  return (
    <section
      className="rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay p-6"
      aria-labelledby="project-features-heading"
    >
      <div className="mb-5">
        <h2 id="project-features-heading" className="text-lg font-semibold text-zinc-900">
          Amenities &amp; features
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {hasFeatures
            ? "Compare what this development offers — from lifestyle amenities to on-site utilities."
            : `Amenity details for ${projectName ?? "this project"} are not listed yet.`}
        </p>
      </div>

      {hasFeatures ? (
        <div className="space-y-6">
          <FeatureGrid title="Amenities" items={amenityList} variant="amenity" />
          <FeatureGrid title="Utilities" items={utilityList} variant="utility" />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center">
          <p className="text-sm text-zinc-600">
            Ask our team about parking, security, power backup, and other building features.
          </p>
          <Link
            href="#inquiry"
            className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline"
          >
            Inquire about amenities
          </Link>
        </div>
      )}
    </section>
  );
}
