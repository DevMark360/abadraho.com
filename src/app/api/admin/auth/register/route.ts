import { NextRequest, NextResponse } from "next/server";
import {
  isAdminRegisterEnabled,
  registerAdminAccount,
} from "@/server/services/admin-register.service";

export async function GET() {
  return NextResponse.json({ enabled: isAdminRegisterEnabled() });
}

/** Legacy POST /admin/register */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await registerAdminAccount({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  });
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
