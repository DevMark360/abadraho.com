/**
 * Internal module registry — maps v2 `/admin/*` routes to titles and legacy URLs.
 * `legacyPath` + `checklistId` are for docs/CI only (see docs/LEGACY_INTEGRATION_MATRIX.md).
 * Do not surface legacy paths or checklist IDs in the UI.
 */
export const adminModules: Record<
  string,
  { title: string; legacyPath: string; description: string; checklistId?: string }
> = {
  dashboard: {
    title: "Dashboard",
    legacyPath: "/admin/dashboard",
    description: "Overview and shortcuts.",
    checklistId: "H2",
  },
  login: {
    title: "Workspace sign in",
    legacyPath: "/admin/login",
    description: "Sign in for builders and staff.",
    checklistId: "H1",
  },
  projects: {
    title: "Projects",
    legacyPath: "/admin/project",
    description: "Add and edit developments shown on the public site.",
    checklistId: "H3",
  },
  "projects/pending": {
    title: "Pending projects",
    legacyPath: "/admin/pending/project",
    description: "Projects waiting for approval.",
    checklistId: "H3",
  },
  "projects/active": {
    title: "Active projects",
    legacyPath: "/admin/active/project",
    description: "Live projects on abadraho.com.",
    checklistId: "H3",
  },
  units: {
    title: "Units",
    legacyPath: "/admin/unit",
    description: "Unit pricing, rooms, and availability.",
    checklistId: "H4",
  },
  areas: {
    title: "Areas",
    legacyPath: "/admin/area",
    description: "Locations and neighbourhoods.",
    checklistId: "H5",
  },
  "project-types": {
    title: "Project types",
    legacyPath: "/admin/project_type",
    description: "Apartment, villa, and other property types.",
    checklistId: "H6",
  },
  builders: {
    title: "Builders",
    legacyPath: "/admin/builder",
    description: "Developer accounts.",
    checklistId: "H7",
  },
  users: {
    title: "Users",
    legacyPath: "/admin/manage_users",
    description: "Member accounts.",
    checklistId: "H8",
  },
  agents: {
    title: "Agents / Brokers",
    legacyPath: "/admin/agents",
    description: "Broker portal accounts.",
    checklistId: "H9",
  },
  inquiries: {
    title: "Property inquiries",
    legacyPath: "/admin/listing",
    description: "Leads from project pages.",
    checklistId: "H10",
  },
  "search-history": {
    title: "Search history",
    legacyPath: "/admin/search-history",
    description: "Saved buyer searches.",
    checklistId: "H11",
  },
  vouchers: {
    title: "Vouchers",
    legacyPath: "/admin/voucher",
    description: "Promo and download codes.",
    checklistId: "H12",
  },
  blogs: {
    title: "Blogs",
    legacyPath: "/admin/blog",
    description: "News and articles.",
    checklistId: "H13",
  },
  "blog-categories": {
    title: "Blog categories",
    legacyPath: "/admin/blog_category",
    description: "Organise blog posts.",
    checklistId: "H13",
  },
  tags: {
    title: "Tags",
    legacyPath: "/admin/tag",
    description: "Labels for projects.",
    checklistId: "H14",
  },
  progress: {
    title: "Progress",
    legacyPath: "/admin/progress",
    description: "Construction milestones.",
    checklistId: "H14",
  },
  "room-types": {
    title: "Room types",
    legacyPath: "/admin/room_type",
    description: "Bedroom and layout types.",
    checklistId: "H14",
  },
  amenities: {
    title: "Amenities",
    legacyPath: "/admin/amenities",
    description: "Pool, gym, parking, and more.",
    checklistId: "H15",
  },
  utilities: {
    title: "Utilities",
    legacyPath: "/admin/utilities",
    description: "Gas, water, electricity options.",
    checklistId: "H15",
  },
  contact: {
    title: "Contact messages",
    legacyPath: "/admin/contact",
    description: "Messages from the contact form.",
    checklistId: "H16",
  },
  "payment-schedules": {
    title: "Payment schedules",
    legacyPath: "/admin/payment-schedules",
    description: "Payment plan calculator leads.",
    checklistId: "H17",
  },
  reviews: {
    title: "Reviews",
    legacyPath: "/admin/reviews",
    description: "User ratings and feedback.",
    checklistId: "H18",
  },
  teams: {
    title: "Teams",
    legacyPath: "/admin/my-teams",
    description: "Builder teams and members.",
    checklistId: "H19",
  },
  "activity-log": {
    title: "Activity log",
    legacyPath: "/admin/activity-log",
    description: "Recent changes in the workspace.",
    checklistId: "H20",
  },
  profile: {
    title: "Profile",
    legacyPath: "/admin/admin-profile",
    description: "Your name, photo, and contact details.",
    checklistId: "H21",
  },
  import: {
    title: "CSV import",
    legacyPath: "/admin/project",
    description: "Bulk upload projects, units, and lookups.",
    checklistId: "H22",
  },
  customers: {
    title: "Customers",
    legacyPath: "/admin/cutomers",
    description: "Registered buyers.",
    checklistId: "H23",
  },
  favorites: {
    title: "Favorites",
    legacyPath: "/admin/favorites",
    description: "Saved wishlists.",
    checklistId: "H23",
  },
};

export function resolveAdminModule(segments: string[]) {
  const key = segments.join("/") || "dashboard";
  return adminModules[key] ?? null;
}
