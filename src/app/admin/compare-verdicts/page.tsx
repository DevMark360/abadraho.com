import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCompareVerdictsClient } from "@/components/admin/admin-compare-verdicts-client";

export default function AdminCompareVerdictsPage() {
  return (
    <AdminShell title="Compare AI verdicts">
      <AdminCompareVerdictsClient />
    </AdminShell>
  );
}
