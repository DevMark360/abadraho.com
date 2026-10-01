import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHousingCalcSearchHistoryClient } from "@/components/admin/admin-housing-calc-search-history-client";

export default function AdminHousingCalcSearchHistoryPage() {
  return (
    <AdminShell title="Housing calculator search">
      <AdminHousingCalcSearchHistoryClient />
    </AdminShell>
  );
}
