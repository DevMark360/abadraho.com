import { AdminShell } from "@/components/admin/admin-shell";
import { AdminRolesListClient } from "@/components/admin/admin-roles-list-client";

export default function AdminRolesPage() {
  return (
    <AdminShell title="Roles">
      <AdminRolesListClient />
    </AdminShell>
  );
}
