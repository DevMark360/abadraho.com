import { AdminShell } from "@/components/admin/admin-shell";
import { AdminVouchersListClient } from "@/components/admin/admin-vouchers-list-client";

export default function AdminVouchersPage() {
  return (
    <AdminShell title="Vouchers">
      <AdminVouchersListClient />
    </AdminShell>
  );
}
