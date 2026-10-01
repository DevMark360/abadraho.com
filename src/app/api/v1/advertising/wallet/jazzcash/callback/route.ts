import { NextRequest, NextResponse } from "next/server";
import { handleJazzCashCallback } from "@/server/services/advertising-payment-jazzcash.service";
import { resolveRequestSiteUrl } from "@/lib/app-url";

/**
 * JazzCash's Hosted Checkout redirects the customer's browser here via an HTTP POST once
 * payment completes (see advertising-payment-jazzcash.service.ts header comment) — there is no
 * builder session/CSRF token on this request, and pp_SecureHash verification is what protects
 * it from forged/tampered callbacks instead (see src/lib/csrf-edge.ts for the CSRF exemption).
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const fields: Record<string, string> = {};
  if (formData) {
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") fields[key] = value;
    }
  }

  const result = await handleJazzCashCallback(fields);

  const redirectUrl = new URL("/advertising/wallet", resolveRequestSiteUrl(request));
  if (!result.success) {
    redirectUrl.searchParams.set("jazzcash", "error");
    redirectUrl.searchParams.set("message", result.error);
  } else {
    redirectUrl.searchParams.set("jazzcash", result.status);
  }
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
