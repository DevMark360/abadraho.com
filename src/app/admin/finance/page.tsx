import { AdminShell } from "@/components/admin/admin-shell";
import { AdminFinanceClient } from "@/components/admin/admin-finance-client";

export default function AdminFinancePage() {
  return (
    <AdminShell title="Finance overview">
      <AdminFinanceClient />
    </AdminShell>
  );
}
