import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProgressListClient } from "@/components/admin/admin-progress-list-client";

export default function AdminProgressPage() {
  return (
    <AdminShell title="Progress statuses">
      <AdminProgressListClient />
    </AdminShell>
  );
}
