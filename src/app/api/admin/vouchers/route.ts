import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { isBuilderSession } from "@/lib/admin-rbac";
import {
  builderOwnsProject,
  builderProjectIdsForSession,
} from "@/lib/admin-builder-ownership";
import {
  createVoucher,
  listVouchers,
  loadVoucherFormProjects,
} from "@/server/services/admin-voucher.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const filters: {
    page?: number;
    perPage?: number;
    q?: string;
    builderProjectIds?: number[];
  } = {
    page: Number(sp.get("page") ?? 1),
    perPage: Number(sp.get("perPage") ?? 50),
    q: sp.get("q") ?? undefined,
  };

  const builderScope = await builderProjectIdsForSession(session);
  if (builderScope !== undefined) {
    filters.builderProjectIds = builderScope;
  }

  const excludeVoucherId = Number(sp.get("excludeVoucherId") ?? 0) || undefined;

  const [result, projects] = await Promise.all([
    listVouchers(filters),
    loadVoucherFormProjects(
      isBuilderSession(session) ? session.id : undefined,
      excludeVoucherId
    ),
  ]);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    projects,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const projectId = Number(body.projectId);
  if (!projectId) {
    return NextResponse.json({ success: false, message: "Project is required" }, { status: 400 });
  }

  if (isBuilderSession(session) && !(await builderOwnsProject(session, projectId))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const result = await createVoucher({
    projectId,
    name: String(body.name ?? "").trim(),
    discountBy: body.discountBy === "percentage" ? "percentage" : "amount",
    discountApplied: body.discountApplied === "unit" ? "unit" : "project",
    discountValue: String(body.discountValue ?? ""),
    status: Number(body.status ?? 1),
    expiresAt: String(body.expiresAt ?? ""),
    unitIds: Array.isArray(body.unitIds)
      ? body.unitIds.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: result.id, code: result.code });
}
