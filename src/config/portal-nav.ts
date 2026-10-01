import { canUseAdminPanelFromUserType } from "@/config/account-nav";
import { userTypeIds } from "@/config/site";
import { canAccessBrokerPortal } from "@/lib/roles";

export type PortalRole = "guest" | "buyer" | "agent" | "builder" | "staff";

export type PortalLink = {
  id: "public" | "agent" | "admin" | "account";
  label: string;
  href: "/" | "/projects" | "/broker" | "/admin/dashboard" | "/account";
  hint?: string;
};

export const PORTAL_PUBLIC: PortalLink = {
  id: "public",
  label: "Public site",
  href: "/projects",
  hint: "Off-plan listings",
};

export const PORTAL_AGENT: PortalLink = {
  id: "agent",
  label: "Agent portal",
  href: "/broker",
  hint: "Pitch decks & analytics",
};

export const PORTAL_ACCOUNT: PortalLink = {
  id: "account",
  label: "My account",
  href: "/account",
  hint: "Profile & wishlist",
};

/** Resolve role from front-session `userTypeId` / `role` (and optional admin-shell type). */
export function resolvePortalRole(
  userTypeId?: number | null,
  role?: string | null
): PortalRole {
  if (userTypeId == null && !role) return "guest";

  if (userTypeId === userTypeIds.builder || role === "builder") return "builder";
  if (
    userTypeId === userTypeIds.admin ||
    userTypeId === userTypeIds.superAdmin ||
    role === "staff"
  ) {
    return "staff";
  }
  if (canUseAdminPanelFromUserType(userTypeId)) return "staff";

  if (canAccessBrokerPortal(userTypeId) || role === "broker") return "agent";

  return "buyer";
}

export function adminPortalLabel(role: PortalRole): string {
  return role === "builder" ? "Builder workspace" : "Admin";
}

export function adminPortalLink(role: PortalRole): PortalLink {
  return {
    id: "admin",
    label: adminPortalLabel(role),
    href: role === "builder" ? "/account" : "/admin/dashboard",
    hint: role === "builder" ? "Projects & units" : "Staff dashboard",
  };
}

/** Primary + secondary homes per role (product journey). */
export function getPortalJourney(role: PortalRole): {
  primary: PortalLink;
  secondary?: PortalLink;
} {
  switch (role) {
    case "agent":
      return { primary: PORTAL_AGENT, secondary: PORTAL_PUBLIC };
    case "builder":
      return {
        primary: adminPortalLink(role),
        secondary: { ...PORTAL_PUBLIC, hint: "View public listings" },
      };
    case "staff":
      return { primary: adminPortalLink(role), secondary: PORTAL_PUBLIC };
    case "buyer":
      return { primary: PORTAL_PUBLIC, secondary: PORTAL_ACCOUNT };
    default:
      return { primary: PORTAL_PUBLIC };
  }
}

/** Fixed cross-portal links — hide by role, same labels everywhere. */
export function getCrossPortalLinks(
  userTypeId?: number | null,
  role?: string | null
): PortalLink[] {
  const portalRole = resolvePortalRole(userTypeId, role);
  const links: PortalLink[] = [PORTAL_PUBLIC];

  if (portalRole === "agent") {
    links.push(PORTAL_AGENT);
  }
  if (portalRole === "builder" || portalRole === "staff") {
    links.push(adminPortalLink(portalRole));
  }
  if (portalRole === "buyer") {
    links.push(PORTAL_ACCOUNT);
  }

  return links;
}

export function isPortalLinkActive(pathname: string, link: PortalLink): boolean {
  if (link.id === "public") {
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/broker") ||
      pathname.startsWith("/account")
    ) {
      return false;
    }
    return (
      pathname === "/" ||
      pathname === "/home" ||
      pathname === "/projects" ||
      pathname.startsWith("/off-plan") ||
      pathname.startsWith("/project") ||
      pathname.startsWith("/about-us") ||
      pathname.startsWith("/blog") ||
      pathname.startsWith("/contact") ||
      pathname.startsWith("/compare")
    );
  }
  if (link.id === "agent") {
    return pathname === "/broker" || pathname.startsWith("/broker/");
  }
  if (link.id === "admin") {
    return pathname.startsWith("/admin");
  }
  if (link.id === "account") {
    return pathname === "/account" || pathname.startsWith("/account/");
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}
