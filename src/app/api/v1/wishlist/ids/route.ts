import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserWishlistProjectIds } from "@/server/services/wishlist.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, projectIds: [] }, { status: 401 });
  }
  const projectIds = await getUserWishlistProjectIds(session.id);
  return NextResponse.json({ success: true, projectIds });
}
