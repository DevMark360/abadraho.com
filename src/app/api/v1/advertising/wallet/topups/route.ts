import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { submitAdWalletTopUp } from "@/server/services/advertising-wallet.service";

export async function POST(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    referenceNote?: string;
  };

  const result = await submitAdWalletTopUp(auth.builderId, {
    amount: Number(body.amount),
    referenceNote: body.referenceNote ?? "",
  });
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, transaction: result.transaction });
}
