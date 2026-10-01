import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectsListClient } from "@/components/admin/admin-projects-list-client";

export default function AdminPendingProjectsPage() {
  return (
    <AdminShell title="Pending Projects">
      <AdminProjectsListClient mode="pending" />
    </AdminShell>
  );
}
