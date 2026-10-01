import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBlogsListClient } from "@/components/admin/admin-blogs-list-client";

export default function AdminBlogsPage() {
  return (
    <AdminShell title="Blogs">
      <AdminBlogsListClient />
    </AdminShell>
  );
}
