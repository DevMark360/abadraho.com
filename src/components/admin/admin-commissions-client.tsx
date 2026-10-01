"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { FieldLabel } from "@/components/admin/admin-form-section";
import { AdminSelect } from "@/components/admin/admin-select";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { COMMISSION_STATUS_LABELS } from "@/config/broker-agent";

type Row = {
  id: number;
  brokerName: string | null;
  projectName: string;
  leadName: string | null;
  dealValue: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
};

function statusBadgeVariant(status: string): "default" | "success" | "muted" {
  if (status === "paid") return "success";
  if (status === "confirmed") return "default";
  return "muted";
}

export function AdminCommissionsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [payModal, setPayModal] = useState<Row | null>(null);
  const [paymentReference, setPaymentReference] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/commissions?${params}`);
    const j = await res.json();
    setItems(j.items ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-zinc-500">Confirm and mark agent commissions as paid.</p>

      <AdminPageToolbar total={items.length}>
        <div className="w-full sm:w-44">
          <FieldLabel>Status</FieldLabel>
          <AdminSelect
            value={status}
            onChange={setStatus}
            placeholder="All statuses"
            options={[
              { value: "", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "paid", label: "Paid" },
            ]}
          />
        </div>
      </AdminPageToolbar>

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>Agent</th>
              <th className={adminTableHead}>Project</th>
              <th className={adminTableHead}>Lead</th>
              <th className={adminTableHead}>Amount</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Created</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No commissions found{status ? " for this status" : ""}.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <td className="whitespace-nowrap px-4 py-3">{row.brokerName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.projectName}</td>
                  <td className="px-4 py-3">{row.leadName ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {formatPrice(row.commissionAmount, "PKR")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(row.status)}>
                      {COMMISSION_STATUS_LABELS[row.status as keyof typeof COMMISSION_STATUS_LABELS] ??
                        row.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await fetch("/api/admin/commissions", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: row.id, action: "confirm" }),
                            });
                            load();
                          }}
                        >
                          Confirm
                        </Button>
                      ) : null}
                      {row.status === "confirmed" ? (
                        <Button size="sm" onClick={() => setPayModal(row)}>
                          Mark paid
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Mark commission paid</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {payModal.brokerName ?? "Agent"} · {payModal.projectName}
            </p>
            <Input
              className="mt-4"
              layout="field"
              placeholder="Payment reference (bank transfer ID)"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={async () => {
                  await fetch("/api/admin/commissions", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: payModal.id,
                      action: "paid",
                      paymentReference,
                    }),
                  });
                  setPayModal(null);
                  setPaymentReference("");
                  load();
                }}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setPayModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
