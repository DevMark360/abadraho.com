import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAdWhatsappPackagesClient } from "@/components/admin/admin-ad-whatsapp-packages-client";

export default function AdminAdWhatsappPackagesPage() {
  return (
    <AdminShell title="WhatsApp ad card packages">
      <AdminAdWhatsappPackagesClient />
    </AdminShell>
  );
}
