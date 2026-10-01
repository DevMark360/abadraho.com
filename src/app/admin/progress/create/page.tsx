import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProgressFormClient } from "@/components/admin/admin-progress-form-client";

export default function AdminProgressCreatePage() {
  return (
    <AdminShell title="Add progress">
      <AdminProgressFormClient mode="create" />
    </AdminShell>
  );
}
