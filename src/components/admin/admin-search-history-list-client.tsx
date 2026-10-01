"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";

type Row = {
  rowNum: number;
  userId: number;
  userName: string;
  phone: string | null;
  email: string | null;
  lastActivityAt: string | null;
  lastInteraction: string;
};

const PER_PAGE = 25;

export function AdminSearchHistoryListClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ search: "", from: "", to: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
      });
      if (applied.search) params.set("search", applied.search);
      if (applied.from) params.set("from", applied.from);
      if (applied.to) params.set("to", applied.to);

      const res = await fetch(`/api/admin/search-history/users?${params}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? json.message ?? "Failed to load");
        setItems([]);
        setTotal(0);
      } else {
        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      setError("Failed to load search history");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(userId: number, userName: string) {
    if (!confirm(`Delete all search history for ${userName}? This cannot be undone.`)) return;

    const res = await fetch(`/api/admin/search-history/user/${userId}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.message ?? "Delete failed");
      return;
    }
    load();
  }

  function applyFilters() {
    setApplied({ search, from, to });
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setFrom("");
    setTo("");
    setApplied({ search: "", from: "", to: "" });
    setPage(1);
  }

  if (error?.includes("Database disabled")) {
    return <AdminDbAlert message={error} />;
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total} />

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Filter users</h3>
        </div>
        <div className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-zinc-700">Name / email / phone</span>
              <Input
                layout="field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Start date</span>
              <Input layout="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">End date</span>
              <Input layout="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={applyFilters}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className={adminCard}>
        {error && !loading && <p className="mb-3 px-4 pt-4 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>#</th>
                <th className={adminTableHead}>Date/Time</th>
                <th className={adminTableHead}>User name</th>
                <th className={adminTableHead}>Email / contact</th>
                <th className={adminTableHead}>Last interaction</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <LoadingState size="sm" inline className="w-full" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    No users with activity yet
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.userId} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{r.rowNum}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.lastActivityAt)}</td>
                    <td className="px-3 py-2">{r.userName}</td>
                    <td className="px-3 py-2">
                      <div>{r.email ?? "—"}</div>
                      {r.phone ? (
                        <div className="text-xs text-zinc-500">{r.phone}</div>
                      ) : null}
                    </td>
                    <td className="max-w-xs px-3 py-2">{r.lastInteraction}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/search-history/user/${r.userId}`}
                          className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <AdminCan module="search_history" action="export">
                          <button
                            type="button"
                            onClick={() => void onDelete(r.userId, r.userName)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                            title="Delete all history"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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

        <AdminPagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}
