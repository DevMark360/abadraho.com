import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import {
  getAdWalletBalance,
  listAdWalletTransactions,
} from "@/server/services/advertising-wallet.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const [wallet, transactions] = await Promise.all([
    getAdWalletBalance(auth.builderId),
    listAdWalletTransactions(auth.builderId, { page, pageSize }),
  ]);

  if (!wallet) {
    return NextResponse.json({ success: false, message: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, wallet, transactions });
}
