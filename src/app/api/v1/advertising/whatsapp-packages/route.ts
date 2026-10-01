import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import {
  AD_WHATSAPP_PACKAGES,
  listAdWhatsappPackagesForBuilder,
  purchaseAdWhatsappPackage,
} from "@/server/services/advertising-whatsapp.service";

export async function GET() {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const packages = await listAdWhatsappPackagesForBuilder(auth.builderId);
  return NextResponse.json({ success: true, packages, catalog: AD_WHATSAPP_PACKAGES });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { projectId?: number; cards?: number };
  const result = await purchaseAdWhatsappPackage(auth.builderId, {
    projectId: Number(body.projectId),
    cards: Number(body.cards),
  });
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, package: result.package });
}
