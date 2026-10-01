import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBlogFormClient } from "@/components/admin/admin-blog-form-client";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Edit blog">
      <AdminBlogFormClient mode="edit" blogId={Number(id)} />
    </AdminShell>
  );
}
