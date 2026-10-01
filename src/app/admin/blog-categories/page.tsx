import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBlogCategoriesClient } from "@/components/admin/admin-blog-categories-client";

export default function AdminBlogCategoriesPage() {
  return (
    <AdminShell title="Blog categories">
      <AdminBlogCategoriesClient />
    </AdminShell>
  );
}
