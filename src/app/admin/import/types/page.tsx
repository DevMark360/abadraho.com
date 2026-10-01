import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCsvImportClient } from "@/components/admin/admin-csv-import-client";

export default function ImportTypesPage() {
  return (
    <AdminShell title="Import project types">
      <AdminCsvImportClient
        title="Import project types (.csv)"
        description="Creates rows in project_type (skips duplicate titles)."
        hint='Expected header: title (or "name").'
        apiUrl="/api/admin/import/types"
        backHref="/admin/import"
        backLabel="Bulk import"
      />
    </AdminShell>
  );
}
