import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitAdWalletTopUp } from "@/server/services/advertising-wallet.service";
import { validateWalletProof } from "@/server/services/wallet-proof.service";

/** Manual top-up: multipart form with amount, transactionId, proof (screenshot), note. */
export async function POST(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  // Each submission stores a file — cap it so a script can't fill the disk.
  const limit = checkRateLimit(`wallet-topup:${auth.builderId}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, message: `Too many submissions. Try again in ${limit.retryAfterSec}s` },
      { status: 429 }
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { success: false, message: "Submit the form with the payment screenshot attached" },
      { status: 400 }
    );
  }

  const proofFile = form.get("proof");
  const proof = await validateWalletProof(proofFile instanceof File ? proofFile : null);
  if (!proof.ok) {
    return NextResponse.json({ success: false, message: proof.error }, { status: 400 });
  }

  const result = await submitAdWalletTopUp(auth.builderId, {
    amount: Number(form.get("amount")),
    transactionId: String(form.get("transactionId") ?? ""),
    referenceNote: String(form.get("referenceNote") ?? ""),
    proof: proof.proof,
  });
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, transaction: result.transaction });
}
