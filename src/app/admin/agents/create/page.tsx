import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAgentFormClient } from "@/components/admin/admin-agent-form-client";

export default function AdminAgentCreatePage() {
  return (
    <AdminShell title="Add agent">
      <AdminAgentFormClient mode="create" />
    </AdminShell>
  );
}
