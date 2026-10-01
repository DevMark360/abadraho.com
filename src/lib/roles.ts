import { userTypeIds } from "@/config/site";

export type AppRole = "user" | "broker" | "builder" | "staff";

export function roleFromUserTypeId(userTypeId: number | null | undefined): AppRole {
  if (userTypeId == null) return "user";
  if (userTypeId === userTypeIds.agent) return "broker";
  if (userTypeId === userTypeIds.builder) return "builder";
  if (userTypeId === userTypeIds.admin || userTypeId === userTypeIds.superAdmin) {
    return "staff";
  }
  return "user";
}

export function canAccessBrokerPortal(userTypeId: number | null | undefined): boolean {
  return roleFromUserTypeId(userTypeId) === "broker";
}

export function canAccessBuilderPortal(userTypeId: number | null | undefined): boolean {
  return roleFromUserTypeId(userTypeId) === "builder";
}

/**
 * Visitor behavior tracking (activity log, search history) should reflect real prospective
 * buyers, not internal staff/builder/agent accounts browsing the public site — their traffic
 * would otherwise skew analytics and personalization signals meant for genuine visitors.
 */
export function isTrackableVisitorRole(role: AppRole | null | undefined): boolean {
  return role !== "staff" && role !== "builder" && role !== "broker";
}
