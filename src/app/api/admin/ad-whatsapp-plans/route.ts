import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { createWhatsappPlan, listWhatsappPlans } from "@/server/services/advertising-whatsapp.service";

/** Admin catalog of WhatsApp ad card packages (all, including inactive). */
export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const { plans, managed } = await listWhatsappPlans();
  return NextResponse.json({ success: true, plans, managed });
}

export async function POST(request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const result = await createWhatsappPlan(body);
  if (!result.success) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  return NextResponse.json({ success: true, id: result.id });
}
