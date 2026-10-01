import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPaymentScheduleDetailClient } from "@/components/admin/admin-payment-schedule-detail-client";

export default async function AdminPaymentScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Payment schedule details">
      <AdminPaymentScheduleDetailClient id={Number(id)} />
    </AdminShell>
  );
}
