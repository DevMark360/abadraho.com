import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminProjectAccess,
  requireAdminUnitAccess,
} from "@/lib/admin-api-guard";
import { builderProjectIdsForSession } from "@/lib/admin-builder-ownership";
import { toJsonSafe } from "@/lib/prisma-json";
import {
  archiveAdminUnit,
  getAdminUnit,
  updateAdminUnit,
  loadUnitFormMeta,
} from "@/server/services/admin-unit.service";

type Ctx = { params: Promise<{ id: string }> };

function parsePayload(body: Record<string, unknown>) {
  return {
    projectId: Number(body.projectId),
    title: String(body.title ?? "").trim(),
    rooms: body.rooms != null ? String(body.rooms) : undefined,
    grossArea: body.grossArea != null ? Number(body.grossArea) : null,
    netArea: body.netArea != null ? Number(body.netArea) : null,
    measurementTypeId: body.measurementTypeId != null ? Number(body.measurementTypeId) : null,
    unitTypeId: Number(body.unitTypeId),
    price: Number(body.price ?? 0),
    loanAmount: body.loanAmount != null ? Number(body.loanAmount) : 0,
    downPayment: Number(body.downPayment ?? 0),
    monthlyInstallment: Number(body.monthlyInstallment ?? 0),
    installmentTypeId:
      body.installmentTypeId != null ? Number(body.installmentTypeId) : null,
    installmentLength:
      body.installmentLength != null ? Number(body.installmentLength) : null,
    description: body.description != null ? String(body.description) : undefined,
  };
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const auth = await requireAdminUnitAccess(id);
  if (auth instanceof NextResponse) return auth;

  try {
    const builderScoped = await builderProjectIdsForSession(auth.session);
    const [result, meta] = await Promise.all([
      getAdminUnit(id),
      loadUnitFormMeta({ projectIds: builderScoped }),
    ]);
    if (!result.unit) {
      return NextResponse.json(
        toJsonSafe({
          success: false,
          message: result.error ?? "Not found",
          ...meta,
        }),
        { status: 404 }
      );
    }

    return NextResponse.json(
      toJsonSafe({
        success: true,
        unit: result.unit,
        projectTypes: meta.projectTypes,
        roomTypes: meta.roomTypes,
        projects: meta.projects,
        measurements: meta.measurements,
        installmentTypes: meta.installmentTypes,
        metaError: "error" in meta ? meta.error : undefined,
      })
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Failed to load unit" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const auth = await requireAdminUnitAccess(id, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const payload = parsePayload(body);

  const projectAuth = await requireAdminProjectAccess(payload.projectId, "edit");
  if (projectAuth instanceof NextResponse) return projectAuth;

  const result = await updateAdminUnit(id, payload);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const auth = await requireAdminUnitAccess(id, "delete");
  if (auth instanceof NextResponse) return auth;

  await archiveAdminUnit(id);
  return NextResponse.json({ success: true, status: "Deleted Successfully" });
}
