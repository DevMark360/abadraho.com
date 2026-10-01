import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAgentDetailClient } from "@/components/admin/admin-agent-detail-client";

export default async function AdminAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Agent details">
      <AdminAgentDetailClient id={Number(id)} />
    </AdminShell>
  );
}
