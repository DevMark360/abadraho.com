import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSearchHistoryDetailClient } from "@/components/admin/admin-search-history-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSearchHistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numId = Number(id);

  return (
    <AdminShell title="Search history details">
      <AdminSearchHistoryDetailClient id={Number.isFinite(numId) ? numId : 0} />
    </AdminShell>
  );
}
