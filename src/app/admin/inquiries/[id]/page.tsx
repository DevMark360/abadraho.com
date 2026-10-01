import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInquiryDetailClient } from "@/components/admin/admin-inquiry-detail-client";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Inquiry details">
      <AdminInquiryDetailClient id={Number(id)} />
    </AdminShell>
  );
}
