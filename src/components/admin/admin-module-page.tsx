import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

interface AdminModulePageProps {
  title: string;
  description: string;
}

/** Admin module placeholder until full CRUD ships */
export function AdminModulePage({ title, description }: AdminModulePageProps) {
  return (
    <AdminShell title={title}>
      <div className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-zinc-600">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
