import { AdminShell } from "@/components/admin/admin-shell";
import { AdminContactDetailClient } from "@/components/admin/admin-contact-detail-client";

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Contact inquiry">
      <AdminContactDetailClient id={Number(id)} />
    </AdminShell>
  );
}
