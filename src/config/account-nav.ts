import { getAdminNavGroups, type AdminNavGroup } from "@/config/admin-nav";
import { userTypeIds } from "@/config/site";
import { canAccessBrokerPortal } from "@/lib/roles";

export type AccountNavItem = {
  href: string;
  label: string;
  download?: boolean;
};

export type AccountNavSection = {
  id: string;
  label: string;
  items: AccountNavItem[];
};

const personal: AccountNavSection = {
  id: "personal",
  label: "Your account",
  items: [
    { href: "/account/profile", label: "Profile & contact" },
    { href: "/account/password", label: "Change password" },
    { href: "/account/wishlist", label: "Wishlist" },
  ],
};

const personalBuilder: AccountNavSection = {
  id: "personal",
  label: "Your account",
  items: [
    { href: "/account/profile", label: "Profile & contact" },
    { href: "/account/password", label: "Change password" },
  ],
};

const builderWorkspace: AccountNavSection = {
  id: "workspace",
  label: "Builder workspace",
  items: [
    { href: "/admin/projects", label: "My projects" },
    { href: "/admin/projects/create", label: "Add project" },
    { href: "/admin/my-teams", label: "My teams" },
    { href: "/admin/joined-teams", label: "Joined teams" },
    { href: "/admin/units", label: "Units" },
    { href: "/admin/inquiries", label: "Inquiries" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/reviews", label: "Reviews" },
    { href: "/admin/vouchers", label: "Vouchers" },
    { href: "/admin/admin-profile", label: "Workspace profile" },
  ],
};

const advertisingPortal: AccountNavSection = {
  id: "advertising",
  label: "Advertising",
  items: [
    { href: "/advertising", label: "Dashboard" },
    { href: "/advertising/campaigns", label: "Campaigns" },
    { href: "/advertising/campaigns/new", label: "New campaign" },
    { href: "/advertising/wallet", label: "Wallet" },
  ],
};

const agentPortal: AccountNavSection = {
  id: "agent",
  label: "Agent portal",
  items: [
    { href: "/broker", label: "Dashboard" },
    { href: "/broker/projects", label: "My projects" },
    { href: "/broker/leads", label: "My leads" },
    { href: "/broker/commissions", label: "Commission tracker" },
    { href: "/broker/browse", label: "Browse projects" },
    { href: "/broker/pitch-decks", label: "Pitch decks" },
    { href: "/broker/whatsapp-cards", label: "WhatsApp cards" },
    { href: "/broker/analytics", label: "Marketing analytics" },
    { href: "/broker/profile", label: "My profile" },
  ],
};

function mapAdminGroups(groups: AdminNavGroup[]): AccountNavSection[] {
  return groups.map((g) => ({
    id: `admin-${g.id}`,
    label: g.label,
    items: g.items.map((item) => ({
      href: item.href,
      label: item.label,
      download: item.download,
    })),
  }));
}

export function canUseAdminPanelFromUserType(userTypeId?: number | null): boolean {
  if (userTypeId == null) return false;
  return (
    userTypeId === userTypeIds.superAdmin ||
    userTypeId === userTypeIds.admin ||
    userTypeId === userTypeIds.builder
  );
}

export function isBuilderUserType(userTypeId?: number | null): boolean {
  return userTypeId === userTypeIds.builder;
}

/** Where “My account” should land for this user (admin portal, agent portal, or hub). */
export function getAccountHomePath(
  userTypeId?: number | null,
  role?: string | null
): "/account" | "/admin/dashboard" | "/broker" {
  if (isBuilderUserType(userTypeId)) {
    return "/account";
  }
  if (
    userTypeId === userTypeIds.superAdmin ||
    userTypeId === userTypeIds.admin ||
    role === "staff"
  ) {
    return "/admin/dashboard";
  }
  if (canAccessBrokerPortal(userTypeId) || role === "broker") {
    return "/broker";
  }
  return "/account";
}

export function isAccountAreaActive(
  pathname: string,
  homePath: ReturnType<typeof getAccountHomePath>,
  userTypeId?: number | null
): boolean {
  if (isBuilderUserType(userTypeId)) {
    return (
      pathname === "/account" ||
      pathname.startsWith("/account/") ||
      pathname.startsWith("/admin/") ||
      pathname === "/advertising" ||
      pathname.startsWith("/advertising/")
    );
  }
  if (homePath.startsWith("/admin")) {
    return pathname.startsWith("/admin");
  }
  if (homePath.startsWith("/broker")) {
    return pathname === "/broker" || pathname.startsWith("/broker/");
  }
  return pathname === "/account" || pathname.startsWith("/account/");
}

/** Sidebar /account hub sections by role (front session userTypeId). */
export function getAccountNavSections(
  userTypeId?: number | null,
  role?: string | null
): AccountNavSection[] {
  if (isBuilderUserType(userTypeId)) {
    return [personalBuilder, builderWorkspace, advertisingPortal];
  }

  const sections: AccountNavSection[] = [personal];

  if (canAccessBrokerPortal(userTypeId) || role === "broker") {
    sections.push(agentPortal);
  }

  if (
    userTypeId === userTypeIds.superAdmin ||
    userTypeId === userTypeIds.admin ||
    role === "staff"
  ) {
    sections.push(...mapAdminGroups(getAdminNavGroups(userTypeId)));
  }

  return sections;
}
