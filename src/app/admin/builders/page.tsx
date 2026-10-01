import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBuildersListClient } from "@/components/admin/admin-builders-list-client";

export default function AdminBuildersPage() {
  return (
    <AdminShell title="Builders">
      <AdminBuildersListClient />
    </AdminShell>
  );
}
