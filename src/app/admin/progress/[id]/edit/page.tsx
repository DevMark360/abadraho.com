import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProgressFormClient } from "@/components/admin/admin-progress-form-client";

export default async function AdminProgressEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Edit progress">
      <AdminProgressFormClient mode="edit" progressId={Number(id)} />
    </AdminShell>
  );
}
