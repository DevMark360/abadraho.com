import { MarketingShell } from "@/components/layout/marketing-shell";
import { ListingsPageShell } from "@/components/projects/listings-page-shell";
import { buildFilterSummary } from "@/lib/filter-match-tiers";
import { LISTINGS_PAGE_SIZE } from "@/lib/pagination";
import { getSession } from "@/lib/session";
import { parseProjectFilters } from "@/server/services/project-filter.service";
import { listProjectsCached } from "@/server/services/project-list-cache.service";
import { listProjects } from "@/server/services/project.service";
import { getTeamMemberProjectScope } from "@/server/services/admin-team.service";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageSchema } from "@/lib/schema-markup";
import { buildPageMetadata } from "@/lib/seo";
import { getSlotRotation } from "@/server/services/ad-serving.service";

export const metadata = buildPageMetadata({
  title: "Off-plan properties",
  description:
    "Browse off-plan apartments, villas, and plots in Karachi and Pakistan. Filter by area, budget, payment plan, and handover date.",
  path: "/projects",
});

/** Revalidate cached filter combinations periodically (see project-list-cache.service). */
export const revalidate = 120;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toFilterParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const currency = "PKR";
  const filterParams = toFilterParams(raw);
  const session = await getSession();
  const filters = parseProjectFilters(filterParams, {
    defaultPerPage: LISTINGS_PAGE_SIZE,
    maxPerPage: LISTINGS_PAGE_SIZE,
  });
  if (session?.id) filters.viewerUserId = session.id;
  const filterSummary = buildFilterSummary(filters, filterParams);
  const filterQueryString = new URLSearchParams(
    Object.entries(filterParams).filter(([, v]) => v != null && v !== "") as [string, string][]
  ).toString();

  const teamScoped =
    session?.id != null && (await getTeamMemberProjectScope(session.id)) !== null;
  const { items, total, source } = teamScoped
    ? await listProjects(filters)
    : await listProjectsCached(filters);

  // Ad targeting only has one dimension of context here: a single selected area/type/tier
  // filter. Multi-select cases fall back to the "any" wildcard slot — but when NO filter at
  // all is applied, this page has zero context to distinguish itself from the homepage's own
  // wildcard slot, and a targeted campaign winning that slot (for lack of competition) would
  // leak onto this unfiltered "browse everything" view even though it never targeted it. Only
  // the homepage is meant to be that broad-reach placement, so skip ads here entirely rather
  // than fall back to the wildcard when no filter narrows the context at all.
  const singleAreaId = filters.areaIds?.length === 1 ? filters.areaIds[0] : null;
  const singleProjectTypeId = filters.unitTypeIds?.length === 1 ? filters.unitTypeIds[0] : null;
  const singleTier = filters.tiers?.length === 1 ? filters.tiers[0] : null;
  const hasNoFilterContext =
    !filters.areaIds?.length && !filters.unitTypeIds?.length && !filters.tiers?.length;
  const [featuredRotation, bannerRotation, contentRotation] = hasNoFilterContext
    ? [[], [], []]
    : await Promise.all([
        getSlotRotation("featured_listing", singleAreaId, singleProjectTypeId, singleTier),
        getSlotRotation("banner", singleAreaId, singleProjectTypeId, singleTier),
        getSlotRotation("sponsored_content", singleAreaId, singleProjectTypeId, singleTier),
      ]);

  return (
    <MarketingShell>
      <JsonLd
        data={buildWebPageSchema({
          name: "Off-plan properties in Pakistan",
          description:
            "Browse off-plan apartments, villas, and plots in Karachi and Pakistan. Filter by area, budget, payment plan, and handover date.",
          path: "/projects",
        })}
      />
      <ListingsPageShell
        filterKey={filterQueryString}
        filterQueryString={filterQueryString}
        pageSize={LISTINGS_PAGE_SIZE}
        projects={items}
        currency={currency}
        total={total}
        source={source}
        filterSummary={filterSummary}
        featuredRotation={featuredRotation}
        bannerRotation={bannerRotation}
        contentRotation={contentRotation}
      />
    </MarketingShell>
  );
}
