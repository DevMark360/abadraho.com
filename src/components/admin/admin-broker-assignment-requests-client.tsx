"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Trash2, X } from "lucide-react";
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
  updatedAt: string | null;
};

const iconBtn = "rounded-lg p-1.5 text-zinc-600 hover:bg-clay-well";

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
  const [viewRow, setViewRow] = useState<Row | null>(null);
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

  async function onDelete(row: Row) {
    const note =
      row.status === "approved"
        ? " The agent stays assigned to the project — remove that from the agent's page if needed."
        : "";
    const who = row.brokerName ?? "the agent";
    const what = row.projectName ?? "this project";
    if (!confirm(`Delete this request from ${who} for ${what}?${note}`)) return;
    const res = await fetch(`/api/admin/broker-assignment-requests?id=${row.id}`, {
      method: "DELETE",
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || !json.success) {
      alert(json.message ?? "Delete failed");
      return;
    }
    setViewRow(null);
    load();
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
              <th className={`${adminTableHead} text-right`}>Actions</th>
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
                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setViewRow(row)}
                        className={iconBtn}
                        title="View"
                        aria-label="View request"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {row.status !== "pending" ? (
                        <button
                          type="button"
                          onClick={() => void onDelete(row)}
                          className={`${iconBtn} hover:text-red-600`}
                          title="Delete"
                          aria-label="Delete request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewRow(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-view-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-clay-lg border border-white/80 bg-clay-surface p-6 shadow-clay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="request-view-title" className="text-lg font-semibold text-zinc-900">
                Assignment request
              </h3>
              <button
                type="button"
                onClick={() => setViewRow(null)}
                className={iconBtn}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Agent / broker", viewRow.brokerName ?? "—"],
                ["Project", viewRow.projectName ?? "—"],
                ["Submitted", new Date(viewRow.createdAt).toLocaleString()],
                ...(viewRow.status !== "pending" && viewRow.updatedAt
                  ? [["Reviewed", new Date(viewRow.updatedAt).toLocaleString()]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="text-right font-medium text-zinc-900">{value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Status</dt>
                <dd>
                  <Badge variant={statusBadgeVariant(viewRow.status)}>
                    {ASSIGNMENT_REQUEST_STATUS_LABELS[viewRow.status as AssignmentRequestStatus] ??
                      viewRow.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Message from agent</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words rounded-clay bg-clay-well p-3 text-zinc-800 shadow-clay-inset">
                  {viewRow.message?.trim() || "—"}
                </dd>
              </div>
              {viewRow.adminNotes?.trim() ? (
                <div>
                  <dt className="text-zinc-500">
                    {viewRow.status === "rejected" ? "Rejection reason" : "Admin note"}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words rounded-clay bg-clay-well p-3 text-zinc-800 shadow-clay-inset">
                    {viewRow.adminNotes}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {viewRow.status !== "pending" ? (
                <Button
                  variant="outline"
                  className="gap-1.5 text-red-600 hover:text-red-700"
                  onClick={() => void onDelete(viewRow)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}
              <Button onClick={() => setViewRow(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}

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
