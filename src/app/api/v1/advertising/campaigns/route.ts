import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import {
  createDraftAdCampaign,
  listAdCampaignsForBuilder,
  type CreateAdCampaignInput,
} from "@/server/services/advertising-campaign.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const result = await listAdCampaignsForBuilder(auth.builderId, { page, pageSize });
  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as CreateAdCampaignInput;
  const result = await createDraftAdCampaign(auth.builderId, body);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, campaign: result.campaign });
}
