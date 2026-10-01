import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCsvImportClient } from "@/components/admin/admin-csv-import-client";

export default function ImportAreasPage() {
  return (
    <AdminShell title="Import areas">
      <AdminCsvImportClient
        title="Import areas (.csv)"
        description="Creates new rows in the areas table (skips duplicates by name)."
        hint='Expected header: name (or "area").'
        apiUrl="/api/admin/import/areas"
        backHref="/admin/import"
        backLabel="Bulk import"
      />
    </AdminShell>
  );
}
