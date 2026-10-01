import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { syncWishlistFromLocal } from "@/server/services/wishlist.service";

/** Merge localStorage wishlist ids into DB after login */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const body = await request.json();
  const projectIds = Array.isArray(body.projectIds)
    ? body.projectIds.map(Number).filter((n: number) => !Number.isNaN(n) && n > 0)
    : [];

  const added = await syncWishlistFromLocal(session.id, projectIds);
  return NextResponse.json({ success: true, added });
}
