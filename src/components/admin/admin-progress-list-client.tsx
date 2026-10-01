"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";

type Row = {
  rowNum: number;
  id: number;
  name: string;
  isActive: boolean;
  projectCount: number;
};

export function AdminProgressListClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/progress");
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
    } else {
      setItems(json.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm("Delete this progress status?")) return;
    const res = await fetch(`/api/admin/progress/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else {
      setMsg(json.message ?? "Progress deleted successfully");
      load();
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        <AdminCan module="progress" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/progress/create">
              <Plus className="h-4 w-4" />
              Add status
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      )}
      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-800">Progress details</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Construction progress labels shown on project listings and filters.
        </p>
        <table className="min-w-full text-center text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Name</th>
              <th className={adminTableHead}>Show on listing</th>
              <th className={adminTableHead}>Projects</th>
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
                <td colSpan={5} className="px-3 py-8 text-zinc-500">
                  No progress statuses
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.rowNum}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.isActive ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{r.projectCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      <AdminCan module="progress" action="edit">
                        <Link
                          href={`/admin/progress/${r.id}/edit`}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </AdminCan>
                      <AdminCan module="progress" action="delete">
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AdminCan>
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
