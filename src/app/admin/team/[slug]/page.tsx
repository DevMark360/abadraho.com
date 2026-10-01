import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTeamShowClient } from "@/components/admin/admin-team-show-client";

export default async function AdminTeamShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <AdminShell title="Team details">
      <AdminTeamShowClient
        slug={slug}
        backHref="/admin/joined-teams"
        backLabel="Joined teams"
      />
    </AdminShell>
  );
}
