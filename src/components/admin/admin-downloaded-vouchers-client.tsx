"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { fmtDate } from "@/components/admin/admin-search-history-format";

const PER_PAGE = 100;

type Row = {
  rowNum: number;
  code: string;
  userName: string;
  userEmail: string | null;
  voucherName: string;
  projectName: string | null;
  unitTitles: string[];
  redeemedAt: string | null;
};

export function AdminDownloadedVouchersClient() {
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
    const res = await fetch(`/api/admin/downloaded-vouchers?${params}`);
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

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total} hint="Redeemed / downloaded vouchers" />

      <div className={`${adminCard} p-4`}>
        <div className="flex flex-wrap gap-2">
          <Input layout="field" placeholder="Search code, user, voucher…"
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
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Code</th>
              <th className={adminTableHead}>User</th>
              <th className={adminTableHead}>Voucher</th>
              <th className={adminTableHead}>Redeemed at</th>
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
                  No downloaded vouchers
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={`${row.code}-${row.rowNum}`} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">
                    {row.userName}
                    {row.userEmail && (
                      <>
                        <br />
                        <span className="text-zinc-500">{row.userEmail}</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.voucherName}
                    <br />
                    <span className="text-zinc-600">{row.projectName ?? "—"}</span>
                    {row.unitTitles.length > 0 && (
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
                  <td className="px-3 py-2">{fmtDate(row.redeemedAt)}</td>
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
