"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Trash2, Check, X } from "lucide-react";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminStarRating } from "@/components/admin/admin-star-rating";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate } from "@/components/admin/admin-search-history-format";
import { AdminSelect } from "@/components/admin/admin-select";
import { REVIEW_STATUSES, reviewStatusLabel, type ReviewStatus } from "@/lib/review-status";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

type Row = {
  rowNum: number;
  id: number;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string | null;
  projectName: string | null;
  userName: string | null;
  email: string | null;
  phoneNumber: string | null;
};

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        status === "approved" && "bg-emerald-50 text-emerald-700",
        status === "pending" && "bg-amber-50 text-amber-700",
        status === "rejected" && "bg-red-50 text-red-700"
      )}
    >
      {reviewStatusLabel(status)}
    </span>
  );
}

export function AdminReviewsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<URLSearchParams>(new URLSearchParams());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(applied);
    params.set("page", String(page));
    params.set("perPage", String(PER_PAGE));
    const res = await fetch(`/api/admin/reviews?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? json.message ?? "Failed to load");
      setItems([]);
      setTotal(0);
    } else {
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      if (json.projects) setProjects(json.projects);
    }
    setLoading(false);
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters() {
    const p = new URLSearchParams();
    if (name) p.set("name", name);
    if (email) p.set("email", email);
    if (phoneNumber) p.set("phoneNumber", phoneNumber);
    if (projectIds.length) p.set("projectIds", projectIds.join(","));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (status) p.set("status", status);
    setApplied(p);
    setPage(1);
  }

  async function onDelete(id: number) {
    if (!confirm("Remove this review from the project?")) return;
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  async function setReviewStatus(id: number, nextStatus: ReviewStatus) {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Update failed");
    else load();
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total}>
        <span className="text-sm text-zinc-500">User reviews management</span>
      </AdminPageToolbar>

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Filter reviews</h3>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Name</span>
              <Input layout="field" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Email</span>
              <Input layout="field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Phone</span>
              <Input layout="field"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </label>
            <AdminMultiSelect
              label="Project"
              options={projects}
              value={projectIds}
              onChange={setProjectIds}
              placeholder="All projects"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">From</span>
              <Input layout="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">To</span>
              <Input layout="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Status</span>
              <AdminSelect
                layout="field"
                value={status}
                onChange={setStatus}
                placeholder="All statuses"
                options={[
                  { value: "", label: "All statuses" },
                  ...REVIEW_STATUSES.map((value) => ({
                    value,
                    label: reviewStatusLabel(value),
                  })),
                ]}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={applyFilters}>
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setName("");
                setEmail("");
                setPhoneNumber("");
                setProjectIds([]);
                setFrom("");
                setTo("");
                setStatus("");
                setApplied(new URLSearchParams());
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-center text-sm">
          <thead>
            <tr>
              <th className={adminTableHead}>#</th>
              <th className={adminTableHead}>Date/Time</th>
              <th className={adminTableHead}>Name</th>
              <th className={adminTableHead}>Email</th>
              <th className={adminTableHead}>Phone</th>
              <th className={adminTableHead}>Project name</th>
              <th className={adminTableHead}>Ratings</th>
              <th className={adminTableHead}>Status</th>
              <th className={adminTableHead}>Reviews</th>
              <th className={adminTableHead}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                  No reviews
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.rowNum}</td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.userName ?? "—"}</td>
                  <td className="px-3 py-2">{r.email ?? "—"}</td>
                  <td className="px-3 py-2">{r.phoneNumber ?? "—"}</td>
                  <td className="px-3 py-2">{r.projectName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <AdminStarRating rating={r.rating} className="justify-center" />
                  </td>
                  <td className="px-3 py-2">
                    <ReviewStatusBadge status={r.status ?? "pending"} />
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-left" title={r.comment}>
                    {r.comment}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {r.status === "pending" ? (
                        <>
                          <AdminCan module="reviews" action="approve">
                            <button
                              type="button"
                              onClick={() => setReviewStatus(r.id, "approved")}
                              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </AdminCan>
                          <AdminCan module="reviews" action="reject">
                            <button
                              type="button"
                              onClick={() => setReviewStatus(r.id, "rejected")}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </AdminCan>
                        </>
                      ) : null}
                      <Link
                        href={`/admin/reviews/${r.id}`}
                        className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <AdminCan module="reviews" action="delete">
                        <button
                          type="button"
                          onClick={() => onDelete(r.id)}
                          className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
