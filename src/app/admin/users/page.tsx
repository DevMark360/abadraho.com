import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersListClient } from "@/components/admin/admin-users-list-client";

export default function AdminUsersPage() {
  return (
    <AdminShell title="User listing">
      <AdminUsersListClient />
    </AdminShell>
  );
}
