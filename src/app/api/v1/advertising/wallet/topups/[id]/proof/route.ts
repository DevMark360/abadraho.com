import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { getBuilderTopUpProof } from "@/server/services/advertising-wallet.service";
import { walletProofResponse } from "@/server/services/wallet-proof.service";

/** The builder's own payment screenshot for one of their top-ups. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const proof = await getBuilderTopUpProof(auth.builderId, id);
  if (!proof) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  return walletProofResponse(proof);
}
