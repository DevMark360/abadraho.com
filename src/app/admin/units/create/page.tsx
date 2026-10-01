import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUnitFormClient } from "@/components/admin/admin-unit-form-client";

export default function AdminUnitCreatePage() {
  return (
    <AdminShell title="Create unit">
      <Suspense fallback={<LoadingState size="sm" />}>
        <AdminUnitFormClient mode="create" />
      </Suspense>
    </AdminShell>
  );
}
