"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2, Upload, Check, Pause, X } from "lucide-react";
import { PROJECT_STATUS_LABELS } from "@/config/project-status";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminDbAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";

type ListMode = "all" | "pending" | "active";

type ProjectRow = {
  rowNum: number;
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  address: string | null;
  areaNames: string;
  progressName: string;
  status: number;
  statusLabel: string;
  addedBy: string;
};

type FilterState = {
  ids: string[];
  areas: string[];
  progress: string[];
  status: string[];
  from: string;
  to: string;
};

const emptyFilters: FilterState = {
  ids: [],
  areas: [],
  progress: [],
  status: [],
  from: "",
  to: "",
};

const PER_PAGE = 50;

function projectsModuleForMode(mode: ListMode): string {
  if (mode === "pending") return "projects_pending";
  if (mode === "active") return "projects_active";
  return "projects";
}

export function AdminProjectsListClient({ mode }: { mode: ListMode }) {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [applied, setApplied] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [isFullStaff, setIsFullStaff] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
  const [areas, setAreas] = useState<{ value: string; label: string }[]>([]);
  const [progressOpts, setProgressOpts] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/meta/options")
      .then((r) => r.json())
      .then((j) => {
        setAreas(j.areas ?? []);
        setProgressOpts(j.progress ?? []);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    if (mode === "pending") params.set("fixedStatus", "2");
    if (mode === "active") params.set("fixedStatus", "1");
    if (applied.ids.length) params.set("ids", applied.ids.join(","));
    if (applied.areas.length) params.set("areas", applied.areas.join(","));
    if (applied.progress.length) params.set("progress", applied.progress.join(","));
    if (mode === "all" && applied.status.length) params.set("status", applied.status.join(","));
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);

    const res = await fetch(`/api/admin/projects?${params}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? "Failed to load");
      setItems([]);
      return;
    }
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    if (json.projectOptions) setProjectOptions(json.projectOptions);
    if (json.error) setError(json.error);
    if (typeof json.isFullStaff === "boolean") setIsFullStaff(json.isFullStaff);
  }, [page, applied, mode]);

  useEffect(() => {
    load();
  }, [load]);

  async function archiveProject(id: number) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.message ?? "Delete failed");
  }

  async function setApproval(id: number, action: "approve" | "hold" | "reject") {
    const labels = { approve: "approve", hold: "put on hold", reject: "reject" };
    if (!confirm(`Are you sure you want to ${labels[action]} this project?`)) return;
    setApprovingId(id);
    const res = await fetch(`/api/admin/projects/${id}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setApprovingId(null);
    if (json.success) load();
    else alert(json.message ?? "Update failed");
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setApplied(filters);
    setPage(1);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  }

  const statusOptions = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const moduleKey = projectsModuleForMode(mode);
  const pendingModule = "projects_pending";
  const hasActiveFilters =
    applied.ids.length > 0 ||
    applied.areas.length > 0 ||
    applied.progress.length > 0 ||
    applied.status.length > 0 ||
    !!applied.from ||
    !!applied.to;

  return (
    <div className="space-y-4">
      <AdminPageToolbar
        total={total}
        hint={error && items.length > 0 ? error : undefined}
      >
        <AdminCan module="projects" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/projects/create">
              <Plus className="h-4 w-4" />
              Add project
            </Link>
          </Button>
        </AdminCan>
        <AdminCan module="import" action="add">
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/admin/projects/import">
              <Upload className="h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      <div className={`${adminCard} overflow-visible`}>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <span>Filters{hasActiveFilters ? " (active)" : ""}</span>
          <span className="text-xs text-zinc-400">{filtersOpen ? "Hide" : "Show"}</span>
        </button>
        {filtersOpen && (
          <form onSubmit={applyFilters} className="space-y-4 border-t border-zinc-100 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <AdminMultiSelect
                label="Project name"
                options={projectOptions}
                value={filters.ids}
                onChange={(ids) => setFilters({ ...filters, ids })}
                placeholder="All projects"
              />
              <AdminMultiSelect
                label="Area"
                options={areas}
                value={filters.areas}
                onChange={(areas) => setFilters({ ...filters, areas })}
                placeholder="All areas"
              />
              <AdminMultiSelect
                label="Progress"
                options={progressOpts}
                value={filters.progress}
                onChange={(progress) => setFilters({ ...filters, progress })}
                placeholder="All progress"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {mode === "all" && (
                <AdminMultiSelect
                  label="Status"
                  options={statusOptions}
                  value={filters.status}
                  onChange={(status) => setFilters({ ...filters, status })}
                  placeholder="All statuses"
                />
              )}
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">From date</span>
                <Input
                  layout="field"
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">To date</span>
                <Input
                  layout="field"
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Search</Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </form>
        )}
      </div>

      {error && !items.length && <AdminDbAlert message={error} />}

      <div className={adminCard}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>#</th>
                <th className={adminTableHead}>Created</th>
                <th className={adminTableHead}>Modified</th>
                <th className={adminTableHead}>Name</th>
                <th className={adminTableHead}>Address</th>
                <th className={adminTableHead}>Area</th>
                <th className={adminTableHead}>Progress</th>
                <th className={adminTableHead}>Status</th>
                <th className={adminTableHead}>Added by</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
                </tr>
              )}
              {!loading &&
                items.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                    <td className="px-4 py-3">{row.rowNum}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {fmtDate(row.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {fmtDate(row.updatedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">{row.address ?? "—"}</td>
                    <td className="px-4 py-3">{row.areaNames || "—"}</td>
                    <td className="px-4 py-3">{row.progressName}</td>
                    <td className="px-4 py-3">{row.statusLabel}</td>
                    <td className="px-4 py-3">{row.addedBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {isFullStaff && (mode === "pending" || row.status === 2) && (
                          <>
                            <AdminCan module={pendingModule} action="approve">
                              <button
                                type="button"
                                disabled={approvingId === row.id}
                                onClick={() => setApproval(row.id, "approve")}
                                className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                title="Approve (go live)"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </AdminCan>
                            <AdminCan module={pendingModule} action="edit">
                              <button
                                type="button"
                                disabled={approvingId === row.id}
                                onClick={() => setApproval(row.id, "hold")}
                                className="rounded p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                                title="On hold"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                            </AdminCan>
                            <AdminCan module={pendingModule} action="reject">
                              <button
                                type="button"
                                disabled={approvingId === row.id}
                                onClick={() => setApproval(row.id, "reject")}
                                className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </AdminCan>
                          </>
                        )}
                        <Link
                          href={`/admin/projects/${row.id}`}
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <AdminCan module={moduleKey} action="edit">
                          <Link
                            href={`/admin/projects/${row.id}/edit`}
                            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </AdminCan>
                        <AdminCan module={moduleKey} action="delete">
                          <button
                            type="button"
                            onClick={() => archiveProject(row.id)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            title="Archive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AdminCan>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !items.length && !error && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-400">
                    No projects
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  );
}
