import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  builderProjectIdsForSession,
  scopedProjectsWhere,
} from "@/lib/admin-builder-ownership";
import {
  listAdminReviews,
  type AdminReviewFilters,
} from "@/server/services/admin-review.service";
import { isReviewStatus, type ReviewStatus } from "@/lib/review-status";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? 1);
  const perPage = Number(sp.get("perPage") ?? 25);
  const filters: AdminReviewFilters = {
    page,
    perPage,
    name: sp.get("name") ?? undefined,
    email: sp.get("email") ?? undefined,
    phoneNumber: sp.get("phoneNumber") ?? undefined,
    projectIds: sp.get("projectIds")
      ? sp
          .get("projectIds")!
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((n) => n > 0)
      : undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    status:
      sp.get("status") && isReviewStatus(sp.get("status")!)
        ? (sp.get("status") as ReviewStatus)
        : undefined,
  };

  const builderScope = await builderProjectIdsForSession(session);
  if (builderScope !== undefined) {
    filters.builderProjectIds = builderScope;
  }

  const [result, projects] = await Promise.all([
    listAdminReviews(filters),
    prisma.project.findMany({
      where: scopedProjectsWhere(builderScope ?? null),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: builderScope === undefined ? 500 : undefined,
    }),
  ]);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    projects: projects.map((p) => ({ value: String(p.id), label: p.name })),
    error: result.error,
  });
}
