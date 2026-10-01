import { NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import {
  loadAdCampaignFormOptions,
  AD_PLACEMENT_TYPES,
} from "@/server/services/advertising-campaign.service";

export async function GET() {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const options = await loadAdCampaignFormOptions(auth.builderId);
  return NextResponse.json({ success: true, ...options, placementTypes: AD_PLACEMENT_TYPES });
}
