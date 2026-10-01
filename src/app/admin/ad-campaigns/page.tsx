import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAdCampaignsClient } from "@/components/admin/admin-ad-campaigns-client";

export default function AdminAdCampaignsPage() {
  return (
    <AdminShell title="Ad campaigns">
      <AdminAdCampaignsClient />
    </AdminShell>
  );
}
