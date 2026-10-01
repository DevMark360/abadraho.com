import { NextRequest, NextResponse } from "next/server";
import { adminDelete, adminGet, adminUpdate } from "@/server/services/admin-crud.service";
import { requireAdminResource } from "@/lib/admin-api-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const auth = await requireAdminResource(resource, "view");
  if (auth instanceof NextResponse) return auth;
  const result = await adminGet(resource, Number(id));
  if (result.error || !result.item) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, item: result.item });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const auth = await requireAdminResource(resource, "edit");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const result = await adminUpdate(resource, Number(id), body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, item: result.item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const auth = await requireAdminResource(resource, "delete");
  if (auth instanceof NextResponse) return auth;
  const result = await adminDelete(resource, Number(id));
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
