import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { readWalletProof, walletProofResponse } from "@/server/services/wallet-proof.service";

/** Payment screenshot attached to a manual top-up, for the admin reviewing it. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const proof = await readWalletProof(id);
  if (!proof) {
    return NextResponse.json({ success: false, message: "No screenshot for this transaction" }, { status: 404 });
  }
  return walletProofResponse(proof);
}
