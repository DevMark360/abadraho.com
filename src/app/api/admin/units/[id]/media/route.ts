import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import { uploadUnitPlanImages } from "@/server/services/admin-unit-upload.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const unitId = Number((await params).id);
  const auth = await requireAdminUnitAccess(unitId);
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();

  const result = await uploadUnitPlanImages(unitId, {
    floorPlan: form.get("floorPlan") instanceof File ? (form.get("floorPlan") as File) : null,
    paymentPlan:
      form.get("paymentPlan") instanceof File ? (form.get("paymentPlan") as File) : null,
    removeFloorPlan: form.get("removeFloorPlan") === "1",
    removePaymentPlan: form.get("removePaymentPlan") === "1",
  });

  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
