import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTeamsListClient } from "@/components/admin/admin-teams-list-client";

export default function AdminJoinedTeamsPage() {
  return (
    <AdminShell title="Joined teams">
      <AdminTeamsListClient mode="joined" title="Joined teams" viewBase="/admin/team" />
    </AdminShell>
  );
}
