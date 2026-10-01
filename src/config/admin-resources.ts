/** Native admin CRUD resource definitions */

export type AdminFieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "faIcon";

export type AdminColumnFormat = "date" | "bool" | "faIcon";

export interface AdminField {
  name: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  optionsKey?: "areas" | "projectTypes" | "progress";
}

export interface AdminColumn {
  key: string;
  label: string;
  format?: AdminColumnFormat;
}

export interface AdminResourceDef {
  id: string;
  title: string;
  /** Prisma-backed resource key */
  model: string;
  columns: AdminColumn[];
  fields: AdminField[];
  /** Extra where clause for list (e.g. pending projects) */
  listWhere?: Record<string, unknown>;
  canCreate?: boolean;
  canDelete?: boolean;
  /** Native v2 full edit page, e.g. /admin/projects/{id}/edit */
  nativeEditPathTemplate?: string;
}

export const adminResources: Record<string, AdminResourceDef> = {
  projects: {
    id: "projects",
    title: "Projects",
    model: "project",
    canCreate: true,
    canDelete: true,
    nativeEditPathTemplate: "/admin/projects/{id}/edit",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "areaName", label: "Area" },
      { key: "status", label: "Status" },
      { key: "views", label: "Views" },
      { key: "createdAt", label: "Created", format: "date" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "areaId", label: "Area", type: "select", optionsKey: "areas" },
      { name: "projectTypeId", label: "Project type", type: "select", optionsKey: "projectTypes" },
      { name: "progressStatusId", label: "Progress", type: "select", optionsKey: "progress" },
      { name: "address", label: "Address", type: "text" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "1", label: "Live" },
          { value: "2", label: "Pending" },
          { value: "3", label: "Declined" },
        ],
      },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "minPrice", label: "Min price", type: "number" },
      { name: "discountPrice", label: "Discount price", type: "number" },
      { name: "installmentLength", label: "Installment months", type: "number" },
      { name: "metaTitle", label: "Meta title", type: "text" },
      { name: "metaDescription", label: "Meta description", type: "textarea" },
      { name: "details", label: "Details (HTML)", type: "textarea" },
    ],
  },
  units: {
    id: "units",
    title: "Units",
    model: "unit",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "projectId", label: "Project ID" },
      { key: "title", label: "Title" },
      { key: "price", label: "Price" },
      { key: "size", label: "Size" },
      { key: "rooms", label: "Rooms" },
    ],
    fields: [
      { name: "projectId", label: "Project ID", type: "number", required: true },
      { name: "title", label: "Title", type: "text" },
      { name: "price", label: "Price", type: "number" },
      { name: "size", label: "Size", type: "number" },
      { name: "rooms", label: "Rooms", type: "text" },
    ],
  },
  areas: {
    id: "areas",
    title: "Areas",
    model: "area",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
    ],
    fields: [{ name: "name", label: "Name", type: "text", required: true }],
  },
  "project-types": {
    id: "project-types",
    title: "Project types",
    model: "projectType",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Title" },
    ],
    fields: [{ name: "title", label: "Title", type: "text", required: true }],
  },
  progress: {
    id: "progress",
    title: "Progress",
    model: "progress",
    canCreate: true,
    canDelete: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
    ],
    fields: [{ name: "name", label: "Name", type: "text", required: true }],
  },
  builders: {
    id: "builders",
    title: "Builders",
    model: "builder",
    canCreate: true,
    canDelete: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "fullName", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phoneNumber", label: "Phone" },
    ],
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "phoneNumber", label: "Phone", type: "text" },
    ],
  },
  users: {
    id: "users",
    title: "Users",
    model: "user",
    canCreate: false,
    canDelete: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "email", label: "Email" },
      { key: "firstName", label: "First" },
      { key: "lastName", label: "Last" },
      { key: "phoneNumber", label: "Phone" },
      { key: "isArchive", label: "Archived", format: "bool" },
    ],
    fields: [
      { name: "firstName", label: "First name", type: "text" },
      { name: "lastName", label: "Last name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phoneNumber", label: "Phone", type: "text" },
    ],
  },
  agents: {
    id: "agents",
    title: "Agents / Brokers",
    model: "user",
    canCreate: false,
    canDelete: false,
    listWhere: { userTypeId: -10027, isArchive: false },
    columns: [
      { key: "id", label: "ID" },
      { key: "firstName", label: "First" },
      { key: "lastName", label: "Last" },
      { key: "email", label: "Email" },
      { key: "phoneNumber", label: "Phone" },
    ],
    fields: [
      { name: "firstName", label: "First name", type: "text" },
      { name: "lastName", label: "Last name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phoneNumber", label: "Phone", type: "text" },
    ],
  },
  inquiries: {
    id: "inquiries",
    title: "Inquiries (Zoho)",
    model: "inquiry",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "projectId", label: "Project" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
  blogs: {
    id: "blogs",
    title: "Blogs",
    model: "blog",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "categoryId", label: "Category" },
      { key: "createdAt", label: "Created", format: "date" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "categoryId", label: "Category ID", type: "number" },
      { name: "description", label: "Content (HTML)", type: "textarea" },
      { name: "coverImg", label: "Cover image filename", type: "text" },
    ],
  },
  "blog-categories": {
    id: "blog-categories",
    title: "Blog categories",
    model: "blogCategory",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "title", label: "Title" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
    ],
  },
  reviews: {
    id: "reviews",
    title: "Project Reviews",
    model: "review",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "projectId", label: "Project" },
      { key: "rating", label: "Rating" },
      { key: "comment", label: "Review" },
      { key: "userId", label: "User" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [
      { name: "rating", label: "Rating (1-5)", type: "number", required: true },
      { name: "comment", label: "Comment", type: "textarea" },
    ],
  },
  "ad-floor-prices": {
    id: "ad-floor-prices",
    title: "Ad floor prices",
    model: "adFloorPrice",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "areaId", label: "Area" },
      { key: "projectTypeId", label: "Property type" },
      { key: "placementType", label: "Placement" },
      { key: "floorCpm", label: "Floor CPM (Rs.)" },
    ],
    fields: [
      { name: "areaId", label: "Area (leave blank for any)", type: "select", optionsKey: "areas" },
      {
        name: "projectTypeId",
        label: "Property type (leave blank for any)",
        type: "select",
        optionsKey: "projectTypes",
      },
      {
        name: "placementType",
        label: "Placement",
        type: "select",
        required: true,
        options: [
          { value: "featured_listing", label: "Featured listing" },
          { value: "banner", label: "Banner" },
        ],
      },
      { name: "floorCpm", label: "Floor CPM (Rs. per 1000 impressions)", type: "number", required: true },
    ],
  },
  "ad-campaigns": {
    id: "ad-campaigns",
    title: "Ad campaigns",
    model: "adCampaign",
    canCreate: false,
    canDelete: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "builderId", label: "Builder" },
      { key: "projectId", label: "Project" },
      { key: "placementType", label: "Placement" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "maxBidCpm", label: "Max bid CPM" },
      { key: "budgetCap", label: "Budget" },
      { key: "startDate", label: "Starts", format: "date" },
      { key: "endDate", label: "Ends", format: "date" },
    ],
    fields: [],
  },
  "ad-wallet-transactions": {
    id: "ad-wallet-transactions",
    title: "Ad wallet top-up requests",
    model: "adWalletTransaction",
    canCreate: false,
    canDelete: false,
    columns: [
      { key: "id", label: "ID" },
      { key: "walletId", label: "Wallet" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "referenceNote", label: "Reference" },
      { key: "createdAt", label: "Submitted", format: "date" },
    ],
    fields: [],
  },
  contact: {
    id: "contact",
    title: "Contact messages",
    model: "contactUs",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
  "search-history": {
    id: "search-history",
    title: "User search history",
    model: "userSearchHistory",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "userId", label: "User" },
      { key: "searchType", label: "Type" },
      { key: "maxPrice", label: "Max price" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [],
  },
  "housing-calc-search-history": {
    id: "housing-calc-search-history",
    title: "Housing calculator search",
    model: "userSearchHistory",
    canCreate: false,
    canDelete: true,
    listWhere: { searchType: "calculator" },
    columns: [
      { key: "id", label: "ID" },
      { key: "userId", label: "User" },
      { key: "maxBudget", label: "Max budget" },
      { key: "downPayment", label: "Down payment" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [],
  },
  "advance-search-history": {
    id: "advance-search-history",
    title: "Advance search history",
    model: "userSearchHistory",
    canCreate: false,
    canDelete: true,
    listWhere: { searchType: "filter" },
    columns: [
      { key: "id", label: "ID" },
      { key: "userId", label: "User" },
      { key: "searchType", label: "Type" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [],
  },
  favorites: {
    id: "favorites",
    title: "Favorites / Wishlists",
    model: "wishlist",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "userName", label: "User" },
      { key: "projectName", label: "Project" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [],
  },
  customers: {
    id: "customers",
    title: "Customers (website users)",
    model: "customer",
    canCreate: false,
    canDelete: false,
    listWhere: { userTypeId: -10024, isArchive: false },
    columns: [
      { key: "id", label: "ID" },
      { key: "email", label: "Email" },
      { key: "firstName", label: "First" },
      { key: "lastName", label: "Last" },
      { key: "phoneNumber", label: "Phone" },
      { key: "isPhoneNoVerified", label: "Phone verified", format: "bool" },
    ],
    fields: [
      { name: "firstName", label: "First name", type: "text" },
      { name: "lastName", label: "Last name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phoneNumber", label: "Phone", type: "text" },
    ],
  },
  "activity-log": {
    id: "activity-log",
    title: "Activity log",
    model: "activityLog",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "logName", label: "Log name" },
      { key: "conversionId", label: "Conversion" },
      { key: "userName", label: "User" },
      { key: "pageUrl", label: "Page" },
      { key: "ip", label: "IP" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [],
  },
  "downloaded-vouchers": {
    id: "downloaded-vouchers",
    title: "Downloaded vouchers",
    model: "userVoucher",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "userId", label: "User" },
      { key: "voucherId", label: "Voucher" },
      { key: "voucherCode", label: "Code" },
      { key: "createdAt", label: "Date", format: "date" },
    ],
    fields: [],
  },
  amenities: {
    id: "amenities",
    title: "Amenities",
    model: "amenity",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "isActive", label: "Active", format: "bool" },
      { key: "isArchive", label: "Archived", format: "bool" },
    ],
    fields: [
      { name: "name", label: "Amenity Name", type: "text", required: true },
    ],
  },
  utilities: {
    id: "utilities",
    title: "Utilities",
    model: "utility",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "isActive", label: "Active", format: "bool" },
      { key: "isArchive", label: "Archived", format: "bool" },
    ],
    fields: [
      { name: "name", label: "Utility Name", type: "text", required: true },
    ],
  },
  tags: {
    id: "tags",
    title: "Tags",
    model: "tag",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "isArchive", label: "Archived", format: "bool" },
    ],
    fields: [
      { name: "name", label: "Tag Name", type: "text", required: true },
    ],
  },
  "room-types": {
    id: "room-types",
    title: "Room Types",
    model: "roomType",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Room Type Name" },
      { key: "icon", label: "Icon", format: "faIcon" },
      { key: "toShow", label: "Show in UI", format: "bool" },
      { key: "sortOrder", label: "Sort Order" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "icon", label: "Icon", type: "faIcon" },
      {
        name: "toShow",
        label: "Show on listing",
        type: "select",
        options: [
          { value: "1", label: "Yes" },
          { value: "0", label: "No" },
        ],
      },
      { name: "sortOrder", label: "Sort Order", type: "number" },
    ],
  },
  vouchers: {
    id: "vouchers",
    title: "Vouchers",
    model: "voucher",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "status", label: "Status" },
      { key: "expiresAt", label: "Expires", format: "date" },
    ],
    fields: [
      { name: "name", label: "Voucher Name", type: "text", required: true },
      { name: "code", label: "Voucher Code", type: "text", required: true },
      { name: "projectId", label: "Project ID", type: "number" },
      { name: "discountBy", label: "Discount By", type: "text" },
      { name: "discountApplied", label: "Discount Applied (1=yes)", type: "number" },
      { name: "discountValue", label: "Discount Value", type: "number" },
      { name: "status", label: "Status (1=active)", type: "number" },
    ],
  },
  teams: {
    id: "teams",
    title: "Builder Teams",
    model: "team",
    canCreate: true,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Team Name" },
      { key: "slug", label: "Slug" },
      { key: "teamLeadId", label: "Lead Builder ID" },
    ],
    fields: [
      { name: "name", label: "Team Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "teamLeadId", label: "Team Lead (Builder ID)", type: "number" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  "payment-schedules": {
    id: "payment-schedules",
    title: "Payment Schedules",
    model: "paymentSchedule",
    canCreate: false,
    canDelete: true,
    columns: [
      { key: "id", label: "ID" },
      { key: "userId", label: "User ID" },
      { key: "projectId", label: "Project ID" },
      { key: "unitId", label: "Unit ID" },
      { key: "downPayment", label: "Down Payment" },
      { key: "monthlyInstallment", label: "Monthly" },
      { key: "createdAt", label: "Calculated At", format: "date" },
    ],
    fields: [],
  },
};

/** Route segment → resource id */
export function resolveAdminResource(segments: string[]): AdminResourceDef | null {
  const key = segments.join("/");
  if (key === "projects/pending") {
    return {
      ...adminResources.projects,
      id: "projects-pending",
      title: "Pending Projects",
      listWhere: { status: 2, isArchive: false },
    };
  }
  if (key === "projects/active") {
    return {
      ...adminResources.projects,
      id: "projects-active",
      title: "Active Projects",
      listWhere: { status: 1, isArchive: false },
    };
  }
  if (key === "housing-calc-search-history") {
    return adminResources["housing-calc-search-history"] ?? null;
  }
  if (key === "advance-search-history") {
    return adminResources["advance-search-history"] ?? null;
  }
  return adminResources[key] ?? null;
}

export function getResourceById(id: string): AdminResourceDef | null {
  if (id === "projects-pending") {
    return resolveAdminResource(["projects", "pending"]);
  }
  if (id === "projects-active") {
    return resolveAdminResource(["projects", "active"]);
  }
  if (id === "housing-calc-search-history" || id === "advance-search-history") {
    return adminResources[id] ?? null;
  }
  return adminResources[id] ?? null;
}
