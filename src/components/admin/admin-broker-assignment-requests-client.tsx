"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { FieldLabel } from "@/components/admin/admin-form-section";
import { AdminSelect } from "@/components/admin/admin-select";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ASSIGNMENT_REQUEST_STATUSES,
  ASSIGNMENT_REQUEST_STATUS_LABELS,
  COMMISSION_TYPES,
  type AssignmentRequestStatus,
} from "@/config/broker-agent";

type Row = {
  id: number;
  brokerId: number;
  brokerName: string | null;
  projectId: number;
  projectName: string | null;
  message: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
};

function statusBadgeVariant(status: string): "default" | "success" | "muted" {
  if (status === "approved") return "success";
  if (status === "pending") return "muted";
  return "muted";
}

export function AdminBrokerAssignmentRequestsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [approveModal, setApproveModal] = useState<Row | null>(null);
  const [rejectModal, setRejectModal] = useState<Row | null>(null);
  const [commissionType, setCommissionType] = useState<string>("percentage");
  const [commissionValue, setCommissionValue] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/broker-assignment-requests?${params}`);
    const j = await res.json();
    setItems(j.items ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(row: Row, decision: "approved" | "rejected") {
    setSubmitting(true);
    try {
      await fetch("/api/admin/broker-assignment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          decision,
          adminNotes: adminNotes.trim() ? adminNotes.trim() : null,
          commissionType: decision === "approved" ? commissionType : undefined,
          commissionValue: decision === "approved" ? Number(commissionValue) : undefined,
        }),
      });
      setApproveModal(null);
      setRejectModal(null);
      setCommissionValue("");
      setAdminNotes("");
      setCommissionType("percentage");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-zinc-500">
        Review project assignment requests submitted by agents/brokers.
      </p>

      <AdminPageToolbar total={items.length}>
        <div className="w-full sm:w-44">
          <FieldLabel>Status</FieldLabel>
          <AdminSelect
            value={status}
            onChange={setStatus}
            placeholder="All statuses"
            options={[
              { value: "", label: "All statuses" },
              ...ASSIGNMENT_REQUEST_STATUSES.map((s) => ({
                value: s,
                label: ASSIGNMENT_REQUEST_STATUS_LABELS[s as AssignmentRequestStatus],
              })),
            ]}
          />
        </div>
      </AdminPageToolbar>

      <div className={`${adminCard} overflow-x-auto`}>
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>Agent / Broker</th>
              <th className={adminTableHead}>Project</th>
              <th className={adminTableHead}>Message</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Created</th>
              <th className={adminTableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No assignment requests found{status ? " for this status" : ""}.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                  <td className="whitespace-nowrap px-4 py-3">{row.brokerName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.projectName ?? "—"}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-zinc-600">
                    {row.message?.trim() ? row.message : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(row.status)}>
                      {ASSIGNMENT_REQUEST_STATUS_LABELS[row.status as AssignmentRequestStatus] ??
                        row.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "pending" ? (
                        <>
                          <Button size="sm" onClick={() => setApproveModal(row)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectModal(row)}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {approveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Approve assignment</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {approveModal.brokerName ?? "Agent"} → {approveModal.projectName}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <FieldLabel>Commission type</FieldLabel>
                <AdminSelect
                  value={commissionType}
                  onChange={setCommissionType}
                  options={COMMISSION_TYPES.map((t) => ({
                    value: t,
                    label: t === "percentage" ? "Percentage (%)" : "Fixed (PKR)",
                  }))}
                />
              </div>
              <Input
                layout="field"
                type="number"
                placeholder={commissionType === "percentage" ? "e.g. 2" : "e.g. 50000"}
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
              />
              <div>
                <FieldLabel>Admin note (optional)</FieldLabel>
                <textarea
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Note for the agent"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button disabled={submitting || !commissionValue} onClick={() => decide(approveModal, "approved")}>
                Approve & assign
              </Button>
              <Button variant="outline" onClick={() => setApproveModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Reject assignment</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {rejectModal.brokerName ?? "Agent"} → {rejectModal.projectName}
            </p>
            <div className="mt-4">
              <FieldLabel>Reason (optional)</FieldLabel>
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                rows={3}
                placeholder="Reason for rejection"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => decide(rejectModal, "rejected")}
              >
                Reject request
              </Button>
              <Button variant="outline" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
