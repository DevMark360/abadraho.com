import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminResourceClient } from "@/components/admin/admin-resource-client";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { resolveAdminResource } from "@/config/admin-resources";

interface PageProps {
  params: Promise<{ segments: string[] }>;
}

function getResourceId(segments: string[]): string {
  const key = segments.join("/");
  if (key === "projects/pending") return "projects-pending";
  if (key === "projects/active") return "projects-active";
  if (key === "housing-calc-search-history") return "housing-calc-search-history";
  if (key === "advance-search-history") return "advance-search-history";
  return key;
}

export default async function AdminCatchAllPage({ params }: PageProps) {
  const { segments } = await params;

  if (segments.length === 0) {
    redirect("/admin/dashboard");
  }

  if (segments[0] === "login") {
    redirect("/login?ref=/admin/dashboard");
  }

  if (segments[0] === "dashboard" && segments.length === 1) {
    return (
      <AdminShell title="Dashboard">
        <AdminDashboardClient />
      </AdminShell>
    );
  }

  if (segments[0] === "manage_users" && segments.length === 2) {
    redirect(`/admin/users/${segments[1]}`);
  }
  if (segments[0] === "agents" && segments.length === 2) {
    redirect(`/admin/agents/${segments[1]}`);
  }
  if (segments[0] === "blog" && segments.length === 1) {
    redirect("/admin/blogs");
  }
  if (segments[0] === "blog" && segments[1] === "create") {
    redirect("/admin/blogs/create");
  }
  if (segments[0] === "blog" && segments.length === 3 && segments[2] === "edit") {
    redirect(`/admin/blogs/${segments[1]}/edit`);
  }
  if (segments[0] === "blog_category") {
    redirect("/admin/blog-categories");
  }

  if (
    segments[0] === "users" ||
    segments[0] === "builders" ||
    segments[0] === "agents" ||
    segments[0] === "customers" ||
    segments[0] === "search-history" ||
    segments[0] === "housing-calc-search-history" ||
    segments[0] === "advance-search-history" ||
    segments[0] === "inquiries" ||
    segments[0] === "payment-schedules" ||
    segments[0] === "contact" ||
    segments[0] === "vouchers" ||
    segments[0] === "downloaded-vouchers" ||
    segments[0] === "units" ||
    segments[0] === "reviews" ||
    segments[0] === "teams" ||
    segments[0] === "my-teams" ||
    segments[0] === "joined-teams" ||
    segments[0] === "team" ||
    segments[0] === "my-team" ||
    segments[0] === "profile" ||
    segments[0] === "admin-profile" ||
    segments[0] === "admin-change-password" ||
    segments[0] === "blogs" ||
    segments[0] === "blog-categories" ||
    segments[0] === "progress" ||
    segments[0] === "import"
  ) {
    notFound();
  }

  if (segments[0] === "projects") {
    const { AdminProjectsListClient } = await import(
      "@/components/admin/admin-projects-list-client"
    );
    if (segments.length === 1) {
      return (
        <AdminShell title="Projects">
          <AdminProjectsListClient mode="all" />
        </AdminShell>
      );
    }
    if (segments.length === 2 && segments[1] === "pending") {
      return (
        <AdminShell title="Pending Projects">
          <AdminProjectsListClient mode="pending" />
        </AdminShell>
      );
    }
    if (segments.length === 2 && segments[1] === "active") {
      return (
        <AdminShell title="Active Projects">
          <AdminProjectsListClient mode="active" />
        </AdminShell>
      );
    }
    if (segments.length === 3 && segments[1] === "review") {
      const { redirect } = await import("next/navigation");
      redirect(`/admin/reviews/${segments[2]}`);
    }
  }

  const resource = resolveAdminResource(segments);
  if (resource) {
    const resourceId = getResourceId(segments);
    return (
      <AdminShell title={resource.title}>
        <AdminResourceClient resourceId={resourceId} def={resource} />
      </AdminShell>
    );
  }

  notFound();
}
