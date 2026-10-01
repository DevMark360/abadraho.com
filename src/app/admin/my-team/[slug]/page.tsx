import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTeamShowClient } from "@/components/admin/admin-team-show-client";

export default async function AdminMyTeamShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <AdminShell title="My team">
      <AdminTeamShowClient slug={slug} backHref="/admin/my-teams" backLabel="My teams" />
    </AdminShell>
  );
}
