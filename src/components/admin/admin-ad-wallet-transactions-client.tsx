"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminSelect } from "@/components/admin/admin-select";
import {
  AdminDbAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

type Row = {
  id: number;
  builderId: number;
  builderName: string;
  type: string;
  amount: number;
  status: string;
  referenceNote: string | null;
  transactionId: string | null;
  hasProof: boolean;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  topup_bank_transfer: "Bank transfer top-up",
  topup_jazzcash: "JazzCash top-up",
  whatsapp_package_purchase: "WhatsApp card package",
  spend: "Ad spend",
  adjustment: "Adjustment",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AdminAdWalletTransactionsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/ad-wallet-transactions?${params}`);
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
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(row: Row, action: "confirm" | "reject") {
    let reason: string | undefined;
    if (action === "confirm") {
      const ok = confirm(
        `Credit Rs. ${row.amount.toLocaleString()} to ${row.builderName}?\n\n` +
          `Only confirm after checking the payment${row.transactionId ? ` (TID ${row.transactionId})` : ""} ` +
          "has actually arrived in the account."
      );
      if (!ok) return;
    } else {
      const input = prompt("Reject this top-up? Optional reason (shown to the builder):", "");
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    const res = await fetch(`/api/admin/ad-wallet-transactions/${row.id}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Update failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <AdminSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          placeholder="All statuses"
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </AdminPageToolbar>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-center text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>ID</th>
              <th className={adminTableHead}>Builder</th>
              <th className={adminTableHead}>Type</th>
              <th className={adminTableHead}>Amount</th>
              <th className={adminTableHead}>Payment proof</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Submitted</th>
              <th className={adminTableHead}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                  No wallet transactions
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.builderName}</td>
                  <td className="px-3 py-2">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </td>
                  <td className="px-3 py-2">Rs. {r.amount.toLocaleString()}</td>
                  <td className="max-w-xs px-3 py-2 text-left">
                    {r.transactionId ? (
                      <p className="font-mono text-xs font-semibold text-zinc-900">
                        TID: {r.transactionId}
                      </p>
                    ) : null}
                    {r.hasProof ? (
                      <a
                        href={`/api/admin/ad-wallet-transactions/${r.id}/proof`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View screenshot
                      </a>
                    ) : null}
                    <p className="truncate text-xs text-zinc-500" title={r.referenceNote ?? ""}>
                      {r.referenceNote ?? (r.transactionId ? "" : "—")}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_BADGE[r.status] ?? STATUS_BADGE.pending
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    {r.status === "pending" ? (
                      <div className="flex justify-center gap-1">
                        <AdminCan module="ad_wallet_transactions" action="approve">
                          <button
                            type="button"
                            onClick={() => decide(r, "confirm")}
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                            title="Confirm"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </AdminCan>
                        <AdminCan module="ad_wallet_transactions" action="reject">
                          <button
                            type="button"
                            onClick={() => decide(r, "reject")}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </AdminCan>
                      </div>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
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
