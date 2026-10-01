import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUserDetailClient } from "@/components/admin/admin-user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="User details">
      <AdminUserDetailClient id={Number(id)} />
    </AdminShell>
  );
}
