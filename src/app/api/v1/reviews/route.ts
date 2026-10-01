import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addProjectReview, listProjectReviews } from "@/server/services/review.service";

export async function GET(request: NextRequest) {
  const projectId = Number(request.nextUrl.searchParams.get("projectId"));
  if (!projectId) {
    return NextResponse.json({ success: false, message: "projectId required" }, { status: 400 });
  }
  const reviews = await listProjectReviews(projectId);
  return NextResponse.json({ success: true, reviews });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in to leave a review" }, { status: 401 });
  }

  const body = await request.json();
  const projectId = Number(body.project_id ?? body.projectId);
  const rating = Number(body.product_rating ?? body.rating);
  const comment = String(body.review ?? body.comment ?? "");

  if (!projectId || !rating) {
    return NextResponse.json({ success: false, message: "projectId and rating required" }, { status: 422 });
  }

  const result = await addProjectReview(session.id, projectId, rating, comment);
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
