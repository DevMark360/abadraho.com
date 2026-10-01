import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectsListClient } from "@/components/admin/admin-projects-list-client";

export default function AdminProjectsPage() {
  return (
    <AdminShell title="Projects">
      <AdminProjectsListClient mode="all" />
    </AdminShell>
  );
}
