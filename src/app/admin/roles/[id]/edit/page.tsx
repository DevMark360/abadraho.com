import { AdminShell } from "@/components/admin/admin-shell";
import { AdminRoleFormClient } from "@/components/admin/admin-role-form-client";

export default async function AdminRoleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Edit role">
      <AdminRoleFormClient mode="edit" roleId={Number(id)} />
    </AdminShell>
  );
}
