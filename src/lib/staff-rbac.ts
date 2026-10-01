import {
  ADMIN_NAV_HREF_PERMISSION,
  ADMIN_PATH_VIEW_PERMISSION,
  allPermissionKeys,
  isValidPermissionKey,
  permissionKey,
  type PermissionAction,
} from "@/config/admin-permissions";
import { userTypeIds } from "@/config/site";
import { isDatabaseEnabled } from "@/lib/db";
import type { AdminSession } from "@/lib/admin-session-cookie";
import { prisma } from "@/lib/prisma";

const permissionCache = new Map<number, Set<string>>();

export type RolePermissionLoad =
  | { status: "ok"; permissions: Set<string> }
  | { status: "missing" }
  | { status: "super" };

function legacyFullStaffAccess(session: AdminSession): boolean {
  return (
    session.userTypeId === userTypeIds.superAdmin ||
    session.userTypeId === userTypeIds.admin ||
    session.source === "admin"
  );
}

export async function clearOrphanedStaffRoleId(session: AdminSession): Promise<void> {
  if (!session.staffRoleId || !isDatabaseEnabled()) return;

  const exists = await prisma.staffRole.findUnique({
    where: { id: session.staffRoleId },
    select: { id: true },
  });
  if (exists) return;

  try {
    if (session.source === "admin") {
      await prisma.admin.update({
        where: { id: session.id },
        data: { staffRoleId: null },
      });
    } else {
      await prisma.user.update({
        where: { id: session.id },
        data: { staffRoleId: null },
      });
    }
    session.staffRoleId = null;
    clearStaffPermissionCache();
  } catch {
    /* best-effort recovery */
  }
}

export function clearStaffPermissionCache(roleId?: number) {
  if (roleId != null) permissionCache.delete(roleId);
  else permissionCache.clear();
}

export function isSuperAdminSession(session: AdminSession | null): boolean {
  if (!session) return false;
  if (session.userTypeId === userTypeIds.superAdmin) return true;
  return session.isSuperAdminRole === true;
}

/** When false, legacy full staff access applies (no role assigned). */
export function shouldEnforceStaffPermissions(session: AdminSession | null): boolean {
  if (!session || isSuperAdminSession(session)) return false;
  if (session.source === "admin" && session.staffRoleId == null) return false;
  if (session.source === "user" && session.userTypeId === userTypeIds.admin && session.staffRoleId == null) {
    return false;
  }
  return session.staffRoleId != null;
}

export async function loadRolePermissionSet(roleId: number): Promise<RolePermissionLoad> {
  const cached = permissionCache.get(roleId);
  if (cached) return { status: "ok", permissions: cached };

  if (!isDatabaseEnabled()) return { status: "missing" };

  const role = await prisma.staffRole.findUnique({
    where: { id: roleId },
    select: { isSuperAdmin: true, permissions: { select: { permissionKey: true } } },
  });

  if (!role) return { status: "missing" };
  if (role.isSuperAdmin) return { status: "super" };

  const set = new Set(role.permissions.map((p) => p.permissionKey));
  permissionCache.set(roleId, set);
  return { status: "ok", permissions: set };
}

/** Permissions for sidebar + /api/admin/auth/me */
export async function resolveSessionNavPermissions(session: AdminSession | null): Promise<{
  permissions: string[] | null;
  enforcePermissions: boolean;
}> {
  if (!session || isSuperAdminSession(session)) {
    return { permissions: null, enforcePermissions: false };
  }
  if (session.staffRoleId == null) {
    return { permissions: null, enforcePermissions: false };
  }

  const loaded = await loadRolePermissionSet(session.staffRoleId);
  if (loaded.status === "missing") {
    await clearOrphanedStaffRoleId(session);
    return { permissions: null, enforcePermissions: false };
  }
  if (loaded.status === "super") {
    return { permissions: null, enforcePermissions: false };
  }

  return {
    permissions: [...loaded.permissions],
    enforcePermissions: true,
  };
}

export async function sessionHasPermission(
  session: AdminSession | null,
  key: string
): Promise<boolean> {
  if (!session) return false;
  if (isSuperAdminSession(session)) return true;

  if (!session.staffRoleId) {
    return legacyFullStaffAccess(session);
  }

  const loaded = await loadRolePermissionSet(session.staffRoleId);
  if (loaded.status === "missing") {
    await clearOrphanedStaffRoleId(session);
    return legacyFullStaffAccess(session);
  }
  if (loaded.status === "super") return true;
  if (!shouldEnforceStaffPermissions(session)) {
    return legacyFullStaffAccess(session);
  }

  return loaded.permissions.has(key);
}

export async function sessionCanViewAdminPath(
  session: AdminSession | null,
  pathname: string
): Promise<boolean> {
  if (!session) return false;
  if (isSuperAdminSession(session)) return true;

  if (pathname.startsWith("/admin/roles") || pathname.startsWith("/api/admin/roles")) {
    return sessionHasPermission(session, permissionKey("roles", "view"));
  }

  if (!shouldEnforceStaffPermissions(session)) return true;

  const pageSeg = pathname.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
  if (!pageSeg || pageSeg === "forbidden" || pageSeg === "login" || pageSeg === "register") {
    return true;
  }

  if (pageSeg === "projects") {
    if (pathname.includes("/pending")) {
      return sessionHasPermission(session, permissionKey("projects_pending", "view"));
    }
    if (pathname.includes("/active")) {
      return sessionHasPermission(session, permissionKey("projects_active", "view"));
    }
    return sessionHasPermission(session, permissionKey("projects", "view"));
  }

  const moduleKey = ADMIN_PATH_VIEW_PERMISSION[pageSeg];
  if (!moduleKey) return false;
  return sessionHasPermission(session, permissionKey(moduleKey, "view"));
}

export function navHrefPermission(href: string): string | null {
  return ADMIN_NAV_HREF_PERMISSION[href] ?? null;
}

export async function filterAdminNavGroups<
  T extends { items: { href: string }[] }
>(session: AdminSession | null, groups: T[]): Promise<T[]> {
  if (!session || isSuperAdminSession(session)) return groups;
  if (!shouldEnforceStaffPermissions(session)) return groups;

  const out: T[] = [];
  for (const group of groups) {
    const items = [];
    for (const item of group.items) {
      const perm = navHrefPermission(item.href);
      if (!perm) {
        items.push(item);
        continue;
      }
      if (await sessionHasPermission(session, perm)) items.push(item);
    }
    if (items.length) out.push({ ...group, items });
  }
  return out;
}

export function moduleActionPermission(moduleKey: string, action: PermissionAction): string {
  return permissionKey(moduleKey, action);
}

export { isValidPermissionKey, allPermissionKeys };
