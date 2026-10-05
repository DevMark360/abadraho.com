import { NextResponse } from "next/server";
import { userTypeIds } from "@/config/site";
import { getSession, type SessionUser } from "@/lib/session";
import { roleFromUserTypeId } from "@/lib/roles";
import { findUserById } from "@/server/services/auth.service";
import { resolveBuilderIdForUser } from "@/lib/admin-builder-ownership";

/** Session cookie may omit userTypeId (older logins) — confirm against DB. */
async function ensureBuilderSession(session: SessionUser): Promise<SessionUser | null> {
  if (session.userTypeId === userTypeIds.builder) {
    return session;
  }
  const row = await findUserById(session.id);
  if (!row || row.userTypeId !== userTypeIds.builder) {
    return null;
  }
  return {
    ...session,
    userTypeId: row.userTypeId,
    role: roleFromUserTypeId(row.userTypeId),
  };
}

export async function requireAdvertisingApi(): Promise<
  | { userId: number; builderId: number; session: SessionUser }
  | NextResponse
> {
  const raw = await getSession();
  if (!raw?.id) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const session = await ensureBuilderSession(raw);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Builder account required", code: "NOT_BUILDER" },
      { status: 403 }
    );
  }

  const builderId = await resolveBuilderIdForUser(session.id);
  if (!builderId) {
    return NextResponse.json(
      {
        success: false,
        message: "Builder profile missing. Contact admin to link your account.",
        code: "NO_BUILDER_PROFILE",
      },
      { status: 404 }
    );
  }

  return { userId: session.id, builderId, session };
}
