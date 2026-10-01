import { AdminShell } from "@/components/admin/admin-shell";
import { AdminImportHubClient } from "@/components/admin/admin-import-hub-client";

export default function AdminImportHubPage() {
  return (
    <AdminShell title="Bulk import">
      <AdminImportHubClient />
    </AdminShell>
  );
}
