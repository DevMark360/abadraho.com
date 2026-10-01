"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  BadgeCheck,
  Bell,
  Building2,
  Calendar,
  Check,
  Eye,
  Gauge,
  Image as ImageIcon,
  MapPin,
  Wallet,
  X,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminMultiSelect, type AdminSelectOption } from "@/components/admin/admin-multi-select";
import {
  AdminDbAlert,
  AdminPageToolbar,
  AdminPagination,
  adminCard,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { cn } from "@/lib/utils";
import type { AdminAdCampaignDetail } from "@/server/services/admin-advertising.service";

const PER_PAGE = 25;

type Row = {
  id: number;
  builderId: number;
  builderName: string;
  projectId: number;
  projectName: string;
  placementType: string;
  title: string;
  status: string;
  rejectionReason: string | null;
  maxBidCpm: number;
  budgetCap: number;
  startDate: string;
  endDate: string;
  undeliveredValue: number;
  refundedAt: string | null;
  refundAmount: number | null;
  isArchive: boolean;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  live: "bg-emerald-50 text-emerald-700",
  paused: "bg-zinc-100 text-zinc-700",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-zinc-100 text-zinc-700",
};

const PLACEMENT_LABELS: Record<string, string> = {
  featured_listing: "Featured listing",
  banner: "Banner",
  sponsored_content: "Sponsored content",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">{label}</span>
  );
}

function SectionLabel({ icon, children }: { icon: ComponentType<{ className?: string }>; children: string }) {
  const Icon = icon;
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
      <Icon className="h-3 w-3" /> {children}
    </p>
  );
}

export function AdminAdCampaignsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [viewDetail, setViewDetail] = useState<AdminAdCampaignDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySending, setNotifySending] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [notifyOptions, setNotifyOptions] = useState<AdminSelectOption[]>([]);
  const [notifySelected, setNotifySelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    if (status) params.set("status", status);
    if (showArchived) params.set("archived", "true");
    const res = await fetch(`/api/admin/ad-campaigns?${params}`);
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
  }, [page, status, showArchived]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: number, action: "approve" | "reject") {
    let rejectionReason: string | undefined;
    if (action === "reject") {
      rejectionReason = window.prompt("Reason for rejecting this campaign?") ?? undefined;
      if (!rejectionReason?.trim()) return;
    }
    const res = await fetch(`/api/admin/ad-campaigns/${id}/approval`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Update failed");
    else load();
  }

  async function refund(id: number, amount: number) {
    if (
      !confirm(
        `Issue a refund of Rs. ${amount.toLocaleString()} for undelivered impressions? This credits the builder's wallet immediately — it cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/ad-campaigns/${id}/refund`, { method: "POST" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Refund failed");
    else load();
  }

  async function toggleArchive(id: number, archived: boolean) {
    if (
      archived &&
      !confirm(
        "Archive this campaign? It will stop competing in auctions and serving immediately. You can unarchive it later."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/ad-campaigns/${id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Update failed");
    else load();
  }

  async function openView(id: number) {
    setViewId(id);
    setViewDetail(null);
    setViewError(null);
    setViewLoading(true);
    const res = await fetch(`/api/admin/ad-campaigns/${id}`);
    const json = await res.json();
    if (!json.success) setViewError(json.message ?? "Failed to load campaign");
    else setViewDetail(json.campaign);
    setViewLoading(false);
  }

  function closeView() {
    setViewId(null);
    setViewDetail(null);
    setViewError(null);
    setNotifyOpen(false);
    setNotifyError(null);
    setNotifyMsg(null);
    setNotifySelected([]);
  }

  async function archiveFromModal() {
    if (!viewDetail) return;
    await toggleArchive(viewDetail.id, !viewDetail.isArchive);
    closeView();
  }

  async function openNotifyModal() {
    setNotifyOpen(true);
    setNotifyError(null);
    setNotifyMsg(null);
    if (notifyOptions.length > 0) return;
    setNotifyLoading(true);
    try {
      const res = await fetch(`/api/admin/ad-campaigns/${viewId}/notify`);
      const json = await res.json();
      if (!json.success) {
        setNotifyError(json.message ?? "Failed to load users");
        return;
      }
      setNotifyOptions(
        (json.items ?? []).map((u: { id: number; name: string; email: string | null }) => ({
          value: String(u.id),
          label: u.email ? `${u.name} (${u.email})` : u.name,
        }))
      );
    } catch {
      setNotifyError("Failed to load users");
    } finally {
      setNotifyLoading(false);
    }
  }

  async function sendNotifications() {
    if (!viewId || notifySelected.length === 0) return;
    setNotifySending(true);
    setNotifyError(null);
    try {
      const res = await fetch(`/api/admin/ad-campaigns/${viewId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: notifySelected.map(Number) }),
      });
      const json = await res.json();
      if (!json.success) {
        setNotifyError(json.message ?? "Failed to send notifications");
        return;
      }
      setNotifyMsg(`Notified ${json.count} user${json.count === 1 ? "" : "s"}`);
      setNotifyOpen(false);
      setNotifySelected([]);
    } catch {
      setNotifyError("Failed to send notifications");
    } finally {
      setNotifySending(false);
    }
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
            { value: "submitted", label: "Submitted (pending review)" },
            { value: "approved", label: "Approved" },
            { value: "live", label: "Live" },
            { value: "rejected", label: "Rejected" },
            { value: "completed", label: "Completed" },
            { value: "draft", label: "Draft" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => {
              setShowArchived(e.target.checked);
              setPage(1);
            }}
          />
          Show archived
        </label>
      </AdminPageToolbar>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-center text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>ID</th>
              <th className={adminTableHead}>Builder</th>
              <th className={adminTableHead}>Project</th>
              <th className={adminTableHead}>Placement</th>
              <th className={adminTableHead}>Title</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Max bid CPM</th>
              <th className={adminTableHead}>Budget</th>
              <th className={adminTableHead}>Schedule</th>
              <th className={adminTableHead}>Refund</th>
              <th className={adminTableHead}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8">
                  <LoadingState size="sm" inline className="w-full" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-zinc-500">
                  No campaigns
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.builderName}</td>
                  <td className="px-3 py-2">{r.projectName}</td>
                  <td className="px-3 py-2">{PLACEMENT_LABELS[r.placementType] ?? r.placementType}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-left" title={r.title}>
                    {r.title}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_BADGE[r.status] ?? STATUS_BADGE.draft
                      )}
                      title={r.status === "rejected" ? (r.rejectionReason ?? "") : undefined}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">Rs. {r.maxBidCpm.toLocaleString()}</td>
                  <td className="px-3 py-2">Rs. {r.budgetCap.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {fmtDate(r.startDate)} – {fmtDate(r.endDate)}
                  </td>
                  <td className="px-3 py-2">
                    {r.status !== "completed" ? (
                      <span className="text-zinc-300">—</span>
                    ) : r.refundedAt ? (
                      <span
                        className="text-xs font-medium text-zinc-500"
                        title={`Refunded ${fmtDate(r.refundedAt)}`}
                      >
                        Refunded Rs. {(r.refundAmount ?? 0).toLocaleString()}
                      </span>
                    ) : r.undeliveredValue > 0 ? (
                      <AdminCan module="ad_campaigns" action="refund">
                        <button
                          type="button"
                          onClick={() => refund(r.id, r.undeliveredValue)}
                          className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Refund Rs. {r.undeliveredValue.toLocaleString()}
                        </button>
                      </AdminCan>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {r.status === "submitted" && (
                        <>
                          <AdminCan module="ad_campaigns" action="approve">
                            <button
                              type="button"
                              onClick={() => decide(r.id, "approve")}
                              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </AdminCan>
                          <AdminCan module="ad_campaigns" action="reject">
                            <button
                              type="button"
                              onClick={() => decide(r.id, "reject")}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </AdminCan>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openView(r.id)}
                        className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                        title="View campaign details"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <AdminCan module="ad_campaigns" action="archive">
                        <button
                          type="button"
                          onClick={() => toggleArchive(r.id, !r.isArchive)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            r.isArchive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          )}
                        >
                          {r.isArchive ? "Unarchive" : "Archive"}
                        </button>
                      </AdminCan>
                    </div>
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

      {viewId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeView}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="min-w-0">
                {viewLoading || !viewDetail ? (
                  <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-zinc-900">{viewDetail.title}</h3>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          STATUS_BADGE[viewDetail.status] ?? STATUS_BADGE.draft
                        )}
                      >
                        {viewDetail.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">Campaign #{viewDetail.id}</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={closeView}
                className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {viewLoading ? (
                <LoadingState size="sm" inline className="w-full" />
              ) : viewError ? (
                <p className="text-sm text-red-600">{viewError}</p>
              ) : viewDetail ? (
                <div className="divide-y divide-zinc-100">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3 text-sm text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-zinc-400" /> {viewDetail.builderName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" /> {viewDetail.projectName}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {PLACEMENT_LABELS[viewDetail.placementType] ?? viewDetail.placementType}
                    </span>
                  </div>

                  <div className="py-3">
                    {viewDetail.creativeUrl ? (
                      <>
                        <SectionLabel icon={ImageIcon}>Creative</SectionLabel>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewDetail.creativeUrl}
                          alt={viewDetail.title}
                          className="mt-1.5 max-h-40 w-full rounded-lg border border-zinc-100 object-cover"
                        />
                      </>
                    ) : (
                      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <ImageIcon className="h-3.5 w-3.5" /> No creative uploaded
                      </p>
                    )}
                  </div>

                  <div className="py-3">
                    <SectionLabel icon={Wallet}>Bidding & budget</SectionLabel>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      <StatBox label="Max bid CPM" value={`Rs. ${viewDetail.maxBidCpm.toLocaleString()}`} />
                      <StatBox label="Budget cap" value={`Rs. ${viewDetail.budgetCap.toLocaleString()}`} />
                      <StatBox
                        label="Daily budget"
                        value={viewDetail.dailyBudget != null ? `Rs. ${viewDetail.dailyBudget.toLocaleString()}` : "Auto"}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-zinc-400">
                      Quality score <span className="font-medium text-zinc-600">{viewDetail.qualityScore.toFixed(3)}</span>
                    </p>
                  </div>

                  <div className="py-3">
                    <SectionLabel icon={Calendar}>Schedule</SectionLabel>
                    <p className="mt-1.5 text-sm text-zinc-700">
                      {fmtDate(viewDetail.startDate)} – {fmtDate(viewDetail.endDate)}{" "}
                      <span className="text-zinc-400">· created {fmtDate(viewDetail.createdAt)}</span>
                    </p>
                  </div>

                  <div className="py-3">
                    <SectionLabel icon={MapPin}>Targeting</SectionLabel>
                    {viewDetail.targeting.showOnHomepage ? (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Shown on home page (no targeting set)
                      </p>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {viewDetail.targeting.areas.map((a) => (
                          <Chip key={`area-${a}`} label={a} />
                        ))}
                        {viewDetail.targeting.projectTypes.map((t) => (
                          <Chip key={`type-${t}`} label={t} />
                        ))}
                        {viewDetail.targeting.tiers.map((t) => (
                          <Chip key={`tier-${t}`} label={t} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="py-3">
                    <SectionLabel icon={Gauge}>Performance to date</SectionLabel>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <StatBox label="Impressions" value={viewDetail.stats.impressions.toLocaleString()} />
                      <StatBox label="Clicks" value={viewDetail.stats.clicks.toLocaleString()} />
                      <StatBox label="Spend" value={`Rs. ${viewDetail.stats.spend.toLocaleString()}`} />
                      <StatBox label="Inquiries" value={viewDetail.stats.inquiries.toLocaleString()} />
                    </div>
                  </div>

                  {viewDetail.status === "rejected" && viewDetail.rejectionReason && (
                    <div className="py-3">
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <p className="font-medium">Rejection reason</p>
                        <p className="mt-0.5">{viewDetail.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                  {viewDetail.status === "paused" && viewDetail.pausedReason && (
                    <div className="py-3">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        Paused ({viewDetail.pausedReason.replace(/_/g, " ")}) since{" "}
                        {viewDetail.pausedDate ? fmtDate(viewDetail.pausedDate) : "—"} — resumes automatically the
                        next day.
                      </div>
                    </div>
                  )}
                  {viewDetail.refundedAt && (
                    <div className="py-3">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                        Refunded Rs. {(viewDetail.refundAmount ?? 0).toLocaleString()} on{" "}
                        {fmtDate(viewDetail.refundedAt)}.
                      </div>
                    </div>
                  )}
                  {!viewDetail.refundedAt && viewDetail.undeliveredValue > 0 && (
                    <div className="py-3">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                        Rs. {viewDetail.undeliveredValue.toLocaleString()} of undelivered value is eligible for
                        refund from the campaigns list.
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openNotifyModal}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <Bell className="h-3.5 w-3.5" /> Notify users
                </button>
                {notifyMsg && <span className="text-xs text-emerald-700">{notifyMsg}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeView}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
                >
                  Close
                </button>
                {viewDetail && (
                  <AdminCan module="ad_campaigns" action="archive">
                    <button
                      type="button"
                      onClick={archiveFromModal}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm font-medium",
                        viewDetail.isArchive
                          ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                      )}
                    >
                      {viewDetail.isArchive ? "Unarchive" : "Archive"}
                    </button>
                  </AdminCan>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {notifyOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Notify users</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Select the users who should get a notification about this campaign.
            </p>

            <div className="mt-4">
              {notifyLoading ? (
                <LoadingState size="sm" />
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">Users</span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        className="text-zinc-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
                        disabled={notifyOptions.length === 0}
                        onClick={() => setNotifySelected(notifyOptions.map((o) => o.value))}
                      >
                        Select all
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        type="button"
                        className="text-zinc-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
                        disabled={notifySelected.length === 0}
                        onClick={() => setNotifySelected([])}
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>
                  <AdminMultiSelect
                    options={notifyOptions}
                    value={notifySelected}
                    onChange={setNotifySelected}
                    placeholder="Select users…"
                  />
                </>
              )}
            </div>

            {notifyError && <p className="mt-3 text-sm text-red-600">{notifyError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                onClick={() => {
                  setNotifyOpen(false);
                  setNotifyError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={notifySending || notifySelected.length === 0}
                onClick={sendNotifications}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {notifySending
                  ? "Sending…"
                  : `Send${notifySelected.length ? ` (${notifySelected.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
