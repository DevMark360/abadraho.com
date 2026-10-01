import { AdminShell } from "@/components/admin/admin-shell";
import { AdminReviewsClient } from "@/components/admin/admin-reviews-client";

export default function AdminReviewsPage() {
  return (
    <AdminShell title="User reviews management">
      <AdminReviewsClient />
    </AdminShell>
  );
}
