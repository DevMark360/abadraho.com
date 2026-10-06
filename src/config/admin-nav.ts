import { userTypeIds } from "@/config/site";

/** Single sidebar link */
export type AdminNavItem = {
  href: string;
  label: string;
  /** Download / API link (same tab) */
  download?: boolean;
  /** Optional endpoint returning { pending: number } to render a count badge */
  badgeEndpoint?: string;
  /**
   * Access control is automatic: every link here becomes a permission module on the Roles
   * screen and guards its page (see src/config/admin-permissions.ts). Only set these to
   * override the defaults:
   * - permission: module key (default: path after /admin/, e.g. /admin/ad-floor-prices →
   *   "ad_floor_prices"), or false for links every staff member may open.
   * - permissionActions: actions offered on the Roles screen (default view/add/edit/delete).
   */
  permission?: string | false;
  permissionActions?: readonly string[];
};

/** Collapsible group — mirrors dev.abadraho.com admin sidebar */
export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

const dashboard: AdminNavGroup = {
  id: "dashboard",
  label: "Dashboard",
  items: [{ href: "/admin/dashboard", label: "Dashboard" }],
};

/** Matches dev.abadraho.com master1.blade.php → Project Management submenu */
const projectManagement: AdminNavGroup = {
  id: "projects",
  label: "Project Management",
  items: [
    { href: "/admin/projects", label: "Projects" },
    { href: "/admin/projects/pending", label: "Pending review" },
    { href: "/admin/projects/active", label: "Active Projects" },
    { href: "/admin/reviews", label: "Project Reviews" },
    { href: "/admin/units", label: "Units" },
    { href: "/admin/areas", label: "Areas" },
    { href: "/admin/project-types", label: "Project Types" },
    { href: "/admin/progress", label: "Progress statuses" },
    { href: "/admin/room-types", label: "Room Types" },
    { href: "/admin/amenities", label: "Amenities" },
    { href: "/admin/utilities", label: "Utilities" },
    { href: "/admin/import", label: "Bulk import" },
  ],
};

/** Builder role — limited project menu (legacy master1.blade.php) */
const projectManagementBuilder: AdminNavGroup = {
  id: "projects",
  label: "Project Management",
  items: [
    { href: "/admin/projects", label: "Projects" },
    { href: "/admin/projects/pending", label: "Pending Projects" },
    { href: "/admin/projects/active", label: "Active Projects" },
    { href: "/admin/reviews", label: "Project Reviews" },
    { href: "/admin/units", label: "Units" },
  ],
};

const userManagement: AdminNavGroup = {
  id: "users",
  label: "User Management",
  items: [
    { href: "/admin/users", label: "User listing" },
    { href: "/admin/search-history", label: "User search history" },
    { href: "/admin/housing-calc-search-history", label: "Housing calculator search" },
    { href: "/admin/customers", label: "Customers (website users)" },
    { href: "/admin/agents", label: "Agents / brokers" },
    {
      href: "/admin/broker-assignment-requests",
      label: "Broker requests",
      badgeEndpoint: "/api/admin/broker-assignment-requests?count=pending",
      permissionActions: ["view", "approve", "reject", "delete"],
    },
    { href: "/admin/commissions", label: "Commissions" },
  ],
};

const builderManagement: AdminNavGroup = {
  id: "builders",
  label: "Builder Management",
  items: [{ href: "/admin/builders", label: "Builders" }],
};

const inquiryManagement: AdminNavGroup = {
  id: "inquiries",
  label: "Inquiry Management",
  items: [
    { href: "/admin/inquiries", label: "Property inquiries" },
    { href: "/admin/payment-schedules", label: "Payment plan inquiries" },
    { href: "/admin/contact", label: "Contact form inquiries" },
    {
      href: "/api/admin/export/payment-schedules",
      label: "Export payment schedules (CSV)",
      download: true,
    },
  ],
};

/** Legacy builder menu: property + payment plan only (no contact form). */
const inquiryManagementBuilder: AdminNavGroup = {
  id: "inquiries",
  label: "Inquiry Management",
  items: [
    { href: "/admin/inquiries", label: "Property inquiries" },
    { href: "/admin/payment-schedules", label: "Payment plan inquiries" },
    {
      href: "/api/admin/export/payment-schedules",
      label: "Export payment schedules (CSV)",
      download: true,
    },
  ],
};

const blogsManagement: AdminNavGroup = {
  id: "blogs",
  label: "Blogs Management",
  items: [
    { href: "/admin/blogs", label: "Blogs" },
    { href: "/admin/blog-categories", label: "Blog categories" },
  ],
};

const tagsManagement: AdminNavGroup = {
  id: "tags",
  label: "Tags Management",
  items: [{ href: "/admin/tags", label: "Tags" }],
};

const activity: AdminNavGroup = {
  id: "activity",
  label: "Activity",
  items: [{ href: "/admin/activity-log", label: "Activity logs" }],
};

const vouchers: AdminNavGroup = {
  id: "vouchers",
  label: "Vouchers",
  items: [
    { href: "/admin/vouchers", label: "Voucher listing" },
    { href: "/admin/downloaded-vouchers", label: "Downloaded vouchers" },
  ],
};

const teamsManagement: AdminNavGroup = {
  id: "teams",
  label: "Teams",
  items: [
    { href: "/admin/my-teams", label: "My teams" },
    { href: "/admin/joined-teams", label: "Joined teams" },
    { href: "/admin/team/create", label: "Create team" },
  ],
};

const events: AdminNavGroup = {
  id: "events",
  label: "Events",
  items: [{ href: "/admin/events", label: "Events" }],
};

const account: AdminNavGroup = {
  id: "account",
  label: "Account",
  items: [
    { href: "/admin/admin-profile", label: "Admin profile" },
    { href: "/admin/admin-change-password", label: "Change password" },
  ],
};

const more: AdminNavGroup = {
  id: "more",
  label: "More",
  items: [{ href: "/admin/favorites", label: "Favorites / wishlists" }],
};

const accessControl: AdminNavGroup = {
  id: "access_control",
  label: "Access Control",
  items: [{ href: "/admin/roles", label: "Roles" }],
};

const advertising: AdminNavGroup = {
  id: "advertising",
  label: "Advertising",
  items: [
    { href: "/admin/ad-campaigns", label: "Ad campaigns" },
    { href: "/admin/ad-wallet-transactions", label: "Wallet top-up requests" },
    { href: "/admin/finance", label: "Finance overview", permissionActions: ["view", "export"] },
    { href: "/admin/ad-floor-prices", label: "Floor prices" },
    { href: "/admin/ad-whatsapp-packages", label: "WhatsApp packages" },
  ],
};

/** Full admin sidebar (Super Admin / Admin) */
export const adminNavGroups: AdminNavGroup[] = [
  dashboard,
  projectManagement,
  userManagement,
  builderManagement,
  inquiryManagement,
  blogsManagement,
  tagsManagement,
  vouchers,
  teamsManagement,
  events,
  advertising,
  more,
  accessControl,
  account,
];

/** Builder login — limited menu (legacy master1.blade.php) */
export const builderNavGroups: AdminNavGroup[] = [
  // dashboard,
  projectManagementBuilder,
  inquiryManagementBuilder,
  vouchers,
  teamsManagement,
  events,
  account,
];

export function getAdminNavGroups(userTypeId?: number | null): AdminNavGroup[] {
  if (userTypeId === userTypeIds.builder) return builderNavGroups;
  return adminNavGroups;
}

/** Flat list for dashboard grid */
export function flattenAdminNav(groups: AdminNavGroup[]): AdminNavItem[] {
  const seen = new Set<string>();
  const out: AdminNavItem[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      out.push(item);
    }
  }
  return out;
}

/** @deprecated use adminNavGroups — kept for any old imports */
export const adminNav = flattenAdminNav(adminNavGroups);
