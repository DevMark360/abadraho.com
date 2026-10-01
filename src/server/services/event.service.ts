import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { approvedEventWhere } from "@/lib/event-status";

export type PublicEventSummary = {
  id: number;
  title: string;
  slug: string;
  eventType: string;
  venue: string | null;
  startDate: Date;
  endDate: Date | null;
  coverImage: string | null;
  projectName: string | null;
  projectSlug: string | null;
};

export type PublicEventDetail = PublicEventSummary & {
  description: string | null;
  builderName: string | null;
};

export async function listPublicEvents(limit = 50): Promise<PublicEventSummary[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    const rows = await prisma.event.findMany({
      where: approvedEventWhere,
      orderBy: { startDate: "asc" },
      take: limit,
      include: { project: { select: { name: true, slug: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      eventType: r.eventType,
      venue: r.venue,
      startDate: r.startDate,
      endDate: r.endDate,
      coverImage: r.coverImage,
      projectName: r.project?.name ?? null,
      projectSlug: r.project?.slug ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getPublicEventBySlug(slug: string): Promise<PublicEventDetail | null> {
  if (!isDatabaseEnabled()) return null;
  try {
    const row = await prisma.event.findFirst({
      where: { slug, ...approvedEventWhere },
      include: {
        project: { select: { name: true, slug: true } },
        builder: { select: { fullName: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      eventType: row.eventType,
      description: row.description,
      venue: row.venue,
      startDate: row.startDate,
      endDate: row.endDate,
      coverImage: row.coverImage,
      projectName: row.project?.name ?? null,
      projectSlug: row.project?.slug ?? null,
      builderName: row.builder?.fullName ?? null,
    };
  } catch {
    return null;
  }
}
