import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAreasClient } from "@/components/admin/admin-areas-client";

export default function AdminAreasPage() {
  return (
    <AdminShell title="Areas">
      <AdminAreasClient />
    </AdminShell>
  );
}
