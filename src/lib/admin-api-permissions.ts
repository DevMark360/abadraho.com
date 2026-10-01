import { NextResponse } from "next/server";
import {
  ADMIN_RESOURCE_ID_MODULE,
  permissionKey,
  type PermissionAction,
  resourcePermissionModule,
} from "@/config/admin-permissions";
import { isFullStaff } from "@/lib/admin-rbac";
import type { AdminSession } from "@/lib/admin-session-cookie";
import { sessionHasPermission } from "@/lib/staff-rbac";

/** @deprecated use resourcePermissionModule */
export const ADMIN_API_RESOURCE_MODULE = ADMIN_RESOURCE_ID_MODULE;

export function moduleForApiResource(resourceOrSegment: string): string | null {
  return resourcePermissionModule(resourceOrSegment);
}

export function httpMethodToPermissionAction(method: string): PermissionAction {
  switch (method.toUpperCase()) {
    case "POST":
      return "add";
    case "PATCH":
    case "PUT":
      return "edit";
    case "DELETE":
      return "delete";
    default:
      return "view";
  }
}

/** Returns 403 response when staff lacks permission; null when allowed. */
export async function requireModulePermission(
  session: AdminSession,
  moduleKey: string,
  action: PermissionAction
): Promise<NextResponse | null> {
  if (!isFullStaff(session)) return null;

  const allowed = await sessionHasPermission(session, permissionKey(moduleKey, action));
  if (!allowed) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireResourcePermission(
  session: AdminSession,
  resourceId: string,
  action: PermissionAction
): Promise<NextResponse | null> {
  const moduleKey = moduleForApiResource(resourceId);
  if (!moduleKey) return null;
  return requireModulePermission(session, moduleKey, action);
}
