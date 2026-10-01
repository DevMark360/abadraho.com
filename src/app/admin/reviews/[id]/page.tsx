import { AdminShell } from "@/components/admin/admin-shell";
import { AdminReviewDetailClient } from "@/components/admin/admin-review-detail-client";

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminShell title="Review details">
      <AdminReviewDetailClient id={Number(id)} />
    </AdminShell>
  );
}
