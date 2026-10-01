import { userTypeIds } from "@/config/site";
import type { AdminSession } from "@/lib/admin-session-cookie";

/** Who may open the admin panel at all (legacy ManageUserTypes + admins table). */
export type AdminPanelRole = "fullStaff" | "builder";

const PANEL_USER_TYPES = new Set<number>([
  userTypeIds.superAdmin,
  userTypeIds.admin,
  userTypeIds.builder,
]);

/** First segment after /admin/ or /api/admin/ that requires full staff (not builders). */
const FULL_STAFF_SEGMENTS = new Set([
  "users",
  "builders",
  "agents",
  "commissions",
  "customers",
  "contact",
  "blogs",
  "blog-categories",
  "tags",
  "activity-log",
  "search-history",
  "advance-search-history",
  "housing-calc-search-history",
  "import",
  "areas",
  "project-types",
  "room-types",
  "amenities",
  "utilities",
  "progress",
  "favorites",
  "roles",
  "blog",
  "blog_category",
  "manage_users",
  "builder",
  "tag",
  "listing",
]);

/** CRUD resource ids (dynamic /api/admin/[resource]) builders may use. */
export const BUILDER_ALLOWED_RESOURCE_IDS = new Set([
  "projects",
  "projects-pending",
  "projects-active",
  "units",
  "reviews",
  "vouchers",
  "inquiries",
  "payment-schedules",
]);

export function getAdminPanelRole(session: AdminSession | null): AdminPanelRole | null {
  if (!session) return null;
  if (session.source === "admin") return "fullStaff";
  const typeId = session.userTypeId;
  if (typeId == null || !PANEL_USER_TYPES.has(typeId)) return null;
  if (typeId === userTypeIds.builder) return "builder";
  return "fullStaff";
}

export function canAccessAdminPanel(session: AdminSession | null): boolean {
  return getAdminPanelRole(session) != null;
}

export function isFullStaff(session: AdminSession | null): boolean {
  return getAdminPanelRole(session) === "fullStaff";
}

export function isBuilderSession(session: AdminSession | null): boolean {
  return getAdminPanelRole(session) === "builder";
}

export function isSuperAdmin(session: AdminSession | null): boolean {
  return session?.userTypeId === userTypeIds.superAdmin;
}

/** Website users must not use the admin panel (legacy AdminController). */
export function isBlockedFromAdminLogin(userTypeId: number): boolean {
  return (
    userTypeId === userTypeIds.websiteUser ||
    userTypeId === userTypeIds.buyer ||
    userTypeId === userTypeIds.agent ||
    userTypeId === userTypeIds.employee
  );
}

function firstSegment(pathname: string, prefix: "/admin" | "/api/admin"): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).replace(/^\//, "");
  if (!rest) return null;
  return rest.split("/")[0] ?? null;
}

function isAuthExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/register") ||
    pathname.startsWith("/admin/forbidden") ||
    pathname.startsWith("/api/admin/auth/")
  );
}

/**
 * Path-based access for /admin/* pages and /api/admin/* routes.
 * Returns false → caller should 403 or redirect to /admin/forbidden.
 */
export function canAccessAdminPath(pathname: string, session: AdminSession | null): boolean {
  if (isAuthExemptPath(pathname)) return true;
  if (!canAccessAdminPanel(session)) return false;

  const role = getAdminPanelRole(session);
  if (role === "fullStaff") return true;

  const apiSeg = firstSegment(pathname, "/api/admin");
  const pageSeg = firstSegment(pathname, "/admin");

  if (pathname.startsWith("/api/admin/")) {
    if (apiSeg === "export") {
      const sub = pathname.split("/")[3];
      if (sub === "contact" || sub === "search-history") return false;
      return true;
    }
    if (apiSeg === "[resource]" || apiSeg === null) return false;
    if (apiSeg && FULL_STAFF_SEGMENTS.has(apiSeg)) return false;

    if (apiSeg && BUILDER_ALLOWED_RESOURCE_IDS.has(apiSeg)) return true;

    const allowedApiPrefixes = [
      "projects",
      "reviews",
      "units",
      "vouchers",
      "downloaded-vouchers",
      "inquiries",
      "payment-schedules",
      "teams",
      "events",
      "stats",
      "meta",
      "profile",
      "update-admin-password",
      "my-admin-profile-update",
      "auth",
    ];
    if (apiSeg === "projects" && pathname.includes("/import")) return false;

    if (apiSeg && allowedApiPrefixes.includes(apiSeg)) return true;

    return false;
  }

  if (pathname.startsWith("/admin/")) {
    if (!pageSeg || pageSeg === "dashboard" || pageSeg === "forbidden") return true;
    if (FULL_STAFF_SEGMENTS.has(pageSeg)) return false;

    const builderPages = [
      "projects",
      "reviews",
      "units",
      "vouchers",
      "downloaded-vouchers",
      "inquiries",
      "payment-schedules",
      "events",
      "my-teams",
      "joined-teams",
      "team",
      "my-team",
      "admin-profile",
      "admin-change-password",
      "profile",
    ];
    if (builderPages.includes(pageSeg)) return true;

    return false;
  }

  return false;
}

export function canAccessAdminResourceId(
  resourceId: string,
  session: AdminSession | null
): boolean {
  if (!canAccessAdminPanel(session)) return false;
  if (isFullStaff(session)) return true;
  return BUILDER_ALLOWED_RESOURCE_IDS.has(resourceId);
}
