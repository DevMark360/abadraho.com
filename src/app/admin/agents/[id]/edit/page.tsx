import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAgentFormClient } from "@/components/admin/admin-agent-form-client";

export default async function AdminAgentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Edit agent">
      <AdminAgentFormClient mode="edit" agentId={Number(id)} />
    </AdminShell>
  );
}
