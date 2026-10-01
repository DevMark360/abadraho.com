import { NextRequest, NextResponse } from "next/server";
import { requireAdminReviewAccess } from "@/lib/admin-api-guard";
import { isReviewStatus } from "@/lib/review-status";
import {
  deleteAdminReview,
  getAdminReview,
  updateAdminReview,
} from "@/server/services/admin-review.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviewId = Number(id);
  const auth = await requireAdminReviewAccess(reviewId);
  if (auth instanceof NextResponse) return auth;

  const result = await getAdminReview(reviewId);
  if (!result.review) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, review: result.review });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviewId = Number(id);
  const auth = await requireAdminReviewAccess(reviewId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const statusRaw = body.status != null ? String(body.status) : undefined;
  const result = await updateAdminReview(reviewId, {
    rating: body.rating != null ? Number(body.rating) : undefined,
    comment: body.comment != null ? String(body.comment) : undefined,
    status: statusRaw && isReviewStatus(statusRaw) ? statusRaw : undefined,
  });
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: 422 });
  }
  const updated = await getAdminReview(reviewId);
  return NextResponse.json({ success: true, review: updated.review });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviewId = Number(id);
  const auth = await requireAdminReviewAccess(reviewId, "delete");
  if (auth instanceof NextResponse) return auth;

  await deleteAdminReview(reviewId);
  return NextResponse.json({ success: true });
}
