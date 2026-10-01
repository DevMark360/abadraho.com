import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectsListClient } from "@/components/admin/admin-projects-list-client";

export default function AdminActiveProjectsPage() {
  return (
    <AdminShell title="Active Projects">
      <AdminProjectsListClient mode="active" />
    </AdminShell>
  );
}
