"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AdminDbAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

type Row = {
  id: number;
  projectId: number;
  projectName: string;
  builderName: string;
  totalCards: number;
  usedCards: number;
  pricePaid: number;
  status: string;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  exhausted: "bg-zinc-100 text-zinc-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AdminAdWhatsappPackagesClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    const res = await fetch(`/api/admin/ad-whatsapp-packages?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total} />

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-center text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>ID</th>
              <th className={adminTableHead}>Builder</th>
              <th className={adminTableHead}>Project</th>
              <th className={adminTableHead}>Cards used</th>
              <th className={adminTableHead}>Price paid</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Purchased</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  No WhatsApp packages purchased yet
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.builderName}</td>
                  <td className="px-3 py-2">{r.projectName}</td>
                  <td className="px-3 py-2">
                    {r.usedCards}/{r.totalCards}
                  </td>
                  <td className="px-3 py-2">Rs. {r.pricePaid.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_BADGE[r.status] ?? STATUS_BADGE.active
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
