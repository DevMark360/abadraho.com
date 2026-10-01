import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUnitFormClient } from "@/components/admin/admin-unit-form-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUnitEditPage({ params }: PageProps) {
  const { id } = await params;
  const unitId = Number(id);

  return (
    <AdminShell title="Edit unit">
      <Suspense fallback={<LoadingState size="sm" />}>
        <AdminUnitFormClient mode="edit" unitId={unitId} />
      </Suspense>
    </AdminShell>
  );
}
