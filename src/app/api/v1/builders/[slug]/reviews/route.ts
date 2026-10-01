import { NextRequest, NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/db";
import { normalizeBuilderRatingDistribution } from "@/lib/builder-rating";
import { resolveBuilderIdBySlug } from "@/server/services/builder-page.service";
import {
  getBuilderRatingDistribution,
  getBuilderRatingStats,
  listBuilderReviews,
} from "@/server/services/review.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ success: true, reviews: [], ratingAverage: 0, ratingCount: 0 });
  }

  const builderId = await resolveBuilderIdBySlug(slug);
  if (!builderId) {
    return NextResponse.json({ success: false, message: "Builder not found" }, { status: 404 });
  }

  const [reviews, stats, distribution] = await Promise.all([
    listBuilderReviews(builderId),
    getBuilderRatingStats(builderId),
    getBuilderRatingDistribution(builderId),
  ]);

  return NextResponse.json({
    success: true,
    reviews: reviews.map((review) => ({
      ...review,
      createdAt: review.createdAt?.toISOString() ?? null,
    })),
    ratingAverage: stats.average,
    ratingCount: stats.count,
    ratingDistribution: normalizeBuilderRatingDistribution(distribution),
  });
}
