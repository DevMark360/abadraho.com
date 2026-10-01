import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUserSearchAnalyticsClient } from "@/components/admin/admin-user-search-analytics-client";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserSearchAnalyticsPage({ params }: PageProps) {
  const { userId } = await params;
  return (
    <AdminShell title="User activity analytics">
      <AdminUserSearchAnalyticsClient userId={Number(userId)} />
    </AdminShell>
  );
}
