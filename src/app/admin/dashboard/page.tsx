import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { getAdminSession } from "@/lib/admin-session";
import { isBuilderSession } from "@/lib/admin-rbac";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (session && isBuilderSession(session)) {
    redirect("/account");
  }

  return (
    <AdminShell title="Dashboard">
      <AdminDashboardClient />
    </AdminShell>
  );
}
