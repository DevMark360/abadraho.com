import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  listAdminBuilders,
  loadBuilderUserOptions,
  saveAdminBuilder,
} from "@/server/services/admin-builder.service";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await listAdminBuilders();
  const builderUsers = await loadBuilderUserOptions();

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    builderUsers,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await saveAdminBuilder(null, body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.builder?.id });
}
