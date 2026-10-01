"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import {
  AdminDbAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminSearchInput,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { fmtNum, joinNames } from "@/components/admin/admin-search-history-format";

const PER_PAGE = 25;

type Row = {
  rowNum: number;
  id: number;
  userName: string;
  areaNames: string[];
  progressNames: string[];
  typeNames: string[];
  builderNames: string[];
  minDP: number | null;
  maxDP: number | null;
  minMI: number | null;
  maxMI: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export function AdminAdvanceSearchHistoryClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
      });
      if (appliedSearch) params.set("search", appliedSearch);
      const res = await fetch(`/api/admin/advance-search-history?${params}`);
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
      setError("Failed to load");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters() {
    setAppliedSearch(search);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setAppliedSearch("");
    setPage(1);
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this search history record?")) return;
    const res = await fetch(`/api/admin/search-history/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  if (error?.includes("Database disabled")) {
    return <AdminDbAlert message={error} />;
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        </AdminPageToolbar>

      <div className={adminCard}>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Input layout="field"
            type="search"
            placeholder="Search name, email, or JSON…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedSearch(search);
                setPage(1);
              }
            }}
            className={`${adminSearchInput} min-w-[16rem] flex-1`}
          />
          <Button type="button" onClick={applyFilters}>Search</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>Reset</Button>
        </div>
      </div>

      <div className={`${adminCard} p-4`}>
        {error && !loading && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>#</th>
                <th className={adminTableHead}>User name</th>
                <th className={adminTableHead}>Area</th>
                <th className={adminTableHead}>Progress</th>
                <th className={adminTableHead}>Type</th>
                <th className={adminTableHead}>Builder</th>
                <th className={adminTableHead}>Down payment</th>
                <th className={adminTableHead}>Monthly installment</th>
                <th className={adminTableHead}>Price</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                    No records
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{r.rowNum}</td>
                    <td className="px-3 py-2">{r.userName}</td>
                    <td className="px-3 py-2">{joinNames(r.areaNames)}</td>
                    <td className="px-3 py-2">{joinNames(r.progressNames)}</td>
                    <td className="px-3 py-2">{joinNames(r.typeNames)}</td>
                    <td className="px-3 py-2">{joinNames(r.builderNames)}</td>
                    <td className="px-3 py-2">
                      {fmtNum(r.minDP)} – {fmtNum(r.maxDP)}
                    </td>
                    <td className="px-3 py-2">
                      {fmtNum(r.minMI)} – {fmtNum(r.maxMI)}
                    </td>
                    <td className="px-3 py-2">
                      {fmtNum(r.minPrice)} – {fmtNum(r.maxPrice)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void onDelete(r.id)}
                        className="inline-flex rounded p-1.5 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
