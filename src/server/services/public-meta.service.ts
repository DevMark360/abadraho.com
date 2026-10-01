import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";

export async function listMetaAreas() {
  if (!isDatabaseEnabled()) return [];
  const rows = await prisma.area.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }));
}

export async function listMetaProjectTypes() {
  if (!isDatabaseEnabled()) return [];
  const rows = await prisma.projectType.findMany({
    where: { isArchive: false },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.title }));
}
