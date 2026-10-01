"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, MessageCircle, Plus, Users } from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import { BrokerSubpageShell, brokerPageIcon } from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/client/api-fetch";
import { formatPrice } from "@/lib/utils";
import {
  COMMISSION_STATUS_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/config/broker-agent";

type Lead = {
  id: number;
  clientName: string;
  phone: string;
  email: string | null;
  projectId: number | null;
  projectName: string | null;
  unitId: number | null;
  unitLabel: string | null;
  unitPrice: number | null;
  source: string | null;
  status: string;
  notes: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  daysSinceContact: number | null;
  commissionType: string | null;
  commissionValue: number | null;
  commissionRateLabel: string | null;
  estimatedCommission: number | null;
  recordedCommissionAmount: number | null;
  recordedCommissionStatus: string | null;
  recordedDealValue: number | null;
};

type UnitOption = { id: number; label: string };

function unitOptionLabel(row: { id?: number; title?: string | null; rooms?: string | null }): string {
  const id = Number(row.id);
  if (row.title?.trim()) return row.title.trim();
  if (row.rooms?.trim()) return `${row.rooms.trim()} bed · #${id}`;
  return `Unit #${id}`;
}

function statusBadgeClass(status: string): string {
  if (status === "closed_won") return "bg-emerald-50 text-emerald-800";
  if (status === "closed_lost") return "bg-zinc-100 text-zinc-600";
  if (status === "negotiation") return "bg-violet-50 text-violet-800";
  if (status === "qualified") return "bg-blue-50 text-blue-800";
  if (status === "contacted") return "bg-amber-50 text-amber-800";
  return "bg-sky-50 text-sky-800";
}

export function BrokerLeadsClient() {
  const [items, setItems] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Array<{ projectId: number; projectName: string }>>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState<LeadStatus>("new");
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: "",
    phone: "",
    email: "",
    projectId: "",
    unitId: "",
    source: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [leadsRes, projRes] = await Promise.all([
      fetch("/api/v1/broker/ops?resource=leads", { credentials: "same-origin" }),
      fetch("/api/v1/broker/ops?resource=assigned-projects", { credentials: "same-origin" }),
    ]);
    const leads = await leadsRes.json();
    const proj = await projRes.json();
    setItems(leads.items ?? []);
    setProjects(
      (proj.items ?? []).map((p: { projectId: number; projectName: string }) => ({
        projectId: p.projectId,
        projectName: p.projectName,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.projectId) {
      setUnits([]);
      return;
    }
    let cancelled = false;
    setUnitsLoading(true);
    fetch(`/api/v1/units?project_id=${form.projectId}`)
      .then((r) => r.json())
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setUnits(
          list.map((u: { id?: number; title?: string | null; rooms?: string | null }) => ({
            id: Number(u.id),
            label: unitOptionLabel(u),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.projectId]);

  function openLead(lead: Lead) {
    setSelected(lead);
    setEditStatus((LEAD_STATUSES.includes(lead.status as LeadStatus) ? lead.status : "new") as LeadStatus);
    setActionMsg(null);
  }

  async function postLead(body: Record<string, unknown>) {
    const res = await apiFetch("/api/v1/broker/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lead", ...body }),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || json.success === false) {
      throw new Error(json.message ?? "Request failed");
    }
    return json;
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionMsg(null);
    try {
      await postLead({
        ...form,
        projectId: form.projectId ? Number(form.projectId) : null,
        unitId: form.unitId ? Number(form.unitId) : null,
      });
      setShowForm(false);
      setForm({
        clientName: "",
        phone: "",
        email: "",
        projectId: "",
        unitId: "",
        source: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Could not save lead");
    } finally {
      setSaving(false);
    }
  }

  async function logContact(lead: Lead) {
    setSaving(true);
    setActionMsg(null);
    try {
      await postLead({ id: lead.id, logContact: true });
      setActionMsg("Contact logged — status updated to Contacted if it was New.");
      await load();
      if (selected?.id === lead.id) {
        setEditStatus("contacted");
      }
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Could not log contact");
    } finally {
      setSaving(false);
    }
  }

  async function saveLeadStatus() {
    if (!selected) return;
    setSaving(true);
    setActionMsg(null);
    try {
      await postLead({
        id: selected.id,
        clientName: selected.clientName,
        phone: selected.phone,
        email: selected.email,
        projectId: selected.projectId,
        unitId: selected.unitId,
        source: selected.source,
        status: editStatus,
        notes: selected.notes,
      });
      setActionMsg("Status saved.");
      await load();
      setSelected((prev) => (prev ? { ...prev, status: editStatus } : null));
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title="My leads"
        description="Track clients, units, follow-ups, and commission"
        icon={brokerPageIcon(Users)}
      >
        {actionMsg && !selected ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {actionMsg}
          </p>
        ) : null}

        <div className="mb-4 flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add lead
          </Button>
        </div>

        {showForm ? (
          <form onSubmit={submitLead} className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <Input
              required
              placeholder="Client name"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
            <Input
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value, unitId: "" })}
            >
              <option value="">Interested project (optional)</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
              value={form.unitId}
              disabled={!form.projectId || unitsLoading}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            >
              <option value="">
                {!form.projectId
                  ? "Select project first"
                  : unitsLoading
                    ? "Loading units…"
                    : "Unit (optional)"}
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
            <textarea
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <LoadingState size="sm" />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            No leads yet. Add one manually or share your referral link.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last contact</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.clientName}</p>
                      <a
                        href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-700"
                      >
                        <MessageCircle className="h-3 w-3" /> {l.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">{l.projectName ?? "—"}</td>
                    <td className="px-4 py-3">{l.unitLabel ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(l.status)}`}
                      >
                        {LEAD_STATUS_LABELS[l.status as LeadStatus] ?? l.status}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 ${l.daysSinceContact != null && l.daysSinceContact > 3 ? "font-medium text-red-600" : "text-zinc-500"}`}
                    >
                      {l.daysSinceContact != null ? `${l.daysSinceContact}d ago` : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openLead(l)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => logContact(l)}
                        >
                          Log contact
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-zinc-900">{selected.clientName}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {selected.projectName ?? "No project"} · {selected.unitLabel ?? "No unit"}
              </p>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Phone</dt>
                  <dd className="text-right font-medium">{selected.phone}</dd>
                </div>
                {selected.email ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Email</dt>
                    <dd className="text-right">{selected.email}</dd>
                  </div>
                ) : null}
                {selected.source ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Source</dt>
                    <dd className="text-right">{selected.source}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Created</dt>
                  <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Last contact</dt>
                  <dd>
                    {selected.lastContactedAt
                      ? new Date(selected.lastContactedAt).toLocaleString()
                      : "Never"}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Commission
                </p>
                {selected.commissionRateLabel ? (
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-500">Your rate</dt>
                      <dd className="font-medium">{selected.commissionRateLabel}</dd>
                    </div>
                    {selected.unitPrice != null ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Unit price</dt>
                        <dd>{formatPrice(selected.unitPrice, "PKR")}</dd>
                      </div>
                    ) : null}
                    {selected.estimatedCommission != null ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Est. commission</dt>
                        <dd className="font-semibold text-emerald-700">
                          {formatPrice(selected.estimatedCommission, "PKR")}
                        </dd>
                      </div>
                    ) : null}
                    {selected.recordedCommissionAmount != null ? (
                      <>
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-500">Recorded deal</dt>
                          <dd>
                            {selected.recordedDealValue != null
                              ? formatPrice(selected.recordedDealValue, "PKR")
                              : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-500">Recorded commission</dt>
                          <dd className="font-semibold">
                            {formatPrice(selected.recordedCommissionAmount, "PKR")}
                            {selected.recordedCommissionStatus
                              ? ` (${COMMISSION_STATUS_LABELS[selected.recordedCommissionStatus as keyof typeof COMMISSION_STATUS_LABELS] ?? selected.recordedCommissionStatus})`
                              : ""}
                          </dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    No commission rate for this project yet. Ask admin to assign you to this project.
                  </p>
                )}
              </div>

              {selected.notes ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{selected.notes}</p>
                </div>
              ) : null}

              <div className="mt-5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Lead status
                </label>
                <select
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {actionMsg ? (
                <p className="mt-3 text-sm text-emerald-700">{actionMsg}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <Button disabled={saving} onClick={saveLeadStatus}>
                  {saving ? "Saving…" : "Save status"}
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => logContact(selected)}
                >
                  Log contact
                </Button>
                <Button variant="outline" className="ml-auto" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
