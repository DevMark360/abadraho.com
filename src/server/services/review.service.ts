import { isDatabaseEnabled } from "@/lib/db";
import {
  EMPTY_BUILDER_RATING_DISTRIBUTION,
  type BuilderRatingDistribution,
} from "@/lib/builder-rating";
import { prisma } from "@/lib/prisma";
import {
  approvedReviewWhere,
  REVIEW_STATUS_PENDING,
} from "@/lib/review-status";
import { createNotification } from "@/server/services/notification.service";
import { ADMIN_BROADCAST } from "@/lib/notifications/recipient";

export type { BuilderRatingDistribution } from "@/lib/builder-rating";
export {
  EMPTY_BUILDER_RATING_DISTRIBUTION,
  normalizeBuilderRatingDistribution,
} from "@/lib/builder-rating";
export type ReviewDto = {
  id: number;
  projectId: number;
  userId: number;
  rating: number;
  comment: string;
  authorName: string | null;
  createdAt: Date | null;
};

export type BuilderReviewItem = ReviewDto & {
  projectName: string;
  projectSlug: string;
};

async function liveProjectIdsForBuilder(builderId: number): Promise<number[]> {
  const rows = await prisma.projectOwner.findMany({
    where: {
      builderId,
      project: { isArchive: false, status: 1 },
    },
    select: { projectId: true },
  });
  return [...new Set(rows.map((r) => r.projectId))];
}

/**
 * Reviewer names, loaded separately instead of `include: { user: true }`: a review whose user row
 * was deleted made the include throw ("Field user is required"), which took down the whole page.
 */
async function reviewAuthorNames(userIds: number[]): Promise<Map<number, string | null>> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true },
  });
  return new Map(
    users.map((u) => [u.id, [u.firstName, u.lastName].filter(Boolean).join(" ") || null])
  );
}

export async function listProjectReviews(projectId: number): Promise<ReviewDto[]> {
  if (!isDatabaseEnabled()) return [];
  const rows = await prisma.review.findMany({
    where: { projectId, ...approvedReviewWhere },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const names = await reviewAuthorNames(rows.map((r) => r.userId));
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    userId: r.userId,
    rating: r.rating,
    comment: r.comment,
    authorName: names.get(r.userId) ?? null,
    createdAt: r.createdAt,
  }));
}

export async function addProjectReview(
  userId: number,
  projectId: number,
  rating: number,
  comment: string
): Promise<{ success: boolean; message: string; review?: ReviewDto }> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled" };
  }
  if (rating < 1 || rating > 5) {
    return { success: false, message: "Rating must be 1–5" };
  }
  const text = comment.trim().slice(0, 255);
  if (!text) {
    return { success: false, message: "Review comment is required" };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, isArchive: false },
  });
  if (!project) {
    return { success: false, message: "Project not found" };
  }

  const now = new Date();
  const existing = await prisma.review.findFirst({
    where: { userId, projectId },
    orderBy: { id: "desc" },
  });

  const row = existing
    ? await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating,
          comment: text,
          status: REVIEW_STATUS_PENDING,
          updatedAt: now,
        },
        include: { user: true },
      })
    : await prisma.review.create({
        data: {
          userId,
          projectId,
          rating,
          comment: text,
          status: REVIEW_STATUS_PENDING,
          createdAt: now,
          updatedAt: now,
        },
        include: { user: true },
      });

  // Notify admins + project builder(s) about the new review
  const projRows = await prisma.project.findFirst({
    where: { id: projectId },
    select: { name: true },
  });
  const projectName = projRows?.name ?? "a project";
  const reviewerName = [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") || "A user";

  createNotification({
    recipientType: ADMIN_BROADCAST.type,
    recipientId: ADMIN_BROADCAST.id,
    type: "review",
    title: "New review submitted",
    message: `${reviewerName} left a ${rating}-star review on "${projectName}".`,
    link: "/admin/reviews",
  }).catch(() => {});

  const owners = await prisma.projectOwner.findMany({
    where: { projectId },
    include: { builder: { select: { id: true } } },
  });
  for (const owner of owners) {
    if (owner.builder) {
      createNotification({
        recipientType: "builder",
        recipientId: owner.builder.id,
        type: "review",
        title: "New review on your project",
        message: `${reviewerName} left a ${rating}-star review on "${projectName}".`,
        link: "/admin/reviews",
      }).catch(() => {});
    }
  }

  return {
    success: true,
    message: existing
      ? "Your review was updated and submitted for approval"
      : "Thank you! Your review was submitted for approval",
    review: {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      rating: row.rating,
      comment: row.comment,
      authorName: [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") || null,
      createdAt: row.createdAt,
    },
  };
}

export async function getProjectRatingStats(projectId: number): Promise<{
  average: number;
  count: number;
}> {
  if (!isDatabaseEnabled()) return { average: 0, count: 0 };
  const agg = await prisma.review.aggregate({
    where: { projectId, ...approvedReviewWhere },
    _avg: { rating: true },
    _count: { id: true },
  });
  return {
    average: agg._avg.rating ?? 0,
    count: agg._count.id,
  };
}

export async function listBuilderReviews(
  builderId: number,
  take = 50
): Promise<BuilderReviewItem[]> {
  if (!isDatabaseEnabled()) return [];
  const projectIds = await liveProjectIdsForBuilder(builderId);
  if (!projectIds.length) return [];

  const rows = await prisma.review.findMany({
    where: { projectId: { in: projectIds }, ...approvedReviewWhere },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      project: { select: { name: true, slug: true } },
    },
  });
  const names = await reviewAuthorNames(rows.map((r) => r.userId));

  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    userId: r.userId,
    rating: r.rating,
    comment: r.comment,
    authorName: names.get(r.userId) ?? null,
    createdAt: r.createdAt,
    projectName: r.project.name,
    projectSlug: r.project.slug,
  }));
}

export async function getBuilderRatingStats(builderId: number): Promise<{
  average: number;
  count: number;
}> {
  if (!isDatabaseEnabled()) return { average: 0, count: 0 };
  const projectIds = await liveProjectIdsForBuilder(builderId);
  if (!projectIds.length) return { average: 0, count: 0 };

  const agg = await prisma.review.aggregate({
    where: { projectId: { in: projectIds }, ...approvedReviewWhere },
    _avg: { rating: true },
    _count: { id: true },
  });
  return {
    average: agg._avg.rating ?? 0,
    count: agg._count.id,
  };
}

export async function getBuilderRatingDistribution(
  builderId: number
): Promise<BuilderRatingDistribution> {
  if (!isDatabaseEnabled()) return { ...EMPTY_BUILDER_RATING_DISTRIBUTION };

  const projectIds = await liveProjectIdsForBuilder(builderId);
  if (!projectIds.length) return { ...EMPTY_BUILDER_RATING_DISTRIBUTION };

  const rows = await prisma.review.groupBy({
    by: ["rating"],
    where: {
      projectId: { in: projectIds },
      rating: { gte: 1, lte: 5 },
      ...approvedReviewWhere,
    },
    _count: { id: true },
  });

  const out = { ...EMPTY_BUILDER_RATING_DISTRIBUTION };
  for (const row of rows) {
    const key = row.rating as 1 | 2 | 3 | 4 | 5;
    if (key >= 1 && key <= 5) out[key] = row._count.id;
  }
  return out;
}