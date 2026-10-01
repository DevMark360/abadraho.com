import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPaymentSchedulesClient } from "@/components/admin/admin-payment-schedules-client";

export default function AdminPaymentSchedulesPage() {
  return (
    <AdminShell title="Payment plan inquiries">
      <AdminPaymentSchedulesClient />
    </AdminShell>
  );
}
