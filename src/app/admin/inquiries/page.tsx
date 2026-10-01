import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPropertyInquiriesClient } from "@/components/admin/admin-property-inquiries-client";

export default function AdminInquiriesPage() {
  return (
    <AdminShell title="Property inquiries">
      <AdminPropertyInquiriesClient />
    </AdminShell>
  );
}
