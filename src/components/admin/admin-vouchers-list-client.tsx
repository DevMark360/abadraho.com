"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";

const PER_PAGE = 50;

type Row = {
  rowNum: number;
  id: number;
  name: string;
  projectName: string | null;
  discountLabel: string;
  discountApplied: string | null;
  unitTitles: string[];
  createdAt: string | null;
  expiresAt: string | null;
  statusLabel: string;
  isCustomerDownload: boolean;
};

export function AdminVouchersListClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    if (appliedQ) params.set("q", appliedQ);
    const res = await fetch(`/api/admin/vouchers?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, appliedQ]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm("Once deleted, you will not be able to recover this voucher.")) return;
    const res = await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <AdminCan module="vouchers" action="add">
          <Button asChild className="gap-1.5">
            <Link href="/admin/vouchers/create">
              <Plus className="h-4 w-4" />
              Add voucher
            </Link>
          </Button>
        </AdminCan>
      </AdminPageToolbar>

      <div className={`${adminCard} p-4`}>
        <div className="flex flex-wrap gap-2">
          <Input layout="field" placeholder="Search name, project, code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setAppliedQ(q), setPage(1))}
          />
          <Button type="button" onClick={() => { setAppliedQ(q); setPage(1); }}>
            Search
          </Button>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>#</th>
                <th className={adminTableHead}>Name</th>
                <th className={adminTableHead}>Project</th>
                <th className={adminTableHead}>Discount</th>
                <th className={adminTableHead}>Created</th>
                <th className={adminTableHead}>Expiry</th>
                <th className={adminTableHead}>Status</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
                </tr>
              ) : items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2">
                    {row.name}
                    {row.isCustomerDownload && (
                      <span className="ml-1 text-xs text-zinc-400">(customer)</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.projectName ?? "—"}
                    {row.discountApplied === "unit" && row.unitTitles.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.unitTitles.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.discountLabel}</td>
                  <td className="px-3 py-2">{fmtDate(row.createdAt)}</td>
                  <td className="px-3 py-2">{fmtDate(row.expiresAt)}</td>
                  <td className="px-3 py-2">{row.statusLabel}</td>
                  <td className="px-3 py-2">
                    {!row.isCustomerDownload && (
                      <AdminCan module="vouchers" action="edit">
                        <Link
                          href={`/admin/vouchers/${row.id}/edit`}
                          className="inline-flex text-zinc-600 hover:text-zinc-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </AdminCan>
                    )}
                    <AdminCan module="vouchers" action="delete">
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AdminCan>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
