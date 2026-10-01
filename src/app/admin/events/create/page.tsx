import { AdminShell } from "@/components/admin/admin-shell";
import { AdminEventFormClient } from "@/components/admin/admin-event-form-client";

export default function AdminEventCreatePage() {
  return (
    <AdminShell title="Create event">
      <AdminEventFormClient mode="create" />
    </AdminShell>
  );
}
