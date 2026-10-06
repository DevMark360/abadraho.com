/** Staff admin panel permission registry — used by Roles UI and RBAC guards. */
import { adminNavGroups, type AdminNavGroup, type AdminNavItem } from "@/config/admin-nav";

export const PERMISSION_ACTIONS = [
  "view",
  "add",
  "edit",
  "delete",
  "approve",
  "reject",
  "refund",
  "archive",
  "export",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  add: "Add",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  refund: "Refund",
  archive: "Archive",
  export: "Export",
};

export type AdminPermissionModule = {
  key: string;
  label: string;
  actions: readonly PermissionAction[];
};

export type AdminPermissionGroup = {
  key: string;
  label: string;
  modules: AdminPermissionModule[];
};

/** Hand-tuned modules (labels/actions). Menu links not listed here are added automatically. */
const BASE_PERMISSION_GROUPS: AdminPermissionGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    modules: [{ key: "dashboard", label: "Dashboard", actions: ["view"] }],
  },
  {
    key: "project_management",
    label: "Project Management",
    modules: [
      { key: "projects", label: "Projects", actions: ["view", "add", "edit", "delete"] },
      {
        key: "projects_pending",
        label: "Pending review",
        actions: ["view", "edit", "approve", "reject"],
      },
      {
        key: "projects_active",
        label: "Active projects",
        actions: ["view", "edit", "delete"],
      },
      {
        key: "reviews",
        label: "Project reviews",
        actions: ["view", "edit", "delete", "approve", "reject"],
      },
      { key: "units", label: "Units", actions: ["view", "add", "edit", "delete"] },
      { key: "areas", label: "Areas", actions: ["view", "add", "edit", "delete"] },
      { key: "project_types", label: "Project types", actions: ["view", "add", "edit", "delete"] },
      { key: "progress", label: "Progress statuses", actions: ["view", "add", "edit", "delete"] },
      { key: "room_types", label: "Room types", actions: ["view", "add", "edit", "delete"] },
      { key: "amenities", label: "Amenities", actions: ["view", "add", "edit", "delete"] },
      { key: "utilities", label: "Utilities", actions: ["view", "add", "edit", "delete"] },
      { key: "import", label: "Bulk import", actions: ["view", "add"] },
    ],
  },
  {
    key: "user_management",
    label: "User Management",
    modules: [
      { key: "users", label: "User listing", actions: ["view", "add", "edit", "delete"] },
      { key: "search_history", label: "User search history", actions: ["view", "export"] },
      {
        key: "housing_calc_search",
        label: "Housing calculator search",
        actions: ["view", "delete", "export"],
      },
      {
        key: "advance_search_history",
        label: "Advance search history",
        actions: ["view", "export"],
      },
      { key: "customers", label: "Customers", actions: ["view", "edit"] },
      {
        key: "agents",
        label: "Agents / brokers",
        actions: ["view", "add", "edit", "delete", "approve", "reject"],
      },
      { key: "commissions", label: "Commissions", actions: ["view", "edit", "approve"] },
    ],
  },
  {
    key: "builder_management",
    label: "Builder Management",
    modules: [
      { key: "builders", label: "Builders", actions: ["view", "add", "edit", "delete"] },
    ],
  },
  {
    key: "inquiry_management",
    label: "Inquiry Management",
    modules: [
      { key: "inquiries", label: "Property inquiries", actions: ["view", "edit", "delete", "export"] },
      {
        key: "payment_schedules",
        label: "Payment plan inquiries",
        actions: ["view", "edit", "export"],
      },
      { key: "contact", label: "Contact form inquiries", actions: ["view", "edit", "delete", "export"] },
    ],
  },
  {
    key: "blogs_management",
    label: "Blogs Management",
    modules: [
      { key: "blogs", label: "Blogs", actions: ["view", "add", "edit", "delete"] },
      { key: "blog_categories", label: "Blog categories", actions: ["view", "add", "edit", "delete"] },
    ],
  },
  {
    key: "tags_management",
    label: "Tags Management",
    modules: [{ key: "tags", label: "Tags", actions: ["view", "add", "edit", "delete"] }],
  },
  {
    key: "activity",
    label: "Activity",
    modules: [{ key: "activity_log", label: "Activity logs", actions: ["view", "export"] }],
  },
  {
    key: "vouchers",
    label: "Vouchers",
    modules: [
      { key: "vouchers", label: "Voucher listing", actions: ["view", "add", "edit", "delete"] },
      { key: "downloaded_vouchers", label: "Downloaded vouchers", actions: ["view", "export"] },
    ],
  },
  {
    key: "teams",
    label: "Teams",
    modules: [
      { key: "teams", label: "Teams", actions: ["view", "add", "edit", "delete"] },
    ],
  },
  {
    key: "events_management",
    label: "Events",
    modules: [
      {
        key: "events",
        label: "Events",
        actions: ["view", "add", "edit", "delete", "approve", "reject"],
      },
    ],
  },
  {
    key: "advertising_management",
    label: "Advertising",
    modules: [
      {
        key: "ad_campaigns",
        label: "Ad campaigns",
        actions: ["view", "approve", "reject", "refund", "archive"],
      },
      {
        key: "ad_wallet_transactions",
        label: "Wallet top-up requests",
        actions: ["view", "approve", "reject"],
      },
      {
        key: "ad_floor_prices",
        label: "Floor prices",
        actions: ["view", "add", "edit", "delete"],
      },
      {
        key: "ad_whatsapp_packages",
        label: "WhatsApp packages",
        actions: ["view"],
      },
    ],
  },
  {
    key: "more",
    label: "More",
    modules: [{ key: "favorites", label: "Favorites / wishlists", actions: ["view"] }],
  },
  {
    key: "access_control",
    label: "Access Control",
    modules: [
      {
        key: "roles",
        label: "Roles",
        actions: ["view", "add", "edit", "delete"],
      },
    ],
  },
];

/** Map /api/admin/[resource] ids → permission module keys (API guards + admin UI). */
const BASE_RESOURCE_ID_MODULE: Record<string, string> = {
  projects: "projects",
  areas: "areas",
  amenities: "amenities",
  utilities: "utilities",
  "project-types": "project_types",
  "room-types": "room_types",
  progress: "progress",
  tags: "tags",
  users: "users",
  builders: "builders",
  agents: "agents",
  blogs: "blogs",
  "blog-categories": "blog_categories",
  reviews: "reviews",
  units: "units",
  vouchers: "vouchers",
  contact: "contact",
  inquiries: "inquiries",
  "payment-schedules": "payment_schedules",
  commissions: "commissions",
  customers: "customers",
  roles: "roles",
  teams: "teams",
  events: "events",
  "search-history": "search_history",
  "advance-search-history": "advance_search_history",
  "housing-calc-search-history": "housing_calc_search",
  "downloaded-vouchers": "downloaded_vouchers",
  import: "import",
  "ad-wallet-transactions": "ad_wallet_transactions",
  "ad-campaigns": "ad_campaigns",
  "ad-floor-prices": "ad_floor_prices",
  "ad-whatsapp-packages": "ad_whatsapp_packages",
};

export function resourcePermissionModule(resourceId: string): string | null {
  return ADMIN_RESOURCE_ID_MODULE[resourceId] ?? null;
}

export function permissionKey(moduleKey: string, action: PermissionAction): string {
  return `${moduleKey}.${action}`;
}

export function allPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const group of ADMIN_PERMISSION_GROUPS) {
    for (const mod of group.modules) {
      for (const action of mod.actions) {
        keys.push(permissionKey(mod.key, action));
      }
    }
  }
  return keys;
}

export function isValidPermissionKey(key: string): boolean {
  const [moduleKey, action] = key.split(".");
  if (!moduleKey || !action) return false;
  for (const group of ADMIN_PERMISSION_GROUPS) {
    const mod = group.modules.find((m) => m.key === moduleKey);
    if (mod && (mod.actions as readonly string[]).includes(action)) return true;
  }
  return false;
}

/** Map admin page first segment (+ special paths) → view permission module key. */
const BASE_PATH_VIEW_PERMISSION: Record<string, string> = {
  dashboard: "dashboard",
  projects: "projects",
  reviews: "reviews",
  units: "units",
  areas: "areas",
  "project-types": "project_types",
  progress: "progress",
  "room-types": "room_types",
  amenities: "amenities",
  utilities: "utilities",
  import: "import",
  users: "users",
  "search-history": "search_history",
  "housing-calc-search-history": "housing_calc_search",
  "advance-search-history": "advance_search_history",
  customers: "customers",
  agents: "agents",
  commissions: "commissions",
  builders: "builders",
  inquiries: "inquiries",
  "payment-schedules": "payment_schedules",
  contact: "contact",
  blogs: "blogs",
  "blog-categories": "blog_categories",
  tags: "tags",
  "activity-log": "activity_log",
  vouchers: "vouchers",
  "downloaded-vouchers": "downloaded_vouchers",
  "my-teams": "teams",
  "joined-teams": "teams",
  team: "teams",
  teams: "teams",
  events: "events",
  favorites: "favorites",
  roles: "roles",
  "admin-profile": "dashboard",
  "admin-change-password": "dashboard",
  profile: "dashboard",
};

/** Nav href → view permission key (more specific paths first). */
const BASE_NAV_HREF_PERMISSION: Record<string, string> = {
  "/admin/dashboard": "dashboard.view",
  "/admin/projects/pending": "projects_pending.view",
  "/admin/projects/active": "projects_active.view",
  "/admin/projects": "projects.view",
  "/admin/reviews": "reviews.view",
  "/admin/units": "units.view",
  "/admin/areas": "areas.view",
  "/admin/project-types": "project_types.view",
  "/admin/progress": "progress.view",
  "/admin/room-types": "room_types.view",
  "/admin/amenities": "amenities.view",
  "/admin/utilities": "utilities.view",
  "/admin/import": "import.view",
  "/admin/users": "users.view",
  "/admin/search-history": "search_history.view",
  "/admin/housing-calc-search-history": "housing_calc_search.view",
  "/admin/advance-search-history": "advance_search_history.view",
  "/admin/customers": "customers.view",
  "/admin/agents": "agents.view",
  "/admin/commissions": "commissions.view",
  "/admin/builders": "builders.view",
  "/admin/inquiries": "inquiries.view",
  "/admin/payment-schedules": "payment_schedules.view",
  "/admin/contact": "contact.view",
  "/admin/blogs": "blogs.view",
  "/admin/blog-categories": "blog_categories.view",
  "/admin/tags": "tags.view",
  "/admin/activity-log": "activity_log.view",
  "/admin/vouchers": "vouchers.view",
  "/admin/downloaded-vouchers": "downloaded_vouchers.view",
  "/admin/my-teams": "teams.view",
  "/admin/joined-teams": "teams.view",
  "/admin/team/create": "teams.add",
  "/admin/teams": "teams.view",
  "/admin/events": "events.view",
  "/admin/favorites": "favorites.view",
  "/admin/roles": "roles.view",
};

// ---------------------------------------------------------------------------------------------
// Automatic sync with the admin menu (src/config/admin-nav.ts is the single source of truth).
// Adding a link to the menu automatically: lists it on the Roles screen, guards its page,
// filters it from the menu for staff without access, and maps its /api/admin/<segment>.
// The BASE_* entries above only override labels/actions and keep existing keys stable
// (roles saved in the database reference keys like "projects.view").
// ---------------------------------------------------------------------------------------------

const DEFAULT_NAV_ACTIONS: readonly PermissionAction[] = ["view", "add", "edit", "delete"];

function isAction(value: string): value is PermissionAction {
  return (PERMISSION_ACTIONS as readonly string[]).includes(value);
}

/** /admin/ad-floor-prices → "ad_floor_prices"; /admin/projects/pending → "projects_pending". */
export function navModuleKeyFromHref(href: string): string {
  return href
    .replace(/^\/admin\/?/, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/** Module key for a menu link, or null when it needs no permission (downloads, own account). */
function navItemModule(group: AdminNavGroup, item: AdminNavItem): string | null {
  if (item.permission === false || item.download || group.id === "account") return null;
  if (!item.href.startsWith("/admin/")) return null;
  if (item.permission) return item.permission;
  const base = BASE_NAV_HREF_PERMISSION[item.href];
  return base ? base.split(".")[0] : navModuleKeyFromHref(item.href);
}

function buildPermissionGroups(): AdminPermissionGroup[] {
  const groups = BASE_PERMISSION_GROUPS.map((g) => ({ ...g, modules: [...g.modules] }));
  const known = new Set(groups.flatMap((g) => g.modules.map((m) => m.key)));

  for (const navGroup of adminNavGroups) {
    for (const item of navGroup.items) {
      const key = navItemModule(navGroup, item);
      if (!key || known.has(key)) continue;
      // Put it in the permission group that already holds this menu group's modules, else by
      // label, else a new group named after the menu group.
      const siblingKeys = navGroup.items
        .map((i) => navItemModule(navGroup, i))
        .filter((k): k is string => Boolean(k) && known.has(k as string));
      let target =
        groups.find((g) => g.modules.some((m) => siblingKeys.includes(m.key))) ??
        groups.find((g) => g.label.toLowerCase() === navGroup.label.toLowerCase());
      if (!target) {
        target = { key: navGroup.id, label: navGroup.label, modules: [] };
        groups.push(target);
      }
      const actions = item.permissionActions?.filter(isAction);
      target.modules.push({
        key,
        label: item.label,
        actions: actions?.length ? actions : DEFAULT_NAV_ACTIONS,
      });
      known.add(key);
    }
  }
  return groups;
}

function buildNavMaps() {
  const navHref: Record<string, string> = {};
  const pathView: Record<string, string> = {};
  const resource: Record<string, string> = {};
  for (const navGroup of adminNavGroups) {
    for (const item of navGroup.items) {
      const key = navItemModule(navGroup, item);
      if (!key) continue;
      navHref[item.href] = `${key}.view`;
      const segment = item.href.replace(/^\/admin\/?/, "").split("/")[0];
      if (segment && !(segment in pathView)) pathView[segment] = key;
      if (segment && !(segment in resource)) resource[segment] = key;
    }
  }
  // Hand-written entries win (they keep existing keys and special cases intact).
  return {
    navHref: { ...navHref, ...BASE_NAV_HREF_PERMISSION },
    pathView: { ...pathView, ...BASE_PATH_VIEW_PERMISSION },
    resource: { ...resource, ...BASE_RESOURCE_ID_MODULE },
  };
}

const NAV_MAPS = buildNavMaps();

export const ADMIN_PERMISSION_GROUPS: AdminPermissionGroup[] = buildPermissionGroups();

/** Map /api/admin/[resource] ids → permission module keys (API guards + admin UI). */
export const ADMIN_RESOURCE_ID_MODULE: Record<string, string> = NAV_MAPS.resource;

/** Map admin page first segment (+ special paths) → view permission module key. */
export const ADMIN_PATH_VIEW_PERMISSION: Record<string, string> = NAV_MAPS.pathView;

/** Nav href → view permission key (more specific paths first). */
export const ADMIN_NAV_HREF_PERMISSION: Record<string, string> = NAV_MAPS.navHref;
