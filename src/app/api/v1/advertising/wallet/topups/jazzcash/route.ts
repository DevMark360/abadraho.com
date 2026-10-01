import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { initiateJazzCashTopup } from "@/server/services/advertising-payment-jazzcash.service";
import { resolveRequestSiteUrl } from "@/lib/app-url";

export async function POST(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { amount?: number };
  const result = await initiateJazzCashTopup(
    auth.builderId,
    Number(body.amount),
    resolveRequestSiteUrl(request)
  );
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, actionUrl: result.actionUrl, fields: result.fields });
}
