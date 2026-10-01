import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBuilderFormClient } from "@/components/admin/admin-builder-form-client";

export default async function AdminBuilderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Edit builder">
      <AdminBuilderFormClient mode="edit" builderId={Number(id)} />
    </AdminShell>
  );
}
