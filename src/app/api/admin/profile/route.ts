import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  getAdminSession,
  serializeAdminSessionCookie,
} from "@/lib/admin-session";
import {
  getAdminProfile,
  parseProfileUpdatePayload,
  updateAdminProfile,
} from "@/server/services/admin-profile.service";

function profileResponse(
  result: Awaited<ReturnType<typeof updateAdminProfile>>,
  init?: { status?: number }
) {
  const res = NextResponse.json(
    {
      status: result.success,
      success: result.success,
      message: result.message,
      profile: result.profile,
    },
    { status: init?.status ?? (result.success ? 200 : 422) }
  );
  if (result.success && result.session) {
    res.cookies.set(
      ADMIN_COOKIE,
      serializeAdminSessionCookie(result.session),
      adminSessionCookieOptions()
    );
  }
  return res;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const result = await getAdminProfile(session);
  if (!result.profile) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, profile: result.profile });
}

async function handleUpdate(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { status: false, success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const payload =
    contentType.includes("multipart/form-data")
      ? parseProfileUpdatePayload(await request.formData())
      : parseProfileUpdatePayload((await request.json()) as Record<string, unknown>);

  const result = await updateAdminProfile(session, payload);
  return profileResponse(result);
}

/** Legacy: POST /my-admin-profile-update */
export async function POST(request: NextRequest) {
  return handleUpdate(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}
