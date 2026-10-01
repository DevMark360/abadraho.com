import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBlogDetailClient } from "@/components/admin/admin-blog-detail-client";

export default async function AdminBlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Blog details">
      <AdminBlogDetailClient id={Number(id)} />
    </AdminShell>
  );
}
