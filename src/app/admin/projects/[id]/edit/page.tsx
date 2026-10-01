import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProjectFormClient } from "@/components/admin/admin-project-form-client";

const RESERVED = new Set(["pending", "active", "create", "import"]);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProjectEditPage({ params }: PageProps) {
  const { id } = await params;
  if (RESERVED.has(id)) notFound();

  const projectId = Number(id);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return (
      <AdminShell title="Invalid project">
        <p className="text-sm text-red-600">Invalid project ID.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={`Edit project #${projectId}`}>
      <AdminProjectFormClient mode="edit" projectId={projectId} />
    </AdminShell>
  );
}
