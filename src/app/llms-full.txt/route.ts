import { businessConfig } from "@/config/business";
import {
  formatPkrShort,
  homeFaqs,
  homeGuide,
  homeHowTo,
  homeInsights,
  homeLead,
  homeSources,
} from "@/config/home-aeo";
import { siteConfig } from "@/config/site";
import { isDatabaseEnabled } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { listProjectsCached } from "@/server/services/project-list-cache.service";
import type { ProjectListItem } from "@/types/project";

/**
 * /llms-full.txt — the long-form companion to /llms.txt: the site's key content in one Markdown
 * document (what AbadRaho is, FAQ, buyer's guide, listing statistics, and every live project).
 * Same copy as the home page (src/config/home-aeo.ts), so AI answers match what users see.
 * Per request so links use the server's runtime site URL.
 */
export const dynamic = "force-dynamic";

/** AI checkers give up after ~5s; never let a slow database block the whole file. */
const PROJECTS_TIMEOUT_MS = 2500;

async function loadProjects(): Promise<{
  items: ProjectListItem[];
  total: number;
} | null> {
  if (!isDatabaseEnabled()) return null;
  try {
    return await Promise.race([
      listProjectsCached({ perPage: 200, page: 1 }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PROJECTS_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return null;
  }
}

function projectLine(p: ProjectListItem): string {
  const facts = [
    p.area,
    p.builderName ? `by ${p.builderName}` : null,
    p.minPrice ? `from ${formatPkrShort(p.minPrice)}` : null,
    p.progressName,
    p.installmentMonths ? `${p.installmentMonths}-month plan` : null,
    p.handoverLabel ? `handover ${p.handoverLabel}` : null,
  ].filter(Boolean);
  return `- [${p.name}](${absoluteUrl(`/project/${p.slug}`)})${facts.length ? `: ${facts.join(" · ")}` : ""}`;
}

export async function GET() {
  const projects = await loadProjects();
  const facts = { projectCount: projects?.total ?? 0, areaCounts: {} };
  const guide = homeGuide(facts);
  const insights = projects ? homeInsights(projects.items, projects.total) : [];
  const [, ...cols] = guide.comparison.columns;

  const body = [
    `# ${siteConfig.name} — full guide for AI systems`,
    "",
    `> ${homeLead(facts)}`,
    "",
    `Operator: ${businessConfig.legalName}, Karachi, Sindh, Pakistan. Website: ${absoluteUrl("/")}. Contact: ${businessConfig.email}. Short version: ${absoluteUrl("/llms.txt")}.`,
    "",
    "## Frequently asked questions",
    ...homeFaqs(facts).flatMap((f) => ["", `### ${f.question}`, f.answer]),
    "",
    `## ${homeHowTo.name}`,
    ...homeHowTo.steps.map(
      (s, i) => `${i + 1}. **${s.name}** — ${s.text} (${absoluteUrl(s.path)})`,
    ),
    "",
    `## ${guide.title}`,
    "",
    guide.intro,
    "",
    `### ${guide.paymentPlans.question}`,
    ...guide.paymentPlans.paragraphs.flatMap((p) => ["", p]),
    "",
    `### ${guide.comparison.question}`,
    "",
    `| Aspect | ${cols.join(" | ")} |`,
    `| --- | ${cols.map(() => "---").join(" | ")} |`,
    ...guide.comparison.rows.map((r) => `| ${r.join(" | ")} |`),
    "",
    `### ${guide.checklist.question}`,
    ...guide.checklist.items.map((item) => `- ${item}`),
    "",
    `### ${guide.afterBooking.question}`,
    "",
    guide.afterBooking.paragraph,
    "",
    "### Official sources",
    ...homeSources.map((s) => `- [${s.name}](${s.url}): ${s.note}`),
    "",
    ...(insights.length
      ? [
          "## Listing statistics",
          "",
          `According to AbadRaho's live listing data (${projects?.total ?? 0} projects):`,
          ...insights.map((i) => `- **${i.value} ${i.label}** — ${i.detail}`),
          "",
        ]
      : []),
    ...(projects?.items.length
      ? [
          `## Live off-plan projects (${projects.items.length}${projects.total > projects.items.length ? ` of ${projects.total}` : ""})`,
          "",
          ...projects.items.map(projectLine),
          "",
          `Full, filterable list: ${absoluteUrl("/projects")}`,
          "",
        ]
      : [
          `## Live off-plan projects`,
          "",
          `Browse all listings: ${absoluteUrl("/projects")}`,
          "",
        ]),
    "General guidance only, not financial or legal advice. Prices and payment plans are published by developers and can change — confirm with the developer before paying.",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
