import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { listAdminProgress, saveAdminProgress } from "@/server/services/admin-progress.service";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const result = await listAdminProgress();
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
  const result = await saveAdminProgress(null, {
    name: String(body.name ?? body.progress_status_name ?? ""),
    isActive: body.isActive === true || body.isActive === 1 || body.isActive === "1",
  });

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
