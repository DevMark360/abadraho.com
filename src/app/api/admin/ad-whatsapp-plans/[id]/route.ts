import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { deleteWhatsappPlan, updateWhatsappPlan } from "@/server/services/advertising-whatsapp.service";

function planId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const id = planId((await params).id);
  if (!id) return NextResponse.json({ success: false, message: "Invalid package" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const result = await updateWhatsappPlan(id, body);
  if (!result.success) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const id = planId((await params).id);
  if (!id) return NextResponse.json({ success: false, message: "Invalid package" }, { status: 400 });
  const result = await deleteWhatsappPlan(id);
  if (!result.success) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
