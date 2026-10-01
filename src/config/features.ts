/**

 * Feature registry — maps legacy Laravel routes to v2 modules.

 */

export type FeatureStatus = "done" | "in_progress" | "planned";



export interface FeatureModule {

  id: string;

  name: string;

  status: FeatureStatus;

  legacyRoutes?: string[];

  v2Routes: string[];

  description: string;

}



export const featureModules: FeatureModule[] = [

  {

    id: "off-plan",

    name: "Off-plan listings (Reelly-style)",

    status: "done",

    legacyRoutes: ["/off-plan", "/projects", "/projects/listings"],

    v2Routes: ["/", "/off-plan", "?view=map"],

    description: "Filter sidebar, split map, legacy API + filters",

  },

  {

    id: "project-detail",

    name: "Project detail",

    status: "done",

    legacyRoutes: ["/project/{slug}", "/download-pdf"],

    v2Routes: ["/project/[slug]", "/download-pdf/[id]/[file]"],

    description: "Units, reviews, inquiry, voucher, PDF",

  },

  {

    id: "compare",

    name: "Compare projects",

    status: "done",

    legacyRoutes: ["/compare", "/compare-2"],

    v2Routes: ["/compare"],

    description: "Side-by-side and advanced table compare",

  },

  {

    id: "wishlist",

    name: "Wishlist",

    status: "in_progress",

    legacyRoutes: ["/user/wishlist", "/add-wishlist"],

    v2Routes: ["/account/wishlist", "/api/v1/wishlist"],

    description: "Local + server sync when DB/auth available",

  },

  {

    id: "auth",

    name: "Authentication",

    status: "in_progress",

    legacyRoutes: ["/login", "/register", "OAuth"],

    v2Routes: ["/login", "/register", "/api/v1/auth/*"],

    description: "DB + legacy API login; OAuth via legacy links",

  },

  {

    id: "blog",

    name: "Blog",

    status: "done",

    legacyRoutes: ["/blogs", "/{category}/{slug}"],

    v2Routes: ["/blog", "/blog/[category]/[slug]"],

    description: "List and article pages (DB or demo)",

  },

  {

    id: "broker",

    name: "Broker tools",

    status: "in_progress",

    legacyRoutes: ["/broker/*", "/p/{slug}/{code}"],

    v2Routes: ["/broker", "/p/[slug]/[code]"],

    description: "Hub + legacy deep links for decks/cards",

  },

  {

    id: "admin",

    name: "Admin panel",

    status: "done",

    legacyRoutes: ["/admin/*"],

    v2Routes: ["/admin", "/api/admin/*"],

    description: "Native CRUD for Prisma models + legacy fallback for vouchers/tags/etc.",

  },

  {

    id: "api",

    name: "Mobile / public API",

    status: "in_progress",

    legacyRoutes: ["/api/*"],

    v2Routes: ["/api/v1/*", "/api/v1/proxy"],

    description: "Projects, meta, auth, filters, proxy",

  },

  {

    id: "zoho",

    name: "Zoho CRM inquiries",

    status: "done",

    legacyRoutes: ["/api/zohoForm", "web/project-detail/inquiry"],

    v2Routes: ["/api/v1/inquiries"],

    description: "Lead capture",

  },

  {

    id: "contact",

    name: "Contact us",

    status: "done",

    legacyRoutes: ["/contact-us"],

    v2Routes: ["/contact"],

    description: "Contact form",

  },

  {

    id: "payment-schedule",

    name: "Payment schedule calculator",

    status: "done",

    legacyRoutes: ["/projects/payment-schedule"],

    v2Routes: ["/api/v1/payment-schedule"],

    description: "Installment calculator",

  },

  {

    id: "static",

    name: "Static pages",

    status: "done",

    legacyRoutes: ["/about-us", "/terms-conditions", "/sitemap.xml"],

    v2Routes: ["/about-us", "/terms-conditions", "/sitemap.xml"],

    description: "About, terms, sitemap",

  },

];



export function getFeatureProgress() {

  const total = featureModules.length;

  const done = featureModules.filter((f) => f.status === "done").length;

  const inProgress = featureModules.filter((f) => f.status === "in_progress").length;

  return { total, done, inProgress, percent: Math.round((done / total) * 100) };

}


