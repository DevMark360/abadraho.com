import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProfileClient } from "@/components/admin/admin-profile-client";

/** Legacy: GET /admin/admin-profile */
export default function AdminProfileLegacyPage() {
  return (
    <AdminShell title="Admin profile">
      <AdminProfileClient />
    </AdminShell>
  );
}
