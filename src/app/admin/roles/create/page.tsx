import { AdminShell } from "@/components/admin/admin-shell";
import { AdminRoleFormClient } from "@/components/admin/admin-role-form-client";

export default function AdminRoleCreatePage() {
  return (
    <AdminShell title="Add role">
      <AdminRoleFormClient mode="create" />
    </AdminShell>
  );
}
