import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  addWishlist,
  getUserWishlist,
  removeWishlist,
} from "@/server/services/wishlist.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, projects: [] }, { status: 401 });
  }
  const projects = await getUserWishlist(session.id);
  return NextResponse.json({ success: true, projects });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }
  const { projectId } = await request.json();
  if (!projectId) {
    return NextResponse.json({ success: false, message: "projectId required" }, { status: 400 });
  }
  try {
    await addWishlist(session.id, Number(projectId));
    return NextResponse.json({
      success: true,
      status: "Project is Added to Wishlist",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Database unavailable, using local wishlist" },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
  try {
    await removeWishlist(session.id, Number(projectId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 503 });
  }
}
