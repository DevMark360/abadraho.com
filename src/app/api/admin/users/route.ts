import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  listAdminUsers,
  loadUserTypesForAdmin,
  saveAdminUser,
} from "@/server/services/admin-user.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const typeParam = sp.get("types");
    const [result, userTypes] = await Promise.all([
      listAdminUsers({
        page: Number(sp.get("page") ?? 1) || 1,
        perPage: Number(sp.get("perPage") ?? 50) || 50,
        userName: sp.get("userName") ?? undefined,
        userEmail: sp.get("userEmail") ?? undefined,
        userTypeIds: typeParam
          ? typeParam.split(",").map(Number).filter((n) => Number.isFinite(n))
          : undefined,
      }),
      loadUserTypesForAdmin(),
    ]);

    return NextResponse.json({
      success: !result.error,
      items: result.items,
      total: result.total,
      userTypes,
      error: result.error,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        items: [],
        total: 0,
        userTypes: [],
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await saveAdminUser(null, body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.user?.id });
}
