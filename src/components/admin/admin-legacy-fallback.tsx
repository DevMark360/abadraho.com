import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

export function AdminLegacyFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AdminShell title={title}>
      <div className="max-w-2xl rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay p-6">
        <p className="text-zinc-600">{description}</p>
        <p className="mt-3 text-sm text-zinc-500">
          This section is not available in the workspace yet. Contact support if you need help
          migrating data.
        </p>
        <Button asChild className="mt-6">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </AdminShell>
  );
}
