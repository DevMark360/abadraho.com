import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { listProjectsByIds } from "@/server/services/project.service";
import type { ProjectListItem } from "@/types/project";

export async function getUserWishlistProjectIds(userId: number): Promise<number[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    const rows = await prisma.wishlist.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return rows.map((r) => r.projectId);
  } catch {
    return [];
  }
}

export async function getUserWishlist(userId: number): Promise<ProjectListItem[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      select: { projectId: true },
      orderBy: { createdAt: "desc" },
    });
    return listProjectsByIds(items.map((item) => item.projectId));
  } catch {
    return [];
  }
}

export async function addWishlist(userId: number, projectId: number) {
  if (!isDatabaseEnabled()) throw new Error("Database disabled");
  return prisma.wishlist.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, createdAt: new Date(), updatedAt: new Date() },
    update: { updatedAt: new Date() },
  });
}

export async function removeWishlist(userId: number, projectId: number) {
  if (!isDatabaseEnabled()) throw new Error("Database disabled");
  return prisma.wishlist.deleteMany({ where: { userId, projectId } });
}

export async function syncWishlistFromLocal(
  userId: number,
  projectIds: number[]
): Promise<number> {
  let added = 0;
  for (const projectId of projectIds) {
    const exists = await prisma.project.findFirst({
      where: { id: projectId, isArchive: false },
    });
    if (!exists) continue;
    await addWishlist(userId, projectId);
    added += 1;
  }
  return added;
}

export async function isInUserWishlist(
  userId: number,
  projectId: number
): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  const count = await prisma.wishlist.count({ where: { userId, projectId } });
  return count > 0;
}
