import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addWishlist } from "@/server/services/wishlist.service";
import { siteConfig } from "@/config/site";

/** Legacy: GET /add-wishlist/{id} */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const base = process.env.AUTH_URL ?? siteConfig.url;
  const ref = request.nextUrl.searchParams.get("ref") ?? "/account/wishlist";

  const session = await getSession();
  if (!session) {
    const login = new URL("/login", base);
    login.searchParams.set("ref", `/add-wishlist/${id}`);
    return NextResponse.redirect(login);
  }

  if (projectId) {
    try {
      await addWishlist(session.id, projectId);
    } catch {
      /* table may be missing on old dumps */
    }
  }

  return NextResponse.redirect(new URL(ref.startsWith("/") ? ref : "/account/wishlist", base));
}
