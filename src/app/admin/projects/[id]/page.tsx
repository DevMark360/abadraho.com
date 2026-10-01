import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectShowClient } from "@/components/admin/admin-project-show-client";

const RESERVED = new Set(["pending", "active", "create", "import"]);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProjectShowPage({ params }: PageProps) {
  const { id } = await params;
  if (RESERVED.has(id)) notFound();

  const projectId = Number(id);
  if (!Number.isFinite(projectId) || projectId <= 0) notFound();

  return (
    <AdminShell title="Project details">
      <AdminProjectShowClient projectId={projectId} />
    </AdminShell>
  );
}
