import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAgentsListClient } from "@/components/admin/admin-agents-list-client";

export default function AdminAgentsPage() {
  return (
    <AdminShell title="Agents / brokers">
      <AdminAgentsListClient />
    </AdminShell>
  );
}
