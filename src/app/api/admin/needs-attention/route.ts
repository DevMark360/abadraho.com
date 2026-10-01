import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { getAttentionItems } from "@/server/services/admin-attention.service";

export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const items = await getAttentionItems();
  return NextResponse.json({ success: true, items });
}
