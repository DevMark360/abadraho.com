import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUnitsListClient } from "@/components/admin/admin-units-list-client";

export default function AdminUnitsPage() {
  return (
    <AdminShell title="Units">
      <Suspense fallback={<LoadingState size="sm" />}>
        <AdminUnitsListClient />
      </Suspense>
    </AdminShell>
  );
}
