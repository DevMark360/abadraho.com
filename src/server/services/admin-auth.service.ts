import { userTypeIds } from "@/config/site";
import { isBlockedFromAdminLogin } from "@/lib/admin-rbac";
import {
  adminSessionFromAdminRow,
  adminSessionFromUserRow,
} from "@/lib/verify-admin-session";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import type { AdminSession } from "@/lib/admin-session";
import {
  type AuthAttemptResult,
  LOGIN_FAILURE,
} from "@/lib/auth-errors";

/** Legacy: Super Admin + Admin only (not Employee). */
const STAFF_USER_TYPES = new Set<number>([
  userTypeIds.superAdmin,
  userTypeIds.admin,
]);

/** Legacy: builders use admin panel with a reduced menu */
const BUILDER_USER_TYPE = userTypeIds.builder;

export async function authenticateAdminAttempt(
  email: string,
  password: string
): Promise<AuthAttemptResult<AdminSession>> {
  if (!isDatabaseEnabled()) {
    return { ok: false, reason: LOGIN_FAILURE.EMAIL_NOT_FOUND };
  }
  const normalized = email.trim().toLowerCase();
  try {
    const admin = await prisma.admin.findFirst({
      where: { email: { equals: normalized } },
    });
    if (admin) {
      if (!admin.password) {
        return { ok: false, reason: LOGIN_FAILURE.OAUTH_ONLY };
      }
      if (!(await verifyPassword(password, admin.password))) {
        return { ok: false, reason: LOGIN_FAILURE.WRONG_PASSWORD };
      }
      return { ok: true, value: adminSessionFromAdminRow(admin) };
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalized },
        isArchive: false,
      },
    });
    if (!user) {
      return { ok: false, reason: LOGIN_FAILURE.EMAIL_NOT_FOUND };
    }

    const isStaff = user.userTypeId != null && STAFF_USER_TYPES.has(user.userTypeId);
    const isBuilder = user.userTypeId === BUILDER_USER_TYPE;
    if (!isStaff && !isBuilder) {
      return { ok: false, reason: LOGIN_FAILURE.NO_WORKSPACE_ACCESS };
    }
    if (user.userTypeId == null || isBlockedFromAdminLogin(user.userTypeId)) {
      return { ok: false, reason: LOGIN_FAILURE.NO_WORKSPACE_ACCESS };
    }
    if (!user.password) {
      return {
        ok: false,
        reason: LOGIN_FAILURE.OAUTH_ONLY,
        provider: user.provider,
      };
    }
    if (!(await verifyPassword(password, user.password))) {
      return { ok: false, reason: LOGIN_FAILURE.WRONG_PASSWORD };
    }
    const session = adminSessionFromUserRow(user);
    if (!session) {
      return { ok: false, reason: LOGIN_FAILURE.NO_WORKSPACE_ACCESS };
    }
    return { ok: true, value: session };
  } catch {
    return { ok: false, reason: LOGIN_FAILURE.EMAIL_NOT_FOUND };
  }
}

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AdminSession | null> {
  const result = await authenticateAdminAttempt(email, password);
  return result.ok ? result.value : null;
}

export async function getAdminById(id: number): Promise<AdminSession | null> {
  if (!isDatabaseEnabled()) return null;
  try {
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return null;
    return { id: admin.id, email: admin.email, name: admin.name };
  } catch {
    return null;
  }
}
