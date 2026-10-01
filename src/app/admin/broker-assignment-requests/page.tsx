import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBrokerAssignmentRequestsClient } from "@/components/admin/admin-broker-assignment-requests-client";

export default function AdminBrokerAssignmentRequestsPage() {
  return (
    <AdminShell title="Broker assignment requests">
      <AdminBrokerAssignmentRequestsClient />
    </AdminShell>
  );
}
