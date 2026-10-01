import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTeamsListClient } from "@/components/admin/admin-teams-list-client";

export default function AdminMyTeamsPage() {
  return (
    <AdminShell title="My teams">
      <AdminTeamsListClient mode="my" title="My teams" viewBase="/admin/my-team" />
    </AdminShell>
  );
}
