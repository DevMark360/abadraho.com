import { AdminShell } from "@/components/admin/admin-shell";
import { AdminContactInquiriesClient } from "@/components/admin/admin-contact-inquiries-client";

export default function AdminContactPage() {
  return (
    <AdminShell title="Contact form inquiries">
      <AdminContactInquiriesClient />
    </AdminShell>
  );
}
