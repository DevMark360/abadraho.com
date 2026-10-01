import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { redeemProjectVoucher } from "@/server/services/public-voucher.service";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { project_id?: number };
  const projectId = Number(body.project_id);
  if (!projectId || Number.isNaN(projectId)) {
    return NextResponse.json(
      { success: false, message: "project_id is required" },
      { status: 400 }
    );
  }

  const session = await getSession();
  const result = await redeemProjectVoucher(projectId, session);

  if (!result.success) {
    const status = result.requiresAuth ? 401 : 404;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
