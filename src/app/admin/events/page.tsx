import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEventsClient } from "@/components/admin/admin-events-client";

export default function AdminEventsPage() {
  return (
    <AdminShell title="Events">
      <AdminEventsClient />
    </AdminShell>
  );
}
