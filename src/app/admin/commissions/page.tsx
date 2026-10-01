import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCommissionsClient } from "@/components/admin/admin-commissions-client";

export default function AdminCommissionsPage() {
  return (
    <AdminShell title="Commissions">
      <AdminCommissionsClient />
    </AdminShell>
  );
}
