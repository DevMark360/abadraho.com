import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAdvanceSearchHistoryClient } from "@/components/admin/admin-advance-search-history-client";

export default function AdminAdvanceSearchHistoryPage() {
  return (
    <AdminShell title="Advance search history">
      <AdminAdvanceSearchHistoryClient />
    </AdminShell>
  );
}
