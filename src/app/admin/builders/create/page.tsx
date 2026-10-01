import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBuilderFormClient } from "@/components/admin/admin-builder-form-client";

export default function AdminBuilderCreatePage() {
  return (
    <AdminShell title="Add builder">
      <AdminBuilderFormClient mode="create" />
    </AdminShell>
  );
}
