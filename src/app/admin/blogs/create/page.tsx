import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBlogFormClient } from "@/components/admin/admin-blog-form-client";

export default function AdminBlogCreatePage() {
  return (
    <AdminShell title="Add blog">
      <AdminBlogFormClient mode="create" />
    </AdminShell>
  );
}
