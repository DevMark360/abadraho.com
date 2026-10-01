import { AdminShell } from "@/components/admin/admin-shell";
import { AdminChangePasswordClient } from "@/components/admin/admin-change-password-client";

/** Legacy: GET /admin/admin-change-password */
export default function AdminChangePasswordLegacyPage() {
  return (
    <AdminShell title="Admin change password">
      <AdminChangePasswordClient />
    </AdminShell>
  );
}
