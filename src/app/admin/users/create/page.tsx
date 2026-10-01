import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUserFormClient } from "@/components/admin/admin-user-form-client";

export default function AdminUserCreatePage() {
  return (
    <AdminShell title="Add user">
      <AdminUserFormClient mode="create" />
    </AdminShell>
  );
}
