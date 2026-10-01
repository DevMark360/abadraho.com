import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDownloadedVouchersClient } from "@/components/admin/admin-downloaded-vouchers-client";

export default function AdminDownloadedVouchersPage() {
  return (
    <AdminShell title="Downloaded vouchers">
      <AdminDownloadedVouchersClient />
    </AdminShell>
  );
}
