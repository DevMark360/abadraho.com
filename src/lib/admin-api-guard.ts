import { NextResponse } from "next/server";
import { getAdminSession, type AdminSession } from "@/lib/admin-session";
import {
  requireBuilderEventAccess,
  requireBuilderInquiryAccess,
  requireBuilderProjectAccess,
  requireBuilderReviewAccess,
  requireBuilderUnitAccess,
} from "@/lib/admin-builder-ownership";
import {
  canAccessAdminPanel,
  canAccessAdminPath,
  canAccessAdminResourceId,
  isFullStaff,
} from "@/lib/admin-rbac";
import { sessionHasPermission } from "@/lib/staff-rbac";
import {
  requireModulePermission,
  requireResourcePermission,
} from "@/lib/admin-api-permissions";
import type { PermissionAction } from "@/config/admin-permissions";

/** Session is DB-revalidated on every call (sec-2). */
export async function requireAdminSession(): Promise<
  { session: AdminSession } | NextResponse
> {
  const session = await getAdminSession();
  if (!session || !canAccessAdminPanel(session)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return { session };
}

export async function requireAdminPath(
  pathname: string
): Promise<{ session: AdminSession } | NextResponse> {
  const session = await getAdminSession();
  if (!session || !canAccessAdminPanel(session)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessAdminPath(pathname, session)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return { session };
}

export async function requireFullStaffAdmin(): Promise<
  { session: AdminSession } | NextResponse
> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  if (!isFullStaff(result.session)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return result;
}

export async function requireAdminResource(
  resourceId: string,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  if (!canAccessAdminResourceId(resourceId, result.session)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const denied = await requireResourcePermission(result.session, resourceId, action);
  if (denied) return denied;
  return result;
}

/** Builder may only access projects they own via `project_owners`. */
export async function requireAdminProjectAccess(
  projectId: number,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const access = await requireBuilderProjectAccess(result.session, projectId);
  if (access instanceof NextResponse) return access;
  const denied = await requireModulePermission(result.session, "projects", action);
  if (denied) return denied;
  return result;
}

export async function requireAdminUnitAccess(
  unitId: number,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const access = await requireBuilderUnitAccess(result.session, unitId);
  if (access instanceof NextResponse) return access;
  const denied = await requireModulePermission(result.session, "units", action);
  if (denied) return denied;
  return result;
}

export async function requireAdminReviewAccess(
  reviewId: number,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const access = await requireBuilderReviewAccess(result.session, reviewId);
  if (access instanceof NextResponse) return access;
  const denied = await requireModulePermission(result.session, "reviews", action);
  if (denied) return denied;
  return result;
}

export async function requireAdminEventAccess(
  eventId: number,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const access = await requireBuilderEventAccess(result.session, eventId);
  if (access instanceof NextResponse) return access;
  const denied = await requireModulePermission(result.session, "events", action);
  if (denied) return denied;
  return result;
}

export async function requireAdminInquiryAccess(
  inquiryId: number,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const access = await requireBuilderInquiryAccess(result.session, inquiryId);
  if (access instanceof NextResponse) return access;
  const denied = await requireModulePermission(result.session, "inquiries", action);
  if (denied) return denied;
  return result;
}

/** Full staff with a specific permission key (e.g. `roles.view`). */
export async function requireStaffPermission(
  permission: string
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireFullStaffAdmin();
  if (result instanceof NextResponse) return result;
  const allowed = await sessionHasPermission(result.session, permission);
  if (!allowed) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return result;
}

/** Full staff checked against a permission module + action. */
export async function requireStaffAdminModule(
  moduleKey: string,
  action: PermissionAction = "view"
): Promise<{ session: AdminSession } | NextResponse> {
  const result = await requireFullStaffAdmin();
  if (result instanceof NextResponse) return result;
  const denied = await requireModulePermission(result.session, moduleKey, action);
  if (denied) return denied;
  return result;
}
