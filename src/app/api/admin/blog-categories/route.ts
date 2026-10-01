import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  listAdminBlogCategoriesTable,
  saveBlogCategory,
} from "@/server/services/admin-blog.service";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await listAdminBlogCategoriesTable();
  return NextResponse.json({
    success: !result.error,
    items: result.items,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await saveBlogCategory(null, String(body.title ?? ""));
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
