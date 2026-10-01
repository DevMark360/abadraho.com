import { NextRequest, NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import { resolveRequestSiteUrl } from "@/lib/app-url";
import { shareBrokerWhatsappCard } from "@/server/services/broker-marketing.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const cardId = Number(id);
  if (!cardId || Number.isNaN(cardId)) {
    return NextResponse.json(
      { success: false, message: "Invalid card id", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const result = await shareBrokerWhatsappCard(
    auth.broker.id,
    cardId,
    resolveRequestSiteUrl(request)
  );
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}
