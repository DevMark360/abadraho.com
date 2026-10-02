"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { AdminSelect } from "@/components/admin/admin-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminStarRating } from "@/components/admin/admin-star-rating";
import { AdminBackLink, AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { fmtDate } from "@/components/admin/admin-search-history-format";
import {
  REVIEW_STATUSES,
  reviewStatusLabel,
  type ReviewStatus,
} from "@/lib/review-status";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-t border-zinc-100">
      <th className="w-1/3 bg-zinc-50 px-3 py-3 text-left align-top text-sm font-medium text-zinc-700 sm:px-4">
        {label}
      </th>
      <td className="px-3 py-3 text-sm [overflow-wrap:anywhere] sm:px-4">{value}</td>
    </tr>
  );
}

type ReviewDetail = {
  id: number;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string | null;
  updatedAt: string | null;
  projectId: number;
  projectName: string;
  projectSlug: string | null;
  userId: number;
  userName: string | null;
  email: string;
  phoneNumber: string | null;
};

export function AdminReviewDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/reviews/${id}`);
    const j = await res.json();
    if (!j.success || !j.review) {
      setError(j.message ?? "Not found");
      setData(null);
    } else {
      setData(j.review);
      setRating(j.review.rating);
      setComment(j.review.comment);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const j = await res.json();
    setSaving(false);
    if (!j.success) {
      setMsg(j.message ?? "Update failed");
      return;
    }
    setData(j.review);
    setMsg("Review updated");
  }

  async function setStatus(nextStatus: ReviewStatus) {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const j = await res.json();
    setSaving(false);
    if (!j.success) {
      setMsg(j.message ?? "Update failed");
      return;
    }
    setData(j.review);
    setMsg(`Review ${reviewStatusLabel(nextStatus).toLowerCase()}`);
  }

  async function remove() {
    if (!confirm("Remove this review? It will no longer appear on the project.")) return;
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!j.success) {
      alert(j.message ?? "Delete failed");
      return;
    }
    router.push("/admin/reviews");
  }

  if (loading) return <LoadingState size="sm" />;
  if (!data) return <AdminDbAlert message={error ?? "Review not found"} />;

  return (
    <div className="space-y-4">
      <AdminBackLink href="/admin/reviews">User reviews</AdminBackLink>

      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-zinc-900">Review details</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Moderate user-submitted ratings and publish or hide reviews.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody>
              <Row label="Date / time" value={fmtDate(data.createdAt)} />
              <Row label="Name" value={data.userName ?? "—"} />
              <Row label="Email" value={data.email} />
              <Row label="Phone" value={data.phoneNumber ?? "—"} />
              <Row
                label="Project"
                value={
                  <Link
                    href={`/admin/projects/${data.projectId}`}
                    className="text-blue-600 hover:underline"
                  >
                    {data.projectName}
                  </Link>
                }
              />
              <Row
                label="Status"
                value={
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      data.status === "approved" && "bg-emerald-50 text-emerald-700",
                      data.status === "pending" && "bg-amber-50 text-amber-700",
                      data.status === "rejected" && "bg-red-50 text-red-700"
                    )}
                  >
                    {reviewStatusLabel(data.status ?? "pending")}
                  </span>
                }
              />
              <Row label="Rating" value={<AdminStarRating rating={data.rating} />} />
              <Row
                label="Review"
                value={<span className="whitespace-pre-wrap">{data.comment}</span>}
              />
            </tbody>
          </table>
        </div>
      </div>

      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Moderation</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Only approved reviews appear on project and builder pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {REVIEW_STATUSES.map((value) => (
            <Button
              key={value}
              type="button"
              variant={data.status === value ? "default" : "outline"}
              disabled={saving || data.status === value}
              onClick={() => setStatus(value)}
            >
              {reviewStatusLabel(value)}
            </Button>
          ))}
        </div>
      </div>

      <div className={adminCard}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Edit review</h3>
        </div>
        <div className="space-y-4 p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Rating (1–5)</span>
            <AdminSelect
              layout="field"
              value={String(rating)}
              onChange={(val) => setRating(Number(val))}
              options={[5, 4, 3, 2, 1].map((n) => ({
                value: String(n),
                label: `${n} stars`,
              }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Comment</span>
            <Textarea layout="field"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={255}
              rows={4}
            />
          </label>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={remove}>
              Delete review
            </Button>
            {data.projectSlug && (
              <Button asChild variant="outline">
                <a href={`/${data.projectSlug}`} target="_blank" rel="noreferrer">
                  View project
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
