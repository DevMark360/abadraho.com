import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCustomersListClient } from "@/components/admin/admin-customers-list-client";

export default function AdminCustomersPage() {
  return (
    <AdminShell title="Customers">
      <AdminCustomersListClient />
    </AdminShell>
  );
}
