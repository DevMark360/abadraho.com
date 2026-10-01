import { AdminShell } from "@/components/admin/admin-shell";
import { AdminVoucherFormClient } from "@/components/admin/admin-voucher-form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVoucherEditPage({ params }: PageProps) {
  const { id } = await params;
  const voucherId = Number(id);

  return (
    <AdminShell title="Edit voucher">
      <AdminVoucherFormClient mode="edit" voucherId={voucherId} />
    </AdminShell>
  );
}
