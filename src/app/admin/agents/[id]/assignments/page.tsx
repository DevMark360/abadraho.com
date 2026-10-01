import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAgentAssignmentsClient } from "@/components/admin/admin-agent-assignments-client";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell title="Project assignments">
      <AdminAgentAssignmentsClient agentId={Number(id)} />
    </AdminShell>
  );
}
