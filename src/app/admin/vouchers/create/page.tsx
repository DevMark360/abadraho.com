import { AdminShell } from "@/components/admin/admin-shell";
import { AdminVoucherFormClient } from "@/components/admin/admin-voucher-form-client";

export default function AdminVoucherCreatePage() {
  return (
    <AdminShell title="Create voucher">
      <AdminVoucherFormClient mode="create" />
    </AdminShell>
  );
}
