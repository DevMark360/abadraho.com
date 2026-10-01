"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";

type Row = {
  rowNum: number;
  id: number;
  name: string;
  slug: string;
  description: string | null;
  teamLeadName?: string | null;
  teamLeadId?: number | null;
};

export function AdminTeamsListClient({
  mode,
  title,
  viewBase,
}: {
  mode: "my" | "joined" | "all";
  title: string;
  /** Path prefix before slug, e.g. `/admin/my-team` */
  viewBase: "/admin/my-team" | "/admin/team";
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/teams?mode=${mode}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
    } else {
      setItems(json.items ?? []);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number, slug: string) {
    if (!confirm("Delete this team?")) return;
    const res = await fetch(`/api/admin/teams/${encodeURIComponent(slug)}?id=${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        {mode === "my" && (
          <AdminCan module="teams" action="add">
            <Button asChild className="gap-1.5">
              <Link href="/admin/team/create">
                <Plus className="h-4 w-4" />
                Create team
              </Link>
            </Button>
          </AdminCan>
        )}
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/my-teams"
            className={mode === "my" ? "font-semibold text-zinc-900" : "text-zinc-500 hover:underline"}
          >
            My teams
          </Link>
          <span className="text-zinc-300">|</span>
          <Link
            href="/admin/joined-teams"
            className={
              mode === "joined" ? "font-semibold text-zinc-900" : "text-zinc-500 hover:underline"
            }
          >
            Joined teams
          </Link>
        </div>
      </AdminPageToolbar>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-800">{title}</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Team name</th>
              <th className={adminTableHead}>Team lead</th>
              <th className={adminTableHead}>Description</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                  No teams
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.rowNum}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    {r.teamLeadName ?? (r.teamLeadId != null ? `#${r.teamLeadId}` : "—")}
                  </td>
                  <td className="max-w-md truncate px-3 py-2" title={r.description ?? ""}>
                    {r.description ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Link
                        href={`${viewBase}/${r.slug}`}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {mode === "my" && (
                        <AdminCan module="teams" action="delete">
                          <button
                            type="button"
                            onClick={() => onDelete(r.id, r.slug)}
                            className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AdminCan>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
