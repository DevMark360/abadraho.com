"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import { BrokerSubpageShell, brokerPageIcon } from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { COMMISSION_STATUS_LABELS } from "@/config/broker-agent";

type Row = {
  id: number;
  projectName: string;
  dealValue: number;
  commissionAmount: number;
  status: string;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
};

export function BrokerCommissionsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [chart, setChart] = useState<Array<{ month: string; confirmed: number; paid: number }>>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ resource: "commissions" });
    if (status) params.set("status", status);
    const res = await fetch(`/api/v1/broker/ops?${params}`, { credentials: "same-origin" });
    const j = await res.json();
    setItems(j.success && Array.isArray(j.items) ? j.items : []);
    setChart(j.chart ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalEarned = items.filter((i) => i.status === "paid").reduce((s, i) => s + i.commissionAmount, 0);
  const thisMonth = items
    .filter((i) => i.status !== "pending")
    .reduce((s, i) => s + i.commissionAmount, 0);
  const pending = items.filter((i) => i.status === "pending").reduce((s, i) => s + i.commissionAmount, 0);
  const maxBar = Math.max(...chart.map((c) => c.confirmed + c.paid), 1);

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title="Commission tracker"
        description="Track pending, confirmed, and paid commissions"
        icon={brokerPageIcon(TrendingUp)}
      >
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total earned", value: totalEarned },
            { label: "This month", value: thisMonth },
            { label: "Pending", value: pending },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase text-zinc-500">{m.label}</p>
              <p className="mt-1 text-xl font-semibold">{formatPrice(m.value, "PKR")}</p>
            </div>
          ))}
        </div>

        {chart.length > 0 ? (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
            <p className="mb-4 text-sm font-semibold text-zinc-900">Last 6 months</p>
            <div className="flex h-40 items-end gap-2">
              {chart.map((c) => (
                <div key={c.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col justify-end" style={{ height: 120 }}>
                    <div
                      className="w-full rounded-t bg-blue-400"
                      style={{ height: `${(c.confirmed / maxBar) * 100}%` }}
                    />
                    <div
                      className="w-full rounded-t bg-emerald-500"
                      style={{ height: `${(c.paid / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">{c.month.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <select
          className="mb-4 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="paid">Paid</option>
        </select>

        {loading ? (
          <LoadingState size="sm" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Deal value</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">{row.projectName}</td>
                    <td className="px-4 py-3">{formatPrice(row.dealValue, "PKR")}</td>
                    <td className="px-4 py-3">{formatPrice(row.commissionAmount, "PKR")}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.status === "paid"
                            ? "bg-emerald-50 text-emerald-800"
                            : row.status === "confirmed"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {COMMISSION_STATUS_LABELS[row.status as keyof typeof COMMISSION_STATUS_LABELS] ??
                          row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold">{selected.projectName}</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Deal value</dt>
                  <dd>{formatPrice(selected.dealValue, "PKR")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Commission</dt>
                  <dd>{formatPrice(selected.commissionAmount, "PKR")}</dd>
                </div>
                {selected.paymentReference ? (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Payment ref</dt>
                    <dd>{selected.paymentReference}</dd>
                  </div>
                ) : null}
                {selected.paidAt ? (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Paid on</dt>
                    <dd>{new Date(selected.paidAt).toLocaleDateString()}</dd>
                  </div>
                ) : null}
              </dl>
              <Button className="mt-6 w-full" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
