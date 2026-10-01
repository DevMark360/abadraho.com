"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";

const PER_PAGE = 50;

export function AdminCustomersListClient() {
  const [items, setItems] = useState<
    {
      rowNum: number;
      id: number;
      firstName: string;
      lastName: string | null;
      email: string | null;
      phoneNumber: string | null;
      isPhoneNoVerified: boolean;
      createdAt: string | Date | null;
    }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
    });
    if (appliedQ) params.set("q", appliedQ);
    const res = await fetch(`/api/admin/customers?${params}`);
    const json = await res.json();
    if (!json.success) setError(json.error ?? json.message ?? "Failed to load");
    else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, appliedQ]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total} hint="Website users only" />

      <div className={adminCard}>
        <div className="flex flex-wrap gap-2 p-4">
          <Input layout="field"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className=" max-w-xs"
          />
          <Button type="button" onClick={() => { setAppliedQ(q); setPage(1); }}>
            Search
          </Button>
          <Button type="button" variant="outline" onClick={() => { setQ(""); setAppliedQ(""); setPage(1); }}>
            Reset
          </Button>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Name</th>
              <th className={adminTableHead}>Email</th>
              <th className={adminTableHead}>Phone</th>
              <th className={adminTableHead}>Verified</th>
              <th className={adminTableHead}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No customers
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.rowNum}</td>
                  <td className="px-3 py-2 font-medium">
                    {row.firstName} {row.lastName ?? ""}
                  </td>
                  <td className="px-3 py-2">{row.email ?? "—"}</td>
                  <td className="px-3 py-2">{row.phoneNumber ?? "—"}</td>
                  <td className="px-3 py-2">{row.isPhoneNoVerified ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
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
  );
}
