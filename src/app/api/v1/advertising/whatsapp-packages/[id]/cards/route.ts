import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { resolveRequestSiteUrl } from "@/lib/app-url";
import {
  generateAdWhatsappCard,
  listAdWhatsappCardsForPackage,
} from "@/server/services/advertising-whatsapp.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const packageId = Number(id);
  if (!Number.isFinite(packageId) || packageId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid package id" }, { status: 400 });
  }

  const cards = await listAdWhatsappCardsForPackage(auth.builderId, packageId);
  if (cards === null) {
    return NextResponse.json({ success: false, message: "Package not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, cards });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const packageId = Number(id);
  if (!Number.isFinite(packageId) || packageId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid package id" }, { status: 400 });
  }

  const siteUrl = resolveRequestSiteUrl(request);
  const result = await generateAdWhatsappCard(auth.builderId, packageId, siteUrl);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
