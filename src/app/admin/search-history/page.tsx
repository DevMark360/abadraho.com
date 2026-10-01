import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSearchHistoryListClient } from "@/components/admin/admin-search-history-list-client";

export default function AdminSearchHistoryPage() {
  return (
    <AdminShell title="User search history">
      <AdminSearchHistoryListClient />
    </AdminShell>
  );
}
