"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";

const PER_PAGE = 25;

type Row = {
  rowNum: number;
  id: number;
  projectId: number;
  projectName: string | null;
  title: string | null;
  price: number | null;
  rooms: string | null;
  unitTypeTitle: string | null;
};

export function AdminUnitsListClient() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId") ?? "";

  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [appliedProjectId, setAppliedProjectId] = useState(initialProjectId);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    if (appliedQ) params.set("q", appliedQ);
    if (appliedProjectId) params.set("projectId", appliedProjectId);
    const res = await fetch(`/api/admin/units?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      if (json.projects) setProjects(json.projects);
    }
    setLoading(false);
  }, [page, appliedQ, appliedProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm("Archive this unit?")) return;
    const res = await fetch(`/api/admin/units/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const createHref = appliedProjectId
    ? `/admin/units/create?projectId=${appliedProjectId}`
    : "/admin/units/create";

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <AdminCan module="units" action="add">
          <Button asChild className="gap-1.5">
            <Link href={createHref as Route}>
              <Plus className="h-4 w-4" />
              Add unit
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      <div className={`${adminCard} p-4`}>
        <div className="flex flex-wrap gap-2">
          <AdminSelect
            layout="field"
            value={projectId}
            onChange={setProjectId}
            placeholder="All projects"
            options={[
              { value: "", label: "All projects" },
              ...projects.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />
          <Input layout="field" placeholder="Search title or project…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setAppliedQ(q), setAppliedProjectId(projectId), setPage(1))}
          />
          <Button
            type="button"
            onClick={() => {
              setAppliedQ(q);
              setAppliedProjectId(projectId);
              setPage(1);
            }}
          >
            Search
          </Button>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Project</th>
              <th className={adminTableHead}>Title</th>
              <th className={adminTableHead}>Type</th>
              <th className={adminTableHead}>Price</th>
              <th className={adminTableHead}>Rooms</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  No units
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2">{row.projectName ?? "—"}</td>
                  <td className="px-3 py-2">{row.title ?? "—"}</td>
                  <td className="px-3 py-2">{row.unitTypeTitle ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.price != null ? row.price.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">{row.rooms ?? "—"}</td>
                  <td className="px-3 py-2">
                    <AdminCan module="units" action="edit">
                      <Link
                        href={`/admin/units/${row.id}/edit`}
                        className="inline-flex text-zinc-600 hover:text-zinc-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </AdminCan>
                    <AdminCan module="units" action="delete">
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="ml-1 rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AdminCan>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}
