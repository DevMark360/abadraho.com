"use client";

import {
  BulletChips,
  FaqAccordion,
  GeoSectionLabel,
} from "@/components/marketing/geo-page-summary";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { formatPrice } from "@/lib/utils";

export function ProjectGeoSummary({
  name,
  area,
  builder,
  projectType,
  progress,
  minPrice,
}: {
  name: string;
  area: string | null;
  builder: string | null;
  projectType: string | null;
  progress: string | null;
  minPrice: number | null;
}) {
  const location = area ?? "Pakistan";
  const developer = builder ?? "listed developer";
  const overview = `${name} is an off-plan ${projectType?.toLowerCase() ?? "property"} project in ${location}, marketed on AbadRaho by ${developer}. ${progress ? `Current status: ${progress}.` : ""} ${minPrice ? `Prices start from ${formatPrice(minPrice)}.` : "Contact us for current pricing."}`;

  const extraBullets = [
    projectType ? `Property type: ${projectType}` : null,
    "Compare payment plans with other projects on AbadRaho before you inquire",
  ].filter((line): line is string => Boolean(line));

  const intents = [
    {
      question: `What is ${name}?`,
      answer: `${name} is a verified off-plan listing on AbadRaho — review units, amenities, location, and installment options on this page.`,
    },
    {
      question: `How do I inquire about ${name}?`,
      answer:
        "Create a free AbadRaho account, review unit plans, then submit an inquiry or request a payment schedule from this project page.",
    },
  ];

  return (
    <section aria-label="Project overview" className="mt-4">
      <CollapsiblePanel
        label={<GeoSectionLabel>Quick overview</GeoSectionLabel>}
        hint="Show summary"
        labelClassName="text-sm"
        bodyClassName="space-y-3 px-4 py-4"
        className="rounded-xl border-zinc-200 bg-zinc-50/80"
        defaultOpen={false}
      >
        <p className="max-w-2xl text-base leading-relaxed text-zinc-700">{overview}</p>
        {extraBullets.length > 0 ? (
          <BulletChips bullets={extraBullets} column />
        ) : null}
        <FaqAccordion intents={intents} compact groupLabel="Common questions" />
      </CollapsiblePanel>
    </section>
  );
}
