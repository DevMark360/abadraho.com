import { userTypeIds } from "@/config/site";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin-session-cookie";
import { clearOrphanedStaffRoleId } from "@/lib/staff-rbac";

const PANEL_USER_TYPES = new Set<number>([
  userTypeIds.superAdmin,
  userTypeIds.admin,
  userTypeIds.builder,
]);

function isBlockedFromAdminLogin(userTypeId: number): boolean {
  return (
    userTypeId === userTypeIds.websiteUser ||
    userTypeId === userTypeIds.buyer ||
    userTypeId === userTypeIds.agent ||
    userTypeId === userTypeIds.employee
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function adminSessionFromAdminRow(admin: {
  id: number;
  email: string;
  name: string | null;
  staffRoleId?: number | null;
  staffRole?: { isSuperAdmin: boolean } | null;
}): AdminSession {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    source: "admin",
    userTypeId: userTypeIds.admin,
    staffRoleId: admin.staffRoleId ?? null,
    isSuperAdminRole: admin.staffRole?.isSuperAdmin ?? false,
  };
}

export function adminSessionFromUserRow(user: {
  id: number;
  email: string | null;
  firstName: string;
  lastName: string | null;
  userTypeId: number | null;
  staffRoleId?: number | null;
  staffRole?: { isSuperAdmin: boolean } | null;
}): AdminSession | null {
  if (user.userTypeId == null || isBlockedFromAdminLogin(user.userTypeId)) {
    return null;
  }
  if (!PANEL_USER_TYPES.has(user.userTypeId)) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    email: user.email ?? "",
    name: name || null,
    source: "user",
    userTypeId: user.userTypeId,
    staffRoleId: user.staffRoleId ?? null,
    isSuperAdminRole: user.staffRole?.isSuperAdmin ?? false,
  };
}

/**
 * Revalidate a signed cookie session against `admins` / `users`.
 * Never trust `source` or `userTypeId` from the cookie alone.
 */
export async function revalidateAdminSession(
  cookieSession: AdminSession
): Promise<AdminSession | null> {
  if (!isDatabaseEnabled()) return null;

  const normalizedEmail = normalizeEmail(cookieSession.email);

  try {
    if (cookieSession.source === "admin") {
      const admin = await prisma.admin.findUnique({
        where: { id: cookieSession.id },
        include: { staffRole: { select: { isSuperAdmin: true } } },
      });
      if (!admin || normalizeEmail(admin.email) !== normalizedEmail) return null;
      const session = adminSessionFromAdminRow(admin);
      await clearOrphanedStaffRoleId(session);
      return session;
    }

    if (cookieSession.source === "user") {
      const user = await prisma.user.findFirst({
        where: { id: cookieSession.id, isArchive: false },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          userTypeId: true,
          staffRoleId: true,
          staffRole: { select: { isSuperAdmin: true } },
        },
      });
      if (!user?.email || normalizeEmail(user.email) !== normalizedEmail) return null;
      const session = adminSessionFromUserRow(user);
      if (!session) return null;
      await clearOrphanedStaffRoleId(session);
      return session;
    }

    const admin = await prisma.admin.findUnique({
      where: { id: cookieSession.id },
      include: { staffRole: { select: { isSuperAdmin: true } } },
    });
    if (admin && normalizeEmail(admin.email) === normalizedEmail) {
      const session = adminSessionFromAdminRow(admin);
      await clearOrphanedStaffRoleId(session);
      return session;
    }

    const user = await prisma.user.findFirst({
      where: { id: cookieSession.id, isArchive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userTypeId: true,
        staffRoleId: true,
        staffRole: { select: { isSuperAdmin: true } },
      },
    });
    if (!user?.email || normalizeEmail(user.email) !== normalizedEmail) return null;
    const session = adminSessionFromUserRow(user);
    if (!session) return null;
    await clearOrphanedStaffRoleId(session);
    return session;
  } catch {
    return null;
  }
}
