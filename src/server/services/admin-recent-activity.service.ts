import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { userTypeIds } from "@/config/site";

export type RecentActivityItem = {
  key: string;
  type: "signup" | "inquiry" | "review" | "project";
  label: string;
  createdAt: string;
  href: string;
};

const PER_SOURCE_LIMIT = 8;
const FEED_LIMIT = 10;

/** Pulls the most recent rows from a few real, high-signal sources and merges them into one
 * reverse-chronological feed — so the dashboard feels alive rather than static. */
export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  if (!isDatabaseEnabled()) return [];

  const [signups, inquiries, reviews, projects] = await Promise.all([
    prisma.user.findMany({
      where: { userTypeId: userTypeIds.websiteUser, isArchive: false },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
    prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: {
        id: true,
        name: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: { isArchive: false },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  const items: RecentActivityItem[] = [];

  for (const s of signups) {
    if (!s.createdAt) continue;
    const name = `${s.firstName}${s.lastName ? ` ${s.lastName}` : ""}`.trim();
    items.push({
      key: `signup-${s.id}`,
      type: "signup",
      label: `New signup: ${name || "Website user"}`,
      createdAt: s.createdAt.toISOString(),
      href: "/admin/customers",
    });
  }

  for (const i of inquiries) {
    if (!i.createdAt) continue;
    const who = i.name?.trim() || "Someone";
    const on = i.project?.name ? ` on ${i.project.name}` : "";
    items.push({
      key: `inquiry-${i.id}`,
      type: "inquiry",
      label: `Inquiry from ${who}${on}`,
      createdAt: i.createdAt.toISOString(),
      href: "/admin/inquiries",
    });
  }

  for (const r of reviews) {
    if (!r.createdAt) continue;
    const stars = "★".repeat(Math.max(0, Math.min(5, r.rating)));
    const on = r.project?.name ?? "a project";
    items.push({
      key: `review-${r.id}`,
      type: "review",
      label: `${stars} review on ${on}`,
      createdAt: r.createdAt.toISOString(),
      href: "/admin/reviews",
    });
  }

  for (const p of projects) {
    items.push({
      key: `project-${p.id}`,
      type: "project",
      label: `New project added: ${p.name}`,
      createdAt: p.createdAt.toISOString(),
      href: "/admin/projects",
    });
  }

  return items
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, FEED_LIMIT);
}
