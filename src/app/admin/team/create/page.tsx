import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTeamCreateClient } from "@/components/admin/admin-team-create-client";

export default function AdminTeamCreatePage() {
  return (
    <AdminShell title="Create team">
      <AdminTeamCreateClient />
    </AdminShell>
  );
}
