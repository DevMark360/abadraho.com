import { NextRequest, NextResponse } from "next/server";
import { adminCreate, adminList } from "@/server/services/admin-crud.service";
import { getResourceById } from "@/config/admin-resources";
import { requireAdminResource } from "@/lib/admin-api-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const auth = await requireAdminResource(resource, "view");
  if (auth instanceof NextResponse) return auth;
  const def = getResourceById(resource);
  if (!def) {
    return NextResponse.json({ success: false, message: "Unknown resource" }, { status: 404 });
  }
  const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const result = await adminList(resource, page, 25, q);
  return NextResponse.json({
    success: !result.error,
    ...result,
    resource: def,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const auth = await requireAdminResource(resource, "add");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const result = await adminCreate(resource, body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, item: result.item });
}
