import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUserFormClient } from "@/components/admin/admin-user-form-client";

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Edit user">
      <AdminUserFormClient mode="edit" userId={Number(id)} />
    </AdminShell>
  );
}
