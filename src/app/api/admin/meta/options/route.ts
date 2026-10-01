import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { isBuilderSession } from "@/lib/admin-rbac";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";

/** Lookup options for admin forms (areas, types, progress, amenities, utilities) */
export async function GET() {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  if (!isDatabaseEnabled()) {
    return NextResponse.json({
      areas: [],
      projectTypes: [],
      progress: [],
      builders: [],
      tags: [],
      amenities: [],
      utilities: [],
    });
  }

  const builderScoped = isBuilderSession(auth.session);

  try {
    const [areas, projectTypes, progress, builders, tags, amenities, utilities] =
      await Promise.all([
        prisma.area.findMany({ orderBy: { name: "asc" }, take: 500 }),
        prisma.projectType.findMany({ where: { isArchive: false }, orderBy: { title: "asc" } }),
        prisma.progress.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
        builderScoped
          ? prisma.builder.findMany({
              where: { userId: auth.session.id, isArchive: false },
              orderBy: { fullName: "asc" },
            })
          : prisma.builder.findMany({
              where: { isArchive: false },
              orderBy: { fullName: "asc" },
              take: 500,
            }),
        prisma.tag.findMany({ where: { isArchive: false }, orderBy: { name: "asc" }, take: 500 }),
        prisma.amenity.findMany({ where: { isArchive: false }, orderBy: { name: "asc" }, take: 500 }),
        prisma.utility.findMany({ where: { isArchive: false }, orderBy: { name: "asc" }, take: 500 }),
      ]);

    return NextResponse.json({
      areas: areas.map((a) => ({ value: String(a.id), label: a.name })),
      projectTypes: projectTypes.map((t) => ({ value: String(t.id), label: t.title })),
      progress: progress.map((p) => ({ value: String(p.id), label: p.name })),
      builders: builders.map((b) => ({ value: String(b.id), label: b.fullName })),
      tags: tags.map((t) => ({ value: String(t.id), label: t.name })),
      amenities: amenities.map((a) => ({ value: String(a.id), label: a.name })),
      utilities: utilities.map((u) => ({ value: String(u.id), label: u.name })),
    });
  } catch (e) {
    return NextResponse.json(
      {
        message: String(e),
        areas: [],
        projectTypes: [],
        progress: [],
        builders: [],
        tags: [],
        amenities: [],
        utilities: [],
      },
      { status: 500 }
    );
  }
}
