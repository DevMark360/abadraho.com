import { NextResponse } from "next/server";
import { userTypeIds } from "@/config/site";
import { getSession, type SessionUser } from "@/lib/session";
import { roleFromUserTypeId } from "@/lib/roles";
import { findUserById } from "@/server/services/auth.service";
import {
  resolveBrokerForAgentUser,
  type BrokerProfile,
} from "@/server/services/broker-portal.service";

/** Session cookie may omit userTypeId (older logins) — confirm against DB. */
async function ensureAgentSession(
  session: SessionUser
): Promise<SessionUser | null> {
  if (session.userTypeId === userTypeIds.agent || session.role === "broker") {
    return session;
  }
  const row = await findUserById(session.id);
  if (!row || row.userTypeId !== userTypeIds.agent) {
    return null;
  }
  return {
    ...session,
    userTypeId: row.userTypeId,
    role: roleFromUserTypeId(row.userTypeId),
  };
}

export async function requireBrokerApi(): Promise<
  | { userId: number; broker: BrokerProfile; session: SessionUser }
  | NextResponse
> {
  const raw = await getSession();
  if (!raw?.id) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const session = await ensureAgentSession(raw);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Agent account required", code: "NOT_AGENT" },
      { status: 403 }
    );
  }

  const broker = await resolveBrokerForAgentUser(session.id);
  if (!broker) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load or create your broker profile. Check database connection (USE_DATABASE=true).",
        code: "NO_BROKER_PROFILE",
      },
      { status: 404 }
    );
  }

  return { userId: session.id, broker, session };
}
