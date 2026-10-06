import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import {
  listAdWhatsappPackagesForBuilder,
  listWhatsappPlans,
  purchaseAdWhatsappPackage,
} from "@/server/services/advertising-whatsapp.service";

export async function GET() {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const [packages, { plans }] = await Promise.all([
    listAdWhatsappPackagesForBuilder(auth.builderId),
    listWhatsappPlans({ activeOnly: true }),
  ]);
  return NextResponse.json({ success: true, packages, catalog: plans });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as {
    projectId?: number;
    planId?: number;
    cards?: number;
  };
  const result = await purchaseAdWhatsappPackage(auth.builderId, {
    projectId: Number(body.projectId),
    planId: body.planId != null ? Number(body.planId) : undefined,
    cards: body.cards != null ? Number(body.cards) : undefined,
  });
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, package: result.package });
}
