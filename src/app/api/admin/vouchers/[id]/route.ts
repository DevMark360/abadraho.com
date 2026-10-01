import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { isBuilderSession } from "@/lib/admin-rbac";
import { builderOwnsProject } from "@/lib/admin-builder-ownership";
import {
  deleteVoucher,
  getVoucherById,
  updateVoucher,
} from "@/server/services/admin-voucher.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const result = await getVoucherById(id);
  if (!result.item) {
    return NextResponse.json({ success: false, message: result.error ?? "Not found" }, { status: 404 });
  }

  if (
    isBuilderSession(session) &&
    result.item.projectId &&
    !(await builderOwnsProject(session, result.item.projectId))
  ) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, item: result.item });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await getVoucherById(id);
  if (!existing.item) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const projectId = Number(body.projectId);

  if (isBuilderSession(session) && !(await builderOwnsProject(session, projectId))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const result = await updateVoucher(id, {
    projectId,
    name: String(body.name ?? "").trim(),
    discountBy: body.discountBy === "percentage" ? "percentage" : "amount",
    discountApplied: body.discountApplied === "unit" ? "unit" : "project",
    discountValue: String(body.discountValue ?? ""),
    status: Number(body.status ?? 1),
    expiresAt: String(body.expiresAt ?? ""),
    unitIds: Array.isArray(body.unitIds)
      ? body.unitIds.map((uid: unknown) => Number(uid)).filter((uid: number) => uid > 0)
      : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await getVoucherById(id);
  if (!existing.item) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  if (
    isBuilderSession(session) &&
    existing.item.projectId &&
    !(await builderOwnsProject(session, existing.item.projectId))
  ) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await deleteVoucher(id);
  return NextResponse.json({ success: true, status: "Deleted Successfully" });
}
