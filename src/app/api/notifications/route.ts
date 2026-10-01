import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseAdminSessionCookie, type AdminSession } from "@/lib/admin-session-cookie";
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationsRead,
} from "@/server/services/notification.service";

export const dynamic = "force-dynamic";

/** Direct recipient resolution — no Prisma revalidation, just cookie parse. */
async function getRecipient() {
  const jar = await cookies();

  // 1. Try admin session cookie (most common for admin bell). Builders log
  // into this same admin-session system with a restricted role — must not
  // treat them as the site admin (recipient_id=0 broadcasts belong to real staff only).
  const adminRaw = jar.get("abadraho_admin_session")?.value;
  if (adminRaw) {
    try {
      const parsed = await parseAdminSessionCookie(adminRaw);
      if (parsed?.id) {
        const { isBuilderSession } = await import("@/lib/admin-rbac");
        if (isBuilderSession(parsed)) {
          const { resolveBuilderIdForUser } = await import("@/lib/admin-builder-ownership");
          const builderId = await resolveBuilderIdForUser(parsed.id);
          if (builderId) return { type: "builder" as const, id: builderId };
        } else {
          return { type: "admin" as const, id: parsed.id };
        }
      }
    } catch {
      // Cookie invalid — fall through
    }
  }

  // 2. Try user session cookie (broker/builder/user)
  try {
    const { parseSessionCookie, USER_COOKIE } = await import("@/lib/session-cookie");
    const { roleFromUserTypeId } = await import("@/lib/roles");
    const userRaw = jar.get(USER_COOKIE)?.value;
    if (userRaw) {
      const parsed = await parseSessionCookie(userRaw);
      if (parsed?.id) {
        const role = roleFromUserTypeId(parsed.userTypeId);
        if (role === "broker") {
          const { queryRaw } = await import("@/lib/prisma-raw");
          const rows = await queryRaw<{ id: number }[]>(
            `SELECT id FROM brokers WHERE user_id = ? AND is_archive = 0 LIMIT 1`,
            parsed.id
          );
          if (rows[0]) return { type: "broker" as const, id: Number(rows[0].id) };
        }
        if (role === "builder") {
          const { resolveBuilderIdForUser } = await import("@/lib/admin-builder-ownership");
          const builderId = await resolveBuilderIdForUser(parsed.id);
          if (builderId) return { type: "builder" as const, id: builderId };
        }
        return { type: "user" as const, id: parsed.id };
      }
    }
  } catch {
    // Fall through
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const recipient = await getRecipient();
    if (!recipient) {
      return NextResponse.json({ success: true, items: [], unreadCount: 0 });
    }

    const sp = req.nextUrl.searchParams;
    const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined;

    const [items, unreadCount] = await Promise.all([
      listNotifications(recipient.type, recipient.id, { limit }),
      countUnreadNotifications(recipient.type, recipient.id),
    ]);

    return NextResponse.json({ success: true, items, unreadCount });
  } catch (e) {
    console.error("[notifications] GET error:", e);
    return NextResponse.json({ success: true, items: [], unreadCount: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const recipient = await getRecipient();
    if (!recipient) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (body.all === true || body.all === "true") {
      await markNotificationsRead(recipient.type, recipient.id, { all: true });
    } else if (body.id != null) {
      await markNotificationsRead(recipient.type, recipient.id, { id: Number(body.id) });
    } else {
      return NextResponse.json(
        { success: false, message: "Provide {all:true} or {id}" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[notifications] POST error:", e);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
