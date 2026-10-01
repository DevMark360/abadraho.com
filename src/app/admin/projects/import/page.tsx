import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectImportClient } from "@/components/admin/admin-project-import-client";

export default function AdminProjectImportPage() {
  return (
    <AdminShell title="Import Projects">
      <AdminProjectImportClient />
    </AdminShell>
  );
}
