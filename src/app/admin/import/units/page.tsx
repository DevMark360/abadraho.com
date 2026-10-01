import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCsvImportClient } from "@/components/admin/admin-csv-import-client";

export default function ImportUnitsPage() {
  return (
    <AdminShell title="Import units">
      <AdminCsvImportClient
        title="Import units (.csv)"
        description="Creates unit rows linked to an existing project."
        hint="Required columns: project_id, title, price. Optional: down_payment, monthly_installment, unit_type_id, rooms."
        apiUrl="/api/admin/import/units"
        backHref="/admin/import"
        backLabel="Bulk import"
      />
    </AdminShell>
  );
}
