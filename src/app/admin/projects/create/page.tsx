import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectFormClient } from "@/components/admin/admin-project-form-client";

export default function AdminProjectCreatePage() {
  return (
    <AdminShell title="Add Project">
      <AdminProjectFormClient mode="create" />
    </AdminShell>
  );
}
